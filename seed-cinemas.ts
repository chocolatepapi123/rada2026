/**
 * RADA cinema seeder.
 *
 *   npx tsx scripts/seed-cinemas.ts                 # scrape everything + write to Supabase
 *   npx tsx scripts/seed-cinemas.ts --dry           # scrape + print, write nothing (run this first)
 *   npx tsx scripts/seed-cinemas.ts --only=anga,unseen
 *   npx tsx scripts/seed-cinemas.ts --debug         # extra logging (KenyaBuzz XHR URLs, etc.)
 *
 * Env (in .env.local or the shell). NEVER prefix the service key with VITE_:
 *   SUPABASE_URL                 (falls back to VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Sources
 *   anga       cinema.angacinemas.com    films, posters, synopsis, trailer + every showtime with a direct reservation link & price
 *   century    centurycinemax.co.ke      films, posters, synopsis, per-cinema direct booking pages, upcoming releases
 *   unseen     unseen-nairobi.com        independent films, posters, synopsis, trailer, Mookh ticket links
 *   kenyabuzz  kenyabuzz.com/movies      needs Playwright (the site is a JS app). Optional, best-effort.
 */
import * as cheerio from 'cheerio';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { VENUE_LABELS, titleKey, detectFormat } from '../src/lib/cinemaProviders.ts';

try { (process as any).loadEnvFile?.('.env.local'); } catch { /* no file, fine */ }

// ───────────────────────── types ─────────────────────────
interface SeedMovie {
  id: string; provider: string; title: string; title_key: string;
  poster_url: string | null; backdrop_url: string | null; synopsis: string | null;
  genre: string | null; rating: string | null; runtime_min: number | null;
  format: string; language: string | null; release_date: string | null;
  trailer_url: string | null; movie_url: string; booking_url: string;
  status: 'now_showing' | 'coming_soon' | 'special';
  venues: { venue: string; venueKey: string; bookingUrl: string }[];
}
interface SeedShowtime {
  id: string; movie_id: string; provider: string; venue: string; venue_key: string;
  show_date: string; show_time: string | null; starts_at: string | null;
  screen: string | null; format: string | null; price_kes: number | null; booking_url: string;
}
interface Result { movies: SeedMovie[]; showtimes: SeedShowtime[] }

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const DEBUG = args.includes('--debug');
const ONLY = (args.find(a => a.startsWith('--only='))?.split('=')[1] || '').split(',').filter(Boolean);

// ───────────────────────── helpers ─────────────────────────
const UA = 'Mozilla/5.0 (compatible; RADA-cinema-seeder/1.0; +https://rada.app)';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const clean = (s?: string | null) => (s || '').replace(/\uFFFD/g, '’').replace(/\s+/g, ' ').trim();
const log = (...a: any[]) => console.log(...a);
const sha = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 14);

async function get(url: string, tries = 3): Promise<string> {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en' }, redirect: 'follow' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (i >= tries) throw new Error(`GET ${url} failed: ${(e as Error).message}`);
      await sleep(800 * i);
    }
  }
}
const abs = (base: string, href?: string | null) => {
  if (!href) return null;
  try { return new URL(href, base).toString(); } catch { return null; }
};

const NAIROBI_OFFSET_MS = 3 * 3600 * 1000; // EAT is UTC+3, no DST
const todayISO = () => new Date(Date.now() + NAIROBI_OFFSET_MS).toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const monthIdx = (m: string) => MONTHS.indexOf(m.slice(0, 3).toLowerCase());

/** day + month name (no year on the page) → ISO date, choosing the year that puts it near today. */
function inferDate(day: number, mon: string): string | null {
  const m = monthIdx(mon);
  if (m < 0) return null;
  const today = todayISO();
  let y = Number(today.slice(0, 4));
  const mk = (yy: number) => `${yy}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (mk(y) < addDays(today, -180)) y += 1;
  return mk(y);
}

/** "09:00 PM" → "21:00" */
function to24(t: string): string | null {
  const m = t.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

function parseRuntime(s: string): number | null {
  let m = s.match(/(\d+)\s*h(?:rs?|ours?)?\s*(\d+)?\s*m?/i);
  if (m) return Number(m[1]) * 60 + Number(m[2] || 0);
  m = s.match(/(\d+)\s*(?:mins?|m)\b/i);
  return m ? Number(m[1]) : null;
}

const ownText = ($: cheerio.CheerioAPI, el: any) =>
  clean($(el).contents().filter((_, n: any) => n.type === 'text').text());

const toTitleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s(&-])([a-z])/g, (_, a, b) => a + b.toUpperCase());

function ytWatch(src?: string | null): string | null {
  if (!src) return null;
  const m = src.match(/(?:embed\/|v=|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/watch?v=${m[1]}` : src;
}

