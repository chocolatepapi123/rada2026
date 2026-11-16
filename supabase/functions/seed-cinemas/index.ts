// RADA cinema seeder as a Supabase Edge Function.
// The access key now comes from the SEED_CINEMAS_KEY secret (Supabase dashboard -> Edge Functions -> Secrets).
// Until that secret is set, this function is disabled.
// Open:  https://<ref>.supabase.co/functions/v1/seed-cinemas?key=YOUR_KEY            (writes)
//        ...?key=YOUR_KEY&dry=1                                                       (preview only)
//        ...?key=YOUR_KEY&only=anga   (anga | century | unseen)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as cheerio from "npm:cheerio@1.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";

interface Venue { venue: string; venueKey: string; bookingUrl: string }
interface Movie {
  id: string; provider: string; title: string; title_key: string;
  poster_url: string | null; backdrop_url: string | null; synopsis: string | null;
  genre: string | null; rating: string | null; runtime_min: number | null; format: string;
  language: string | null; release_date: string | null; trailer_url: string | null;
  movie_url: string; booking_url: string; status: "now_showing" | "coming_soon" | "special"; venues: Venue[];
}
interface Show {
  id: string; movie_id: string; provider: string; venue: string; venue_key: string; show_date: string;
  show_time: string | null; starts_at: string | null; screen: string | null; format: string | null;
  price_kes: number | null; booking_url: string;
}
interface Result { movies: Movie[]; showtimes: Show[] }

const VENUE_LABELS: Record<string, string> = {
  century_garden_city: "Century Cinemax Garden City", century_sarit: "Century Cinemax Sarit",
  century_junction: "Century Cinemax Junction", century_two_rivers: "Century Cinemax Two Rivers",
  anga_diamond: "Anga Diamond Plaza", anga_panari: "Anga Sky Panari", anga_cbd: "Anga CBD",
  unseen: "Unseen Nairobi (Yaya Centre)",
};

// ───────── helpers ─────────
const UA = "Mozilla/5.0 (compatible; RADA-cinema-seeder/1.0)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clean = (s?: string | null) => (s || "").replace(/\uFFFD/g, "’").replace(/\s+/g, " ").trim();
const sha = (s: string) => { // cyrb53
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};
async function get(url: string, tries = 3): Promise<string> {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, "accept-language": "en" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (i >= tries) throw new Error(`GET ${url}: ${(e as Error).message}`);
      await sleep(600 * i);
    }
  }
}
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const x = items[i++]; await fn(x); }
  }));
}
const abs = (base: string, href?: string | null) => { if (!href) return null; try { return new URL(href, base).toString(); } catch { return null; } };
const todayISO = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const monthIdx = (m: string) => MONTHS.indexOf(m.slice(0, 3).toLowerCase());
function inferDate(day: number, mon: string): string | null {
  const m = monthIdx(mon); if (m < 0) return null;
  const today = todayISO(); let y = Number(today.slice(0, 4));
  const mk = (yy: number) => `${yy}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (mk(y) < addDays(today, -180)) y += 1;
  return mk(y);
}
function to24(t: string): string | null {
  const m = t.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i); if (!m) return null;
  let h = Number(m[1]) % 12; if (m[3].toUpperCase() === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}
function parseRuntime(s: string): number | null {
  let m = s.match(/(\d+)\s*h(?:rs?|ours?)?\s*(\d+)?\s*m?/i);
  if (m) return Number(m[1]) * 60 + Number(m[2] || 0);
  m = s.match(/(\d+)\s*(?:mins?|m)\b/i);
  return m ? Number(m[1]) : null;
}
const tagOf = (el: any) => String(el.tagName || el.name || "").toLowerCase();
const ownText = ($: cheerio.CheerioAPI, el: any) => clean($(el).contents().filter((_: number, n: any) => n.type === "text").text());
const toTitleCase = (s: string) => s.toLowerCase().replace(/(^|[\s(&-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
function ytWatch(src?: string | null) {
  if (!src) return null; const m = src.match(/(?:embed\/|v=|youtu\.be\/)([\w-]{6,})/); return m ? `https://www.youtube.com/watch?v=${m[1]}` : src;
}
const titleKey = (t: string) => t.toLowerCase().replace(/\(.*?\)/g, " ")
  .replace(/\b(imax|3d|2d|4dx|atmos|vip|subbed|dubbed|hindi|encore)\b/gi, " ").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
