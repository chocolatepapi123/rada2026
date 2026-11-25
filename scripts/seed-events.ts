/**
 * RADA Nairobi Events seeder.
 *
 *   npx tsx scripts/seed-events.ts                # scrape all 7 sources + upsert into Supabase external_events
 *   npx tsx scripts/seed-events.ts --dry          # scrape + print without writing to Supabase
 *   npx tsx scripts/seed-events.ts --only=nairobieventsguide,ikoform,eventsuri,wappi,allevents
 *
 * Storage behaviour:
 *   - Event metadata rows are upserted directly to Supabase Postgres (`public.external_events`).
 *   - If Cloudflare R2 credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
 *     `R2_BUCKET`, `R2_PUBLIC_BASE`) are set, downloaded event posters are mirrored to Cloudflare R2
 *     (`rada-media/events/...`) and the resulting R2 public URL is stored in `image_url`.
 *   - Otherwise, verified source HTTPS poster URLs are stored directly in `external_events.image_url`.
 */
import * as cheerio from 'cheerio';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { r2Missing, put as r2Put, publicUrl as r2PublicUrl } from './lib/r2.mjs';

try { (process as any).loadEnvFile?.('.env.local'); } catch { /* optional */ }

export interface SeedExternalEvent {
  id: string;
  source: string;
  source_url: string;
  title: string;
  category: string | null;
  rada_category: 'concerts' | 'nightlife' | 'arts' | 'food' | 'community' | 'sports' | 'business' | 'education';
  start_at: string;
  end_at: string | null;
  has_time: boolean;
  venue: string | null;
  host: string | null;
  image_url: string | null;
  price_min: number | null;
  currency: string;
  country: string;
  tiers: { name: string; price: number | null; currency?: string; status?: string; note?: string }[];
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  gallery: string[] | null;
  tags: string[] | null;
  place_id: string | null;
}

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const ONLY = (args.find(a => a.startsWith('--only='))?.split('=')[1] || '').split(',').filter(Boolean);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const clean = (s?: string | null) =>
  (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
const sha = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 14);
const todayISO = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);

async function getHtml(url: string, tries = 2): Promise<{ status: number; html: string }> {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, {
        headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });
      return { status: r.status, html: await r.text() };
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(700 * i);
    }
  }
}

function classifyCategory(title: string, desc = '', rawCat = ''): SeedExternalEvent['rada_category'] {
  const hay = `${title} ${desc} ${rawCat}`.toLowerCase();
  if (/\b(run|5k|10k|marathon|triathlon|padel|tennis|rugby|football|sports|fitness|yoga|hike|hiking)\b/.test(hay)) return 'sports';
  if (/\b(tech|ai|startup|summit|conference|ceo|business|crm|forum|networking|real estate|trade|investment)\b/.test(hay)) return 'business';
  if (/\b(concert|live music|festival|tour|rhumba|wakadinali|ferre gola|odeal|solfest|mugithi|band|bongo|konpa)\b/.test(hay)) return 'concerts';
  if (/\b(dj|club|party|nightlife|rooftop|karaoke|afterparty|amapiano|afrohouse|masquerade|alchemist|koda|muze|bar next door|latin)\b/.test(hay)) return 'nightlife';
  if (/\b(brunch|food|dinner|wine|cocktail|meat|tasting|oyster|culinary)\b/.test(hay)) return 'food';
  if (/\b(art|theatre|theater|musical|poetry|book|film|cinema|ballet|fashion|runway|gallery|comedy|slam|market|souk|bazaar)\b/.test(hay)) return 'arts';
  if (/\b(class|masterclass|workshop|academy|training|webinar|seminar)\b/.test(hay)) return 'education';
  return 'community';
}