// ═════════════════════════ ANGA ═════════════════════════
const ANGA = 'https://cinema.angacinemas.com';
const ANGA_VENUES: Record<string, string> = { diamond: 'anga_diamond', panari: 'anga_panari', sky: 'anga_panari', cbd: 'anga_cbd' };
const GENRES = ['Thriller', 'Action', 'Crime', 'Horror', 'Drama', 'Animated', 'Comedy', 'Adventure', 'Sci-Fi', 'Romance', 'Family', 'Fantasy', 'Documentary', 'Musical', 'Biography', 'Mystery'];

async function scrapeAnga(): Promise<Result> {
  const movies: SeedMovie[] = [];
  const showtimes: SeedShowtime[] = [];
  const $ = cheerio.load(await get(`${ANGA}/index`));

  // 1) every film id on the home page + its carousel image (doc order: image comes before its "Book Now" link)
  const films = new Map<string, { title: string; backdrop: string | null; texts: string[] }>();
  const usedImgs = new Set<string>();
  let lastImg: { alt: string; src: string } | null = null;
  $('body *').each((_, el: any) => {
    const $el = $(el);
    if (el.tagName === 'img') {
      const src = $el.attr('src') || '';
      if (src.includes('uploads.angacinemas.com')) lastImg = { alt: clean($el.attr('alt')), src };
    } else if (el.tagName === 'a') {
      const m = ($el.attr('href') || '').match(/film\?id=(ST\d+)/);
      if (!m) return;
      const f = films.get(m[1]) ?? { title: '', backdrop: null, texts: [] };
      if (!films.has(m[1]) && lastImg && !usedImgs.has(lastImg.src)) {
        f.title = lastImg.alt; f.backdrop = lastImg.src; usedImgs.add(lastImg.src);
      }
      f.texts.push(clean($el.text()));
      films.set(m[1], f);
    }
  });
  log(`  anga: ${films.size} films on home page`);

  // 2) each film page: poster, runtime, synopsis, trailer, every showtime
  const today = todayISO();
  for (const [filmId, f] of films) {
    const url = `${ANGA}/film?id=${filmId}`;
    try {
      const $p = cheerio.load(await get(url));
      const bodyText = clean($p('body').text());

      const poster = $p('img').toArray().map((e: any) => $p(e).attr('src') || '').find(s => s.includes('uploads.angacinemas.com')) || f.backdrop;
      const runtime = parseRuntime((bodyText.match(/\d+\s*hrs?\s*(?:\d+\s*mins?)?/i) || [''])[0]);
      const title = f.title || clean($p('title').text());
      if (!title) continue;

      const posterBlock = clean($p('img').toArray().map((e: any) => $p(e)).find($e => ($e.attr('src') || '').includes('uploads.angacinemas.com'))?.parent().text());
      const format = detectFormat(title, posterBlock);

      const descHead = $p('h4, h5, h3').toArray().find((e: any) => /^description$/i.test(clean($p(e).text())));
      let synopsis = descHead ? clean($p(descHead).nextAll('p, div').first().text()) : '';
      if (!synopsis) synopsis = clean($p('p').toArray().map((e: any) => $p(e).text()).find(t => t.length > 80));

      const trailer = ytWatch($p('iframe[src*="youtube"]').attr('src'));

      // genre / rating from the home-page card text, e.g. "Verity 16Thriller Verity Thriller Book Now"
      const joined = f.texts.join(' | ');
      const genreRaw = GENRES.find(g => joined.includes(g)) || null;
      const genre = genreRaw === 'Animated' ? 'Animation' : genreRaw;
      const stripped = joined.replace(title, '').trim();
      const rating = (stripped.match(/^\s*(PG|G|18|16|15|13|12)(?=[A-Z\s|]|$)/) || [])[1] || null;

      // showtimes: walk the page in order tracking date → venue → reservation link
      let curDate: string | null = null;
      let curVenue: string | null = null;
      const venueSeen = new Map<string, string>();
      const movieId = `anga:${filmId}`;
      $p('body *').each((_, el: any) => {
        const $el = $p(el);
        if (el.tagName === 'a') {
          const href = $el.attr('href') || '';
          if (!/reservation\?id=/.test(href) || !curDate || !curVenue) return;
          const text = clean($el.text());
          const time = to24(text);
          if (!time || curDate < today) return;
          const price = Number((text.match(/Ksh\.?\s*([\d,]+)/i)?.[1] || '').replace(/,/g, '')) || null;
          const key = ANGA_VENUES[curVenue.toLowerCase()] || `anga_${curVenue.toLowerCase()}`;
          const link = abs(ANGA, href)!;
          showtimes.push({
            id: `${movieId}:${sha(link)}`, movie_id: movieId, provider: 'anga',
            venue: VENUE_LABELS[key] || `Anga ${curVenue}`, venue_key: key,
            show_date: curDate, show_time: time, starts_at: `${curDate}T${time}:00+03:00`,
            screen: null, format, price_kes: price, booking_url: link,
          });
          venueSeen.set(key, VENUE_LABELS[key] || `Anga ${curVenue}`);
          return;
        }
        const t = ownText($p, el);
        const d = t.match(/Showing For\s+\w+,?\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/i);
        if (d) { curDate = inferDate(Number(d[1]), d[2]); return; }
        if (/^(Diamond|Panari|Sky|CBD)$/i.test(t)) curVenue = t;
      });

      const mine = showtimes.filter(s => s.movie_id === movieId);
      if (!mine.length && !f.title) continue;
      const firstLink = mine[0]?.booking_url || url;
      movies.push({
        id: movieId, provider: 'anga', title, title_key: titleKey(title),
        poster_url: poster, backdrop_url: f.backdrop, synopsis: synopsis || null,
        genre, rating, runtime_min: runtime, format, language: null, release_date: null,
        trailer_url: trailer, movie_url: url, booking_url: firstLink,
        status: mine.length ? 'now_showing' : 'coming_soon',
        venues: [...venueSeen].map(([venueKey, venue]) => ({ venue, venueKey, bookingUrl: url })),
      });
      await sleep(300);
    } catch (e) {
      log(`  ! anga ${filmId}: ${(e as Error).message}`);
    }
  }

  // 3) coming soon list on the home page: "Call Me Queen 2D Call Me Queen 2D 30th Oct"
  $('a[href*="comingsoon"]').each((_, el) => {
    const t = clean($(el).text());
    const m = t.match(/^(.+?)\s+\1\s+(\d{1,2})(?:st|nd|rd|th)\s+([A-Za-z]{3})$/);
    if (!m) return;
    const rel = inferDate(Number(m[2]), m[3]);
    const id = `anga:soon-${sha(m[1])}`;
    if (movies.some(x => x.id === id)) return;
    movies.push({
      id, provider: 'anga', title: m[1], title_key: titleKey(m[1]),
      poster_url: null, backdrop_url: null, synopsis: null, genre: null, rating: null, runtime_min: null,
      format: detectFormat(m[1]), language: null, release_date: rel, trailer_url: null,
      movie_url: `${ANGA}/comingsoon`, booking_url: `${ANGA}/comingsoon`, status: 'coming_soon', venues: [],
    });
  });
  return { movies, showtimes };
}