const detectFormat = (...h: (string | undefined | null)[]) => {
  const s = h.filter(Boolean).join(" ").toLowerCase();
  return /imax/.test(s) ? "IMAX" : /3d/.test(s) ? "3D" : "2D";
};
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ───────── ANGA ─────────
const ANGA = "https://cinema.angacinemas.com";
const ANGA_VENUES: Record<string, string> = { diamond: "anga_diamond", panari: "anga_panari", sky: "anga_panari", cbd: "anga_cbd" };
const GENRES = ["Thriller", "Action", "Crime", "Horror", "Drama", "Animated", "Comedy", "Adventure", "Sci-Fi", "Romance", "Family", "Fantasy", "Documentary", "Musical", "Biography", "Mystery"];

async function scrapeAnga(): Promise<Result> {
  const movies: Movie[] = []; const showtimes: Show[] = [];
  const $ = cheerio.load(await get(`${ANGA}/index`));
  const films = new Map<string, { title: string; backdrop: string | null; texts: string[] }>();
  const usedImgs = new Set<string>();
  let lastImg: { alt: string; src: string } | null = null;
  $("body *").each((_, el: any) => {
    const $el = $(el); const tag = tagOf(el);
    if (tag === "img") {
      const src = $el.attr("src") || "";
      if (src.includes("uploads.angacinemas.com")) lastImg = { alt: clean($el.attr("alt")), src };
    } else if (tag === "a") {
      const m = ($el.attr("href") || "").match(/film\?id=(ST\d+)/); if (!m) return;
      const f = films.get(m[1]) ?? { title: "", backdrop: null, texts: [] };
      const li = lastImg as { alt: string; src: string } | null;
      if (!films.has(m[1]) && li && !usedImgs.has(li.src)) { f.title = li.alt; f.backdrop = li.src; usedImgs.add(li.src); }
      f.texts.push(clean($el.text())); films.set(m[1], f);
    }
  });

  const today = todayISO();
  await pool([...films], 4, async ([filmId, f]) => {
    const url = `${ANGA}/film?id=${filmId}`;
    try {
      const $p = cheerio.load(await get(url));
      const bodyText = clean($p("body").text());
      const imgs = $p("img").toArray().map((e: any) => ({ src: $p(e).attr("src") || "", parent: clean($p(e).parent().text()) }));
      const posterImg = imgs.find((i) => i.src.includes("uploads.angacinemas.com"));
      const poster = posterImg?.src || f.backdrop;
      const runtime = parseRuntime((bodyText.match(/\d+\s*hrs?\s*(?:\d+\s*mins?)?/i) || [""])[0]);
      const title = f.title || clean($p("title").text()); if (!title) return;
      const format = detectFormat(title, posterImg?.parent);
      const descHead = $p("h3, h4, h5").toArray().find((e: any) => /^description$/i.test(clean($p(e).text())));
      let synopsis = descHead ? clean($p(descHead).nextAll("p, div").first().text()) : "";
      if (!synopsis) synopsis = clean($p("p").toArray().map((e: any) => $p(e).text()).find((t: string) => t.length > 80));
      const trailer = ytWatch($p('iframe[src*="youtube"]').attr("src"));
      const joined = f.texts.join(" | ");
      const gRaw = GENRES.find((g) => joined.includes(g)) || null;
      const genre = gRaw === "Animated" ? "Animation" : gRaw;
      const rating = (joined.replace(title, "").trim().match(/^\s*(PG|G|18|16|15|13|12)(?=[A-Z\s|]|$)/) || [])[1] || null;

      let curDate: string | null = null; let curVenue: string | null = null;
      const movieId = `anga:${filmId}`; const venueSeen = new Map<string, string>(); const mine: Show[] = [];
      $p("body *").each((_, el: any) => {
        const $el = $p(el);
        if (tagOf(el) === "a") {
          const href = $el.attr("href") || "";
          if (!/reservation\?id=/.test(href) || !curDate || !curVenue) return;
          const text = clean($el.text()); const time = to24(text);
          if (!time || curDate < today) return;
          const price = Number((text.match(/Ksh\.?\s*([\d,]+)/i)?.[1] || "").replace(/,/g, "")) || null;
          const key = ANGA_VENUES[curVenue.toLowerCase()] || `anga_${curVenue.toLowerCase()}`;
          const link = abs(ANGA, href)!;
          mine.push({
            id: `${movieId}:${sha(link)}`, movie_id: movieId, provider: "anga", venue: VENUE_LABELS[key] || `Anga ${curVenue}`, venue_key: key,
            show_date: curDate, show_time: time, starts_at: `${curDate}T${time}:00+03:00`, screen: null, format, price_kes: price, booking_url: link,
          });
          venueSeen.set(key, VENUE_LABELS[key] || `Anga ${curVenue}`);
          return;
        }
        const t = ownText($p, el);
        const d = t.match(/Showing For\s+\w+,?\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/i);
        if (d) { curDate = inferDate(Number(d[1]), d[2]); return; }
        if (/^(Diamond|Panari|Sky|CBD)$/i.test(t)) curVenue = t;
      });
      showtimes.push(...mine);
      movies.push({
        id: movieId, provider: "anga", title, title_key: titleKey(title), poster_url: poster, backdrop_url: f.backdrop,
        synopsis: synopsis || null, genre, rating, runtime_min: runtime, format, language: null, release_date: null,
        trailer_url: trailer, movie_url: url, booking_url: mine[0]?.booking_url || url,
        status: mine.length ? "now_showing" : "coming_soon",
        venues: [...venueSeen].map(([venueKey, venue]) => ({ venue, venueKey, bookingUrl: url })),
      });
    } catch (_e) { /* skip this film */ }
  });

  $('a[href*="comingsoon"]').each((_, el) => {
    const m = clean($(el).text()).match(/^(.+?)\s+\1\s+(\d{1,2})(?:st|nd|rd|th)\s+([A-Za-z]{3})$/); if (!m) return;
    const id = `anga:soon-${sha(m[1])}`; if (movies.some((x) => x.id === id)) return;
    movies.push({
      id, provider: "anga", title: m[1], title_key: titleKey(m[1]), poster_url: null, backdrop_url: null, synopsis: null, genre: null,
      rating: null, runtime_min: null, format: detectFormat(m[1]), language: null, release_date: inferDate(Number(m[2]), m[3]),
      trailer_url: null, movie_url: `${ANGA}/comingsoon`, booking_url: `${ANGA}/comingsoon`, status: "coming_soon", venues: [],
    });
  });
  return { movies, showtimes };
}