function normalizeIso(raw?: string | null): { iso: string; hasTime: boolean } {
  const s = (raw || '').trim();
  if (!s) return { iso: `${todayISO()}T18:00:00+03:00`, hasTime: false };
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { iso: `${s}T12:00:00+03:00`, hasTime: false };
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return { iso: `${s}:00+03:00`, hasTime: true };
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) {
    const fixed = s.replace(' ', 'T');
    return { iso: fixed.length === 16 ? `${fixed}:00+03:00` : `${fixed}+03:00`, hasTime: true };
  }
  return { iso: s, hasTime: /T\d{2}:\d{2}/.test(s) && !/T00:00:00/.test(s) };
}

function extractLdEvents($: cheerio.CheerioAPI): any[] {
  const out: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const pushAny = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(pushAny); return; }
        if (Array.isArray(node['@graph'])) node['@graph'].forEach(pushAny);
        if (node['@type'] === 'ItemList' && Array.isArray(node.itemListElement)) {
          node.itemListElement.forEach((li: any) => pushAny(li?.item || li));
        }
        if (/Event/i.test(String(node['@type'] || ''))) out.push(node);
      };
      pushAny(parsed);
    } catch { /* ignore invalid json-ld */ }
  });
  return out;
}

const VENUE_COORDS: Array<[RegExp, number, number]> = [
  [/uhuru gardens/i, -1.3243, 36.8010],
  [/kasarani|kastemill|sportsview/i, -1.2225, 36.8985],
  [/ask (arena|showground|dome)/i, -1.3005, 36.7590],
  [/sarit|westlands|alchemist|muze|koda|nairobi street kitchen|9 west|alloy/i, -1.2641, 36.8030],
  [/village market|trademark|gigiri/i, -1.2292, 36.8047],
  [/ngong race\s?course|masshouse/i, -1.3125, 36.7425],
  [/kenya national theatre|university of nairobi|alliance fran[cç]aise|kicc|national archives|central park/i, -1.2857, 36.8202],
  [/wilson airport/i, -1.3217, 36.8148],
  [/waterfront karen|karen/i, -1.3228, 36.7069],
  [/safari park/i, -1.2255, 36.8835],
  [/emara ole sereni/i, -1.3244, 36.8490],
  [/two rivers|garden city/i, -1.2200, 36.8400],
  [/bar next door|kiambu rd|evergreen/i, -1.2230, 36.8370],
];

function coordsFor(venue?: string | null): { lat: number | null; lng: number | null } {
  const hay = venue || '';
  const hit = VENUE_COORDS.find(([re]) => re.test(hay));
  return hit ? { lat: hit[1], lng: hit[2] } : { lat: null, lng: null };
}