// ═════════════════════════ CENTURY CINEMAX ═════════════════════════
const CENTURY = 'https://centurycinemax.co.ke';
const CENTURY_SITES: Record<string, string> = {
  garden: 'century_garden_city', sarit: 'century_sarit', rivers: 'century_two_rivers', junction: 'century_junction',
};

async function scrapeCentury(): Promise<Result> {
  const movies: SeedMovie[] = [];
  const $ = cheerio.load(await get(`${CENTURY}/`));

  // slider images give a wide backdrop keyed by title
  const sliders = new Map<string, string>();
  $('img[src*="/storage/sliders/"]').each((_, e) => {
    const alt = clean($(e).attr('alt'));
    if (alt) sliders.set(titleKey(alt), abs(CENTURY, $(e).attr('src'))!);
  });

  // now showing: slug → { sites it plays at, rating, runtime }
  const bySlug = new Map<string, { sites: Set<string>; rating: string | null; runtime: number | null; imax: boolean }>();
  $('a[href*="/movie/show/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const m = href.match(/\/movie\/show\/([a-z]+)\/([\w-]+)/i);
    if (!m || !CENTURY_SITES[m[1]]) return;
    const text = clean($(el).text());
    const e = bySlug.get(m[2]) ?? { sites: new Set<string>(), rating: null, runtime: null, imax: false };
    e.sites.add(m[1]);
    e.rating ||= (text.match(/\b(PG|12A|15A|16\+|18\+|G|R)\s+(?=\d+h|\d+m)/) || [])[1] || null;
    e.runtime ||= parseRuntime((text.match(/(\d+h(?:\s*\d+m)?|\d+m)\s*$/) || [''])[0]);
    e.imax ||= /^IMAX\b/i.test(text) || /imax/i.test(m[2]);
    bySlug.set(m[2], e);
  });
  log(`  century: ${bySlug.size} now-showing films across ${Object.keys(CENTURY_SITES).length} cinemas`);

  for (const [slug, info] of bySlug) {
    const sites = [...info.sites];
    const first = sites[0];
    const pageUrl = `${CENTURY}/movie/show/${first}/${slug}`;
    try {
      const $p = cheerio.load(await get(pageUrl));
      const title = clean($p('h1').first().text()) || toTitleCase(slug.replace(/_/g, ' '));
      const poster = abs(CENTURY, $p('img[src*="/storage/uploads/"]').first().attr('src'));
      const aboutHead = $p('h2, h3, h4').toArray().find((e: any) => /about movie/i.test($p(e).text()));
      let synopsis = aboutHead ? clean($p(aboutHead).nextAll('p, div').first().text()) : '';
      if (!synopsis) synopsis = clean($p('meta[property="og:description"]').attr('content')).replace(/^Buy tickets for .*? at Century Cinemax [\w ]+?\.\s*/i, '');
      const format = info.imax ? 'IMAX' : detectFormat(title, slug);
      movies.push({
        id: `century:${slug}`, provider: 'century', title, title_key: titleKey(title),
        poster_url: poster, backdrop_url: sliders.get(titleKey(title)) || null, synopsis: synopsis || null,
        genre: null, rating: info.rating, runtime_min: info.runtime, format, language: null, release_date: null,
        trailer_url: null, movie_url: pageUrl, booking_url: pageUrl, status: 'now_showing',
        venues: sites.map(s => ({
          venue: VENUE_LABELS[CENTURY_SITES[s]], venueKey: CENTURY_SITES[s], bookingUrl: `${CENTURY}/movie/show/${s}/${slug}`,
        })),
      });
      await sleep(300);
    } catch (e) {
      log(`  ! century ${slug}: ${(e as Error).message}`);
    }
  }

  // upcoming: "How to Rob a Bank 2D 4 Sep 2026 How to Rob a Bank"
  const upcoming: { id: string; url: string; text: string }[] = [];
  $('a[href*="/upcoming-movie/show/"]').each((_, el) => {
    const href = abs(CENTURY, $(el).attr('href'))!;
    const id = (href.match(/show\/(\d+)/) || [])[1];
    if (id && !upcoming.some(u => u.id === id)) upcoming.push({ id, url: `${CENTURY}/upcoming-movie/show/${id}`, text: clean($(el).text()) });
  });
  for (const u of upcoming) {
    const m = u.text.match(/^(.*?)\s*(IMAX|3D|2D)?\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(.+)$/);
    const title = clean(m?.[6] || u.text);
    try {
      const $p = cheerio.load(await get(u.url));
      const poster = abs(CENTURY, $p('img[src*="/storage/"]').first().attr('src'));
      const aboutHead = $p('h2, h3, h4').toArray().find((e: any) => /about movie/i.test($p(e).text()));
      const synopsis = (aboutHead ? clean($p(aboutHead).nextAll('p, div').first().text()) : '') || clean($p('meta[name="description"]').attr('content'));
      const rel = m ? inferDate(Number(m[3]), m[4]) : null;
      movies.push({
        id: `century:upcoming-${u.id}`, provider: 'century', title, title_key: titleKey(title),
        poster_url: poster, backdrop_url: null, synopsis: synopsis || null, genre: null, rating: null, runtime_min: null,
        format: detectFormat(m?.[2], m?.[1], title), language: null,
        release_date: m ? `${m[5]}-${String(monthIdx(m[4]) + 1).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}` : rel,
        trailer_url: null, movie_url: u.url, booking_url: u.url, status: 'coming_soon', venues: [],
      });
      await sleep(250);
    } catch (e) {
      log(`  ! century upcoming ${u.id}: ${(e as Error).message}`);
    }
  }
  return { movies, showtimes: [] };
}