// ───────── CENTURY ─────────
const CENTURY = "https://centurycinemax.co.ke";
const CENTURY_SITES: Record<string, string> = { garden: "century_garden_city", sarit: "century_sarit", rivers: "century_two_rivers", junction: "century_junction" };

async function scrapeCentury(): Promise<Result> {
  const movies: Movie[] = [];
  const $ = cheerio.load(await get(`${CENTURY}/`));
  const sliders = new Map<string, string>();
  $('img[src*="/storage/sliders/"]').each((_, e) => { const alt = clean($(e).attr("alt")); if (alt) sliders.set(titleKey(alt), abs(CENTURY, $(e).attr("src"))!); });

  const bySlug = new Map<string, { sites: Set<string>; rating: string | null; runtime: number | null; imax: boolean }>();
  $('a[href*="/movie/show/"]').each((_, el) => {
    const m = ($(el).attr("href") || "").match(/\/movie\/show\/([a-z]+)\/([\w-]+)/i);
    if (!m || !CENTURY_SITES[m[1]]) return;
    const text = clean($(el).text());
    const e = bySlug.get(m[2]) ?? { sites: new Set<string>(), rating: null, runtime: null, imax: false };
    e.sites.add(m[1]);
    e.rating ||= (text.match(/\b(PG|12A|15A|16\+|18\+|G|R)\s+(?=\d+h|\d+m)/) || [])[1] || null;
    e.runtime ||= parseRuntime((text.match(/(\d+h(?:\s*\d+m)?|\d+m)\s*$/) || [""])[0]);
    e.imax ||= /^IMAX\b/i.test(text) || /imax/i.test(m[2]);
    bySlug.set(m[2], e);
  });

  await pool([...bySlug], 4, async ([slug, info]) => {
    const sites = [...info.sites]; const pageUrl = `${CENTURY}/movie/show/${sites[0]}/${slug}`;
    try {
      const $p = cheerio.load(await get(pageUrl));
      const title = clean($p("h1").first().text()) || toTitleCase(slug.replace(/_/g, " "));
      const poster = abs(CENTURY, $p('img[src*="/storage/uploads/"]').first().attr("src"));
      const head = $p("h2, h3, h4").toArray().find((e: any) => /about movie/i.test($p(e).text()));
      let synopsis = head ? clean($p(head).nextAll("p, div").first().text()) : "";
      if (!synopsis) synopsis = clean($p('meta[property="og:description"]').attr("content")).replace(/^Buy tickets for .*? at Century Cinemax [\w ]+?\.\s*/i, "");
      movies.push({
        id: `century:${slug}`, provider: "century", title, title_key: titleKey(title), poster_url: poster, backdrop_url: sliders.get(titleKey(title)) || null,
        synopsis: synopsis || null, genre: null, rating: info.rating, runtime_min: info.runtime, format: info.imax ? "IMAX" : detectFormat(title, slug),
        language: null, release_date: null, trailer_url: null, movie_url: pageUrl, booking_url: pageUrl, status: "now_showing",
        venues: sites.map((s) => ({ venue: VENUE_LABELS[CENTURY_SITES[s]], venueKey: CENTURY_SITES[s], bookingUrl: `${CENTURY}/movie/show/${s}/${slug}` })),
      });
    } catch (_e) { /* skip */ }
  });

  const upcoming: { id: string; url: string; text: string }[] = [];
  $('a[href*="/upcoming-movie/show/"]').each((_, el) => {
    const href = abs(CENTURY, $(el).attr("href"))!; const id = (href.match(/show\/(\d+)/) || [])[1];
    if (id && !upcoming.some((u) => u.id === id)) upcoming.push({ id, url: `${CENTURY}/upcoming-movie/show/${id}`, text: clean($(el).text()) });
  });
  await pool(upcoming, 4, async (u) => {
    const m = u.text.match(/^(.*?)\s*(IMAX|3D|2D)?\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(.+)$/);
    const title = clean(m?.[6] || u.text);
    try {
      const $p = cheerio.load(await get(u.url));
      const poster = abs(CENTURY, $p('img[src*="/storage/"]').first().attr("src"));
      const head = $p("h2, h3, h4").toArray().find((e: any) => /about movie/i.test($p(e).text()));
      const synopsis = (head ? clean($p(head).nextAll("p, div").first().text()) : "") || clean($p('meta[name="description"]').attr("content"));
      movies.push({
        id: `century:upcoming-${u.id}`, provider: "century", title, title_key: titleKey(title), poster_url: poster, backdrop_url: null,
        synopsis: synopsis || null, genre: null, rating: null, runtime_min: null, format: detectFormat(m?.[2], m?.[1], title), language: null,
        release_date: m ? `${m[5]}-${String(monthIdx(m[4]) + 1).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}` : null,
        trailer_url: null, movie_url: u.url, booking_url: u.url, status: "coming_soon", venues: [],
      });
    } catch (_e) { /* skip */ }
  });
  return { movies, showtimes: [] };
}