// ───────────────────────── 1. NAIROBI EVENTS GUIDE ─────────────────────────
async function scrapeNairobiEventsGuide(): Promise<SeedExternalEvent[]> {
  const urls = new Set<string>(['https://nairobieventsguide.com/event/the-rong-experience-wakadinali-live/']);
  for (const listUrl of ['https://nairobieventsguide.com/', 'https://nairobieventsguide.com/events/']) {
    const { html } = await getHtml(listUrl).catch(() => ({ html: '' }));
    for (const m of html.matchAll(/https:\/\/nairobieventsguide\.com\/event\/[a-z0-9-]+\//gi)) urls.add(m[0]);
  }
  const today = todayISO();
  const out: SeedExternalEvent[] = [];
  for (const u of [...urls].slice(0, 28)) {
    try {
      const { html } = await getHtml(u);
      const $ = cheerio.load(html);
      const ld = extractLdEvents($)[0];
      const title = clean(ld?.name || $('h1').first().text());
      if (!title) continue;
      const { iso: startAt, hasTime } = normalizeIso(ld?.startDate);
      if (startAt.slice(0, 10) < today) continue;
      const endAt = ld?.endDate ? normalizeIso(ld.endDate).iso : null;
      const venue = clean(ld?.location?.name || ld?.location?.address?.streetAddress || 'Nairobi');
      const rawImg = (Array.isArray(ld?.image) ? ld.image[0] : ld?.image) || $('meta[property="og:image"]').attr('content') || null;
      const desc = clean(ld?.description || $('meta[property="og:description"]').attr('content'));
      const coords = coordsFor(venue);
      out.push({
        id: `neg-${sha(u)}`,
        source: 'nairobieventsguide',
        source_url: u,
        title,
        category: 'Event',
        rada_category: classifyCategory(title, desc),
        start_at: startAt,
        end_at: endAt,
        has_time: hasTime,
        venue,
        host: clean(ld?.organizer?.name) || 'Nairobi Events Guide',
        image_url: rawImg,
        price_min: null,
        currency: 'KES',
        country: 'KE',
        tiers: [],
        description: desc || null,
        address: venue,
        lat: coords.lat,
        lng: coords.lng,
        gallery: rawImg ? [rawImg] : null,
        tags: ['nairobi', 'nairobieventsguide'],
        place_id: null,
      });
      await sleep(150);
    } catch { /* skip single page error */ }
  }
  return out;
}

// ───────────────────────── 2. IKOFORM ─────────────────────────
async function scrapeIkoform(): Promise<SeedExternalEvent[]> {
  const urls = new Set<string>();
  for (const page of ['https://ikoform.co.ke/', 'https://ikoform.co.ke/explore-events/']) {
    const { html } = await getHtml(page).catch(() => ({ html: '' }));
    for (const m of html.matchAll(/https:\/\/ikoform\.co\.ke\/events\/[a-z0-9-]+\//gi)) urls.add(m[0]);
  }
  const today = todayISO();
  const out: SeedExternalEvent[] = [];
  for (const u of [...urls].slice(0, 32)) {
    try {
      const { html } = await getHtml(u);
      const $ = cheerio.load(html);
      const ld = extractLdEvents($)[0];
      const title = clean(ld?.name || $('h1').first().text());
      if (!title) continue;
      const { iso: startAt, hasTime } = normalizeIso(ld?.startDate);
      if (startAt.slice(0, 10) < today) continue;
      const endAt = ld?.endDate ? normalizeIso(ld.endDate).iso : null;
      const venue = clean(ld?.location?.name || 'Nairobi');
      const img =
        (Array.isArray(ld?.image) ? ld.image[0] : ld?.image) ||
        $('meta[property="og:image"]').attr('content') ||
        $('img[src*="wp-content/uploads"]').toArray().map(e => $(e).attr('src')).find(s => s && !/logo/i.test(s)) ||
        null;
      const desc = clean(ld?.description || $('meta[property="og:description"]').attr('content'));
      const coords = coordsFor(venue);
      out.push({
        id: `ikoform-${sha(u)}`,
        source: 'ikoform',
        source_url: u,
        title,
        category: 'Event',
        rada_category: classifyCategory(title, desc),
        start_at: startAt,
        end_at: endAt,
        has_time: hasTime,
        venue,
        host: clean(ld?.organizer?.name) || 'Iko Form',
        image_url: img,
        price_min: null,
        currency: 'KES',
        country: 'KE',
        tiers: [],
        description: desc || null,
        address: venue,
        lat: coords.lat,
        lng: coords.lng,
        gallery: img ? [img] : null,
        tags: ['ikoform', 'nairobi'],
        place_id: null,
      });
      await sleep(150);
    } catch { /* skip */ }
  }
  return out;
}

// ───────────────────────── 3. EVENTSURI ─────────────────────────
async function scrapeEventsuri(): Promise<SeedExternalEvent[]> {
  const urls = new Set<string>();
  for (const page of ['https://eventsuri.com/events?city=nairobi', 'https://eventsuri.com/events?city=nairobi&page=2']) {
    const { html } = await getHtml(page).catch(() => ({ html: '' }));
    for (const m of html.matchAll(/href=["']((?:https:\/\/eventsuri\.com)?\/events\/[a-z0-9-]+)["']/gi)) {
      const full = m[1].startsWith('http') ? m[1] : `https://eventsuri.com${m[1]}`;
      if (!/call-for-vendors/i.test(full)) urls.add(full);
    }
  }
  const today = todayISO();
  const out: SeedExternalEvent[] = [];
  for (const u of [...urls].slice(0, 25)) {
    try {
      const { html } = await getHtml(u);
      const $ = cheerio.load(html);
      const ld = extractLdEvents($)[0];
      const title = clean(ld?.name || $('h1').first().text());
      if (!title) continue;
      const { iso: startAt, hasTime } = normalizeIso(ld?.startDate);
      if (startAt.slice(0, 10) < today) continue;
      const endAt = ld?.endDate ? normalizeIso(ld.endDate).iso : null;
      const venue = clean(ld?.location?.name || ld?.location?.address?.streetAddress || 'Nairobi');
      const img =
        (Array.isArray(ld?.image) ? ld.image[0] : ld?.image) ||
        $('meta[property="og:image"]').attr('content') ||
        $('img[src*="/storage/uploads/events/"]').first().attr('src') ||
        null;
      const absImg = img && !img.startsWith('http') ? `https://eventsuri.com${img}` : img;
      const desc = clean(ld?.description || $('meta[property="og:description"]').attr('content'));
      const coords = coordsFor(venue);
      out.push({
        id: `eventsuri-${sha(u)}`,
        source: 'eventsuri',
        source_url: u,
        title,
        category: 'Event',
        rada_category: classifyCategory(title, desc),
        start_at: startAt,
        end_at: endAt,
        has_time: hasTime,
        venue,
        host: clean(ld?.organizer?.name) || 'EventSuri',
        image_url: absImg,
        price_min: null,
        currency: 'KES',
        country: 'KE',
        tiers: [],
        description: desc || null,
        address: venue,
        lat: coords.lat,
        lng: coords.lng,
        gallery: absImg ? [absImg] : null,
        tags: ['eventsuri', 'nairobi'],
        place_id: null,
      });
      await sleep(150);
    } catch { /* skip */ }
  }
  return out;
}

// ───────────────────────── 4. WAPPI ─────────────────────────
async function scrapeWappi(): Promise<SeedExternalEvent[]> {
  const { html } = await getHtml('https://wappi.co.ke/');
  const postPaths = [...new Set([...html.matchAll(/\/p\/(\d+)/g)].map(m => m[1]))];
  const today = todayISO();
  const out: SeedExternalEvent[] = [];

  for (const pid of postPaths) {
    const u = `https://wappi.co.ke/p/${pid}`;
    try {
      const { html: phtml } = await getHtml(u);
      const $ = cheerio.load(phtml);
      const title = clean($('h1').first().text() || $('meta[property="og:title"]').attr('content')).replace(/\s*-\s*Wappi$/i, '');
      const desc = clean($('meta[property="og:description"]').attr('content'));
      const ogImg = $('meta[property="og:image"]').attr('content') || `https://wappi.co.ke/cards/og/${pid}.jpg`;
      if (!title || /Miss Face of Molo|Kikuyu Land/i.test(title)) continue; // keep current/upcoming Nov–Dec 2026 plans

      // Parse desc like "Friday, November 27th · at 6:00 PM · Alloy Padel, Sarit Centre"
      const m = desc.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*·\s*at\s*(\d{1,2}:\d{2}\s*[AP]M)\s*·\s*(.+)$/i);
      const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
      let dateIso = today;
      let startAt = `${today}T18:00:00+03:00`;
      let venue = 'Nairobi';
      if (m) {
        const mi = months.findIndex(x => x.startsWith(m[1].toLowerCase().slice(0, 3)));
        if (mi >= 0) dateIso = `2026-${String(mi + 1).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`;
        const tmMatch = m[3].match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
        if (tmMatch) {
          let hh = Number(tmMatch[1]) % 12;
          if (tmMatch[3].toUpperCase() === 'PM') hh += 12;
          startAt = `${dateIso}T${String(hh).padStart(2, '0')}:${tmMatch[2]}:00+03:00`;
        }
        venue = clean(m[4]);
      }
      if (dateIso < today) continue;
      const tags = [...$('a[href*="#"], span, p').text().matchAll(/#([a-z0-9-]+)/gi)].map(x => x[1]).slice(0, 5);
      const coords = coordsFor(venue);
      out.push({
        id: `wappi-${pid}`,
        source: 'wappi',
        source_url: u,
        title,
        category: tags[0] || 'Social',
        rada_category: classifyCategory(title, `${desc} ${tags.join(' ')}`),
        start_at: startAt,
        end_at: null,
        has_time: true,
        venue,
        host: 'Wappi Nairobi',
        image_url: ogImg,
        price_min: null,
        currency: 'KES',
        country: 'KE',
        tiers: [],
        description: desc || title,
        address: venue,
        lat: coords.lat,
        lng: coords.lng,
        gallery: ogImg ? [ogImg] : null,
        tags: ['wappi', ...tags],
        place_id: null,
      });
      await sleep(120);
    } catch { /* skip */ }
  }
  return out;
}

// ───────────────────────── 5. ALLEVENTS NAIROBI ─────────────────────────
function parseAllEventsDate(raw: string): { iso: string; hasTime: boolean } {
  // e.g. "Sat, 28 Nov, 2026 - 04:00 PM"
  const m = raw.match(/(\d{1,2})\s+([A-Za-z]{3}),?\s*(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2})\s*([AP]M))?/i);
  if (!m) return { iso: `${todayISO()}T12:00:00+03:00`, hasTime: false };
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const mi = months.indexOf(m[2].toLowerCase().slice(0, 3));
  if (mi < 0) return { iso: `${todayISO()}T12:00:00+03:00`, hasTime: false };
  const datePart = `${m[3]}-${String(mi + 1).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
  if (!m[4]) return { iso: `${datePart}T12:00:00+03:00`, hasTime: false };
  let hh = Number(m[4]) % 12;
  if (m[6].toUpperCase() === 'PM') hh += 12;
  return { iso: `${datePart}T${String(hh).padStart(2, '0')}:${m[5]}:00+03:00`, hasTime: true };
}

async function scrapeAllEvents(): Promise<SeedExternalEvent[]> {
  const { html } = await getHtml('https://allevents.in/nairobi/all');
  const $ = cheerio.load(html);
  const events = extractLdEvents($);
  const today = todayISO();
  const seen = new Set<string>();
  const out: SeedExternalEvent[] = [];

  for (const ev of events) {
    const title = clean(ev.name);
    const url = ev.url || '';
    if (!title || !url || seen.has(url)) continue;
    seen.add(url);
    const { iso: startAt, hasTime } = normalizeIso(ev.startDate);
    if (startAt.slice(0, 10) < today) continue;
    const endAt = ev.endDate ? normalizeIso(ev.endDate).iso : null;
    const venue = clean(ev.location?.name || ev.location?.address?.streetAddress || 'Nairobi');
    const addr = clean(ev.location?.address?.streetAddress || venue);
    const img = typeof ev.image === 'string' ? ev.image : Array.isArray(ev.image) ? ev.image[0] : null;
    if (!img || /dyn-image\.allevents\.in\/generate-image/i.test(img)) continue;
    const desc = clean(ev.description) || `${title} at ${venue}.`;
    const geo = ev.location?.geo;
    const org = clean(Array.isArray(ev.organizer) ? ev.organizer[0]?.name : ev.organizer?.name) || 'AllEvents Nairobi';
    out.push({
      id: `allevents-${sha(url)}`,
      source: 'allevents',
      source_url: url,
      title,
      category: 'Event',
      rada_category: classifyCategory(title, desc),
      start_at: startAt,
      end_at: endAt,
      has_time: hasTime,
      venue,
      host: org,
      image_url: img,
      price_min: null,
      currency: 'KES',
      country: 'KE',
      tiers: [],
      description: desc,
      address: addr,
      lat: typeof geo?.latitude === 'number' ? geo.latitude : coordsFor(venue).lat,
      lng: typeof geo?.longitude === 'number' ? geo.longitude : coordsFor(venue).lng,
      gallery: [img],
      tags: ['allevents', 'nairobi'],
      place_id: null,
    });
  }

  // Fallback / additional items from li.event-card
  const cards = $('li.event-card').toArray().slice(0, 30);
  for (const el of cards) {
    const $c = $(el);
    const url = $c.attr('data-link') || $c.find('a[href^="https://allevents.in/"]').first().attr('href') || '';
    const title = clean($c.find('h3').first().text());
    if (!title || !url || seen.has(url)) continue;
    seen.add(url);
    const dateRaw = clean($c.find('.date').first().text());
    const { iso: startAt, hasTime } = parseAllEventsDate(dateRaw);
    if (startAt.slice(0, 10) < today) continue;
    const venue = clean($c.find('.location').first().text()) || 'Nairobi';
    let img = $c.find('img').attr('data-src') || $c.find('img').attr('src') || null;
    if (img && (/lh3\.googleusercontent\.com/i.test(img) || /dyn-image\.allevents\.in\/generate-image/i.test(img))) {
      img = null;
    }
    let desc = `${title} at ${venue}.`;
    if (!img) {
      try {
        const { html: dhtml } = await getHtml(url);
        const $d = cheerio.load(dhtml);
        const og = $d('meta[property="og:image"]').attr('content');
        if (og && !/dyn-image\.allevents\.in\/generate-image/i.test(og)) img = og;
        const ogDesc = clean($d('meta[property="og:description"]').attr('content'));
        if (ogDesc) desc = ogDesc;
        await sleep(100);
      } catch { /* skip detail fetch failure */ }
    }
    if (!img) continue;
    const coords = coordsFor(venue);
    out.push({
      id: `allevents-${sha(url)}`,
      source: 'allevents',
      source_url: url,
      title,
      category: 'Event',
      rada_category: classifyCategory(title, desc),
      start_at: startAt,
      end_at: null,
      has_time: hasTime,
      venue,
      host: 'AllEvents Nairobi',
      image_url: img,
      price_min: null,
      currency: 'KES',
      country: 'KE',
      tiers: [],
      description: desc,
      address: venue,
      lat: coords.lat,
      lng: coords.lng,
      gallery: [img],
      tags: ['allevents', 'nairobi'],
      place_id: null,
    });
  }
  return out;
}

// ───────────────────────── 6 & 7. EVENTBRITE & BANDSINTOWN ─────────────────────────
async function scrapeEventbrite(): Promise<SeedExternalEvent[]> {
  const { status, html } = await getHtml('https://www.eventbrite.com/d/kenya--nairobi/events/').catch(() => ({ status: 0, html: '' }));
  if (status !== 200 || /Human Verification|captcha/i.test(html)) {
    console.log('  eventbrite: protected by bot verification; curated Eventbrite Nairobi listings live in src/lib/featuredEvents.ts');
    return [];
  }
  const $ = cheerio.load(html);
  const events = extractLdEvents($);
  const today = todayISO();
  return events
    .filter(ev => ev?.name && normalizeIso(ev.startDate).iso.slice(0, 10) >= today)
    .map(ev => {
      const { iso: startAt, hasTime } = normalizeIso(ev.startDate);
      const venue = clean(ev.location?.name || 'Nairobi');
      const coords = coordsFor(venue);
      return {
        id: `eventbrite-${sha(ev.url || ev.name)}`,
        source: 'eventbrite',
        source_url: ev.url || 'https://www.eventbrite.com/d/kenya--nairobi/events/',
        title: clean(ev.name),
        category: 'Event',
        rada_category: classifyCategory(ev.name, ev.description),
        start_at: startAt,
        end_at: ev.endDate ? normalizeIso(ev.endDate).iso : null,
        has_time: hasTime,
        venue,
        host: clean(ev.organizer?.name) || 'Eventbrite',
        image_url: ev.image || null,
        price_min: null,
        currency: 'KES',
        country: 'KE',
        tiers: [],
        description: clean(ev.description) || null,
        address: venue,
        lat: coords.lat,
        lng: coords.lng,
        gallery: ev.image ? [ev.image] : null,
        tags: ['eventbrite', 'nairobi'],
        place_id: null,
      };
    });
}

async function scrapeBandsintown(): Promise<SeedExternalEvent[]> {
  const { status, html } = await getHtml('https://www.bandsintown.com/c/nairobi-kenya').catch(() => ({ status: 0, html: '' }));
  if (status !== 200 || /Attention Required|Cloudflare/i.test(html)) {
    console.log('  bandsintown: behind Cloudflare challenge; curated Bandsintown Nairobi concerts live in src/lib/featuredEvents.ts');
    return [];
  }
  const $ = cheerio.load(html);
  const events = extractLdEvents($);
  const today = todayISO();
  return events
    .filter(ev => ev?.name && normalizeIso(ev.startDate).iso.slice(0, 10) >= today)
    .map(ev => {
      const { iso: startAt, hasTime } = normalizeIso(ev.startDate);
      const venue = clean(ev.location?.name || 'Nairobi');
      const coords = coordsFor(venue);
      return {
        id: `bandsintown-${sha(ev.url || ev.name)}`,
        source: 'bandsintown',
        source_url: ev.url || 'https://www.bandsintown.com/c/nairobi-kenya',
        title: clean(ev.name),
        category: 'Live Music',
        rada_category: 'concerts',
        start_at: startAt,
        end_at: null,
        has_time: hasTime,
        venue,
        host: 'Bandsintown',
        image_url: ev.image || null,
        price_min: null,
        currency: 'KES',
        country: 'KE',
        tiers: [],
        description: clean(ev.description) || null,
        address: venue,
        lat: coords.lat,
        lng: coords.lng,
        gallery: ev.image ? [ev.image] : null,
        tags: ['bandsintown', 'concert', 'nairobi'],
        place_id: null,
      };
    });
}

// ───────────────────────── optional Cloudflare R2 image mirror ─────────────────────────
async function maybeMirrorEventImg(imageUrl: string | null, source: string): Promise<string | null> {
  if (!imageUrl || r2Missing().length > 0) return imageUrl;
  try {
    const res = await fetch(imageUrl, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return imageUrl;
    const ct = res.headers.get('content-type') || 'image/jpeg';
    if (!ct.startsWith('image/')) return imageUrl;
    const ext = ct.includes('avif') ? 'avif' : ct.includes('webp') ? 'webp' : ct.includes('png') ? 'png' : 'jpg';
    const key = `events/${source}-${sha(imageUrl)}.${ext}`;
    const buf = Buffer.from(await res.arrayBuffer());
    await r2Put(key, buf, ct);
    return r2PublicUrl(key);
  } catch {
    return imageUrl;
  }
}

const SOURCES: Record<string, () => Promise<SeedExternalEvent[]>> = {
  nairobieventsguide: scrapeNairobiEventsGuide,
  ikoform: scrapeIkoform,
  eventsuri: scrapeEventsuri,
  wappi: scrapeWappi,
  allevents: scrapeAllEvents,
  eventbrite: scrapeEventbrite,
  bandsintown: scrapeBandsintown,
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
  const useR2 = !DRY && r2Missing().length === 0;

  for (const name of names) {
    console.log(`\n▶ ${name}`);
    try {
      const rows = await SOURCES[name]();
      if (DRY) {
        rows.slice(0, 20).forEach(r =>
          console.log(`   • [${r.start_at.slice(0, 10)}] ${r.title} (${r.rada_category}) @ ${r.venue} | img:${r.image_url ? 'y' : 'n'}`)
        );
        console.log(`   total ${rows.length} upcoming events`);
      } else if (rows.length) {
        if (useR2) {
          for (const row of rows) row.image_url = await maybeMirrorEventImg(row.image_url, name);
        }
        const { error } = await sb!.from('external_events').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
        console.log(`  saved ${rows.length} events from ${name}${useR2 ? ' (images mirrored to Cloudflare R2)' : ''}`);
      }
    } catch (e) {
      console.error(`  ✖ ${name} failed:`, (e as Error).message);
    }
  }
  console.log('\nDone.');
}

main();