// ═════════════════════════ UNSEEN NAIROBI ═════════════════════════
const UNSEEN = 'https://www.unseen-nairobi.com';

async function scrapeUnseen(): Promise<Result> {
  const $ = cheerio.load(await get(`${UNSEEN}/`));
  type Item = { title: string; poster: string | null; synopsis: string; meta: string; ticket: string | null; trailer: string | null };
  const items: Item[] = [];
  let cur: Item | null = null;

  $('body *').each((_, el: any) => {
    const $el = $(el);
    if (el.tagName === 'h2') {
      const t = clean($el.text());
      if (t) items.push((cur = { title: t, poster: null, synopsis: '', meta: '', ticket: null, trailer: null }));
      return;
    }
    if (!cur) return;
    if (el.tagName === 'img' && !cur.poster) {
      const src = $el.attr('data-src') || $el.attr('src') || '';
      if (/squarespace-cdn/.test(src) && !/Logo/i.test(src)) cur.poster = src.split('?')[0] + '?format=750w';
    } else if (el.tagName === 'a') {
      const text = clean($el.text());
      const href = abs(UNSEEN, $el.attr('href'));
      if (/watch trailer/i.test(text)) cur.trailer = href;
      else if (/tickets/i.test(text) && href && /mookh/i.test(href)) cur.ticket = href;
    } else {
      const t = ownText($, el);
      if (/^\d{4}\s*\|/.test(t)) cur.meta = t;
      else if (t.length > 100 && !t.startsWith('*') && !cur.synopsis) cur.synopsis = t;
    }
  });

  const movies: SeedMovie[] = [];
  for (const it of items) {
    if (!it.ticket) continue; // header blocks, newsletter, events without a ticket link
    const title = toTitleCase(it.title);
    const metaParts = it.meta.split('|').map(clean);
    const year = metaParts[0]?.match(/\d{4}/)?.[0];
    const runtime = parseRuntime(metaParts.find(p => /min/i.test(p)) || '');
    const language = metaParts.length >= 4 ? metaParts[metaParts.length - 1] : null;
    const special = /mini mornings|quiz|gems/i.test(title);
    movies.push({
      id: `unseen:${sha(it.title)}`, provider: 'unseen', title, title_key: titleKey(title),
      poster_url: it.poster, backdrop_url: null, synopsis: it.synopsis || null, genre: null, rating: null,
      runtime_min: runtime, format: '2D', language, release_date: year ? `${year}-01-01` : null,
      trailer_url: it.trailer, movie_url: UNSEEN, booking_url: it.ticket,
      status: special ? 'special' : 'now_showing',
      venues: [{ venue: VENUE_LABELS.unseen, venueKey: 'unseen', bookingUrl: it.ticket }],
    });
  }
  log(`  unseen: ${movies.length} programme items with ticket links`);
  return { movies, showtimes: [] };
}