// ───────── UNSEEN ─────────
const UNSEEN = "https://www.unseen-nairobi.com";
async function scrapeUnseen(): Promise<Result> {
  const $ = cheerio.load(await get(`${UNSEEN}/`));
  type Item = { title: string; poster: string | null; synopsis: string; meta: string; ticket: string | null; trailer: string | null };
  const items: Item[] = []; let cur: Item | null = null;
  $("body *").each((_, el: any) => {
    const $el = $(el); const tag = tagOf(el);
    if (tag === "h2") { const t = clean($el.text()); if (t) items.push((cur = { title: t, poster: null, synopsis: "", meta: "", ticket: null, trailer: null })); return; }
    if (!cur) return;
    if (tag === "img" && !cur.poster) {
      const src = $el.attr("data-src") || $el.attr("src") || "";
      if (/squarespace-cdn/.test(src) && !/Logo/i.test(src)) cur.poster = src.split("?")[0] + "?format=750w";
    } else if (tag === "a") {
      const text = clean($el.text()); const href = abs(UNSEEN, $el.attr("href"));
      if (/watch trailer/i.test(text)) cur.trailer = href;
      else if (/tickets/i.test(text) && href && /mookh/i.test(href)) cur.ticket = href;
    } else {
      const t = ownText($, el);
      if (/^\d{4}\s*\|/.test(t)) cur.meta = t;
      else if (t.length > 100 && !t.startsWith("*") && !cur.synopsis) cur.synopsis = t;
    }
  });
  const movies: Movie[] = [];
  for (const it of items) {
    if (!it.ticket) continue;
    const title = toTitleCase(it.title); const parts = it.meta.split("|").map(clean);
    const year = parts[0]?.match(/\d{4}/)?.[0];
    movies.push({
      id: `unseen:${sha(it.title)}`, provider: "unseen", title, title_key: titleKey(title), poster_url: it.poster, backdrop_url: null,
      synopsis: it.synopsis || null, genre: null, rating: null, runtime_min: parseRuntime(parts.find((p) => /min/i.test(p)) || ""), format: "2D",
      language: parts.length >= 4 ? parts[parts.length - 1] : null, release_date: year ? `${year}-01-01` : null, trailer_url: it.trailer,
      movie_url: UNSEEN, booking_url: it.ticket, status: /mini mornings|quiz|gems/i.test(title) ? "special" : "now_showing",
      venues: [{ venue: VENUE_LABELS.unseen, venueKey: "unseen", bookingUrl: it.ticket }],
    });
  }
  return { movies, showtimes: [] };
}