// ═════════════════════════ KENYABUZZ (optional: needs Playwright) ═════════════════════════
async function scrapeKenyaBuzz(): Promise<Result> {
  let pw: any;
  try { pw = await import('playwright'); }
  catch {
    log('  ! kenyabuzz: the site is a JavaScript app. Run `npm i -D playwright && npx playwright install chromium` to include it. Skipping.');
    return { movies: [], showtimes: [] };
  }
  const browser = await pw.chromium.launch();
  const movies: SeedMovie[] = [];
  try {
    const page = await browser.newPage({ userAgent: UA });
    if (DEBUG) page.on('response', (r: any) => { if ((r.headers()['content-type'] || '').includes('json')) log('   [xhr]', r.url()); });
    await page.goto('https://kenyabuzz.com/movies', { waitUntil: 'networkidle', timeout: 45000 });
    const cards: { href: string; img: string }[] = await page.$$eval('a[href*="/movies/"]', (as: any[]) =>
      as.map(a => ({ href: a.href as string, img: (a.querySelector('img')?.src as string) || '' })));
    const uniq = new Map<string, string>();
    for (const c of cards) {
      if (/\/movies\/?$/.test(new URL(c.href).pathname)) continue;
      if (!uniq.has(c.href)) uniq.set(c.href, c.img);
    }
    log(`  kenyabuzz: ${uniq.size} film links found`);
    for (const [href, listImg] of uniq) {
      try {
        await page.goto(href, { waitUntil: 'networkidle', timeout: 45000 });
        const d = await page.evaluate(() => {
          const meta = (p: string) => (document.querySelector(`meta[property="${p}"], meta[name="${p}"]`) as HTMLMetaElement | null)?.content || '';
          const book = [...document.querySelectorAll('a')].find(a => /book|buy|ticket/i.test(a.textContent || '') && (a as HTMLAnchorElement).href) as HTMLAnchorElement | undefined;
          return { title: meta('og:title') || document.title, desc: meta('og:description') || meta('description'), img: meta('og:image'), book: book?.href || '' };
        });
        const title = clean(d.title.replace(/\s*[|\-–]\s*KenyaBuzz.*$/i, ''));
        if (!title) continue;
        movies.push({
          id: `kenyabuzz:${sha(href)}`, provider: 'kenyabuzz', title, title_key: titleKey(title),
          poster_url: d.img || listImg || null, backdrop_url: null, synopsis: clean(d.desc) || null, genre: null, rating: null,
          runtime_min: null, format: detectFormat(title), language: null, release_date: null, trailer_url: null,
          movie_url: href, booking_url: d.book || href, status: 'now_showing', venues: [],
        });
      } catch (e) { log(`  ! kenyabuzz ${href}: ${(e as Error).message}`); }
    }
  } finally { await browser.close(); }
  return { movies, showtimes: [] };
}

// ═════════════════════════ persistence ═════════════════════════
async function save(sb: ReturnType<typeof createClient>, provider: string, r: Result) {
  if (!r.movies.length) { log(`  ${provider}: nothing scraped, leaving existing rows untouched`); return; }
  const now = new Date().toISOString();

  const { error: e1 } = await sb.from('cinema_movies').upsert(r.movies.map(m => ({ ...m, scraped_at: now })), { onConflict: 'id' });
  if (e1) throw e1;

  // showtimes are replaced wholesale for this provider so cancelled/changed times disappear
  const { error: e2 } = await sb.from('cinema_showtimes').delete().eq('provider', provider);
  if (e2) throw e2;
  for (let i = 0; i < r.showtimes.length; i += 500) {
    const { error } = await sb.from('cinema_showtimes').insert(r.showtimes.slice(i, i + 500).map(s => ({ ...s, scraped_at: now })));
    if (error) throw error;
  }

  // drop films that are no longer listed
  const { data: existing } = await sb.from('cinema_movies').select('id').eq('provider', provider);
  const keep = new Set(r.movies.map(m => m.id));
  const stale = (existing || []).map((x: any) => x.id).filter((id: string) => !keep.has(id));
  if (stale.length) await sb.from('cinema_movies').delete().in('id', stale);
  log(`  ${provider}: saved ${r.movies.length} films, ${r.showtimes.length} showtimes, removed ${stale.length} stale`);
}

// ═════════════════════════ main ═════════════════════════
const SOURCES: Record<string, () => Promise<Result>> = {
  anga: scrapeAnga, century: scrapeCentury, unseen: scrapeUnseen, kenyabuzz: scrapeKenyaBuzz,
};

async function main() {
  const names = Object.keys(SOURCES).filter(n => !ONLY.length || ONLY.includes(n));
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!DRY && (!url || !key)) {
    console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY. Use --dry to test without writing.');
    process.exit(1);
  }
  const sb = !DRY ? createClient(url!, key!, { auth: { persistSession: false } }) : null;

  for (const name of names) {
    log(`\n▶ ${name}`);
    try {
      const r = await SOURCES[name]();
      if (DRY) {
        for (const m of r.movies.slice(0, 40)) {
          const n = r.showtimes.filter(s => s.movie_id === m.id).length;
          log(`   • ${m.title} [${m.format}${m.rating ? ' ' + m.rating : ''}] ${m.status} | poster:${m.poster_url ? 'y' : 'n'} synopsis:${m.synopsis ? 'y' : 'n'} venues:${m.venues.length} showtimes:${n}`);
        }
        log(`   total ${r.movies.length} films, ${r.showtimes.length} showtimes`);
        if (r.showtimes[0]) log('   sample showtime:', r.showtimes[0]);
      } else {
        await save(sb!, name, r);
      }
    } catch (e) {
      console.error(`  ✖ ${name} failed:`, (e as Error).message);
    }
  }
  log('\nDone.');
}

main();