// ───────── save ─────────
async function save(sb: any, provider: string, r: Result) {
  if (!r.movies.length) return { saved: 0, note: "nothing scraped, existing rows kept" };
  const now = new Date().toISOString();
  // de-dupe ids (parallel scraping can repeat)
  const movies = [...new Map(r.movies.map((m) => [m.id, m])).values()];
  const shows = [...new Map(r.showtimes.map((s) => [s.id, s])).values()];
  const e1 = (await sb.from("cinema_movies").upsert(movies.map((m) => ({ ...m, scraped_at: now })), { onConflict: "id" })).error; if (e1) throw e1;
  const e2 = (await sb.from("cinema_showtimes").delete().eq("provider", provider)).error; if (e2) throw e2;
  for (let i = 0; i < shows.length; i += 500) {
    const e = (await sb.from("cinema_showtimes").insert(shows.slice(i, i + 500).map((s) => ({ ...s, scraped_at: now })))).error; if (e) throw e;
  }
  const { data: ex } = await sb.from("cinema_movies").select("id").eq("provider", provider);
  const keep = new Set(movies.map((m) => m.id));
  const stale = (ex || []).map((x: any) => x.id).filter((id: string) => !keep.has(id));
  if (stale.length) await sb.from("cinema_movies").delete().in("id", stale);
  return { saved: movies.length, showtimes: shows.length, removed: stale.length };
}

const SOURCES: Record<string, () => Promise<Result>> = { anga: scrapeAnga, century: scrapeCentury, unseen: scrapeUnseen };

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o, null, 2), { status, headers: { "content-type": "application/json" } });

  const SECRET = Deno.env.get("SEED_CINEMAS_KEY");
  if (!SECRET || SECRET.length < 16) return json({ error: "disabled: set the SEED_CINEMAS_KEY secret (16+ characters)" }, 503);
  if (!same(url.searchParams.get("key") || "", SECRET)) return json({ error: "unauthorized" }, 401);

  const dry = url.searchParams.has("dry");
  const only = (url.searchParams.get("only") || "").split(",").filter(Boolean);
  const names = Object.keys(SOURCES).filter((n) => !only.length || only.includes(n));
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const out: Record<string, unknown> = { dry };
  for (const name of names) {
    try {
      const r = await SOURCES[name]();
      if (dry) {
        out[name] = {
          films: r.movies.length, showtimes: r.showtimes.length,
          withPoster: r.movies.filter((m) => m.poster_url).length, withSynopsis: r.movies.filter((m) => m.synopsis).length,
          sample: r.movies.slice(0, 6).map((m) => ({ title: m.title, format: m.format, status: m.status, poster: !!m.poster_url, synopsis: !!m.synopsis, venues: m.venues.length })),
        };
      } else out[name] = await save(sb, name, r);
    } catch (e) { out[name] = { error: (e as Error).message ?? String(e) }; }
  }
  return json(out);
});
