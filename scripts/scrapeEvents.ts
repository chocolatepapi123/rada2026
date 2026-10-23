import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

const UA = 'Mozilla/5.0 (compatible; RADA-EventsBot/1.0; +https://rada.app)';
const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

type EventRow = {
  source: string;
  source_url: string;
  title: string;
  category: string;
  rada_category: string;
  start_at: string;
  end_at: string | null;
  venue: string | null;
  host: string | null;
  image_url: string | null;
  price_min: number | null;
  currency: string;
  country: string;
  description: string | null;
  address: string | null;
  has_time: boolean;
  tags: string[];
  tiers: any[];
  gallery: string[];
  scraped_at: string;
};

async function getHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
    if (!res.ok) {
      console.log(`  ! ${res.status} ${url}`);
      return null;
    }
    return await res.text();
  } catch (e: any) {
    console.log(`  ! fetch failed ${url}: ${e.message}`);
    return null;
  }
}

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

function meta(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`,
    'i'
  );
  const m = html.match(re);
  const v = m ? m[1] ?? m[2] : null;
  return v ? decode(v) : null;
}

function jsonLdEvent(html: string): any | null {
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    try {
      const j = JSON.parse(b[1]);
      const list = Array.isArray(j) ? j : j['@graph'] ? j['@graph'] : [j];
      for (const item of list) {
        const t = item['@type'];
        if (t && String(Array.isArray(t) ? t.join(',') : t).toLowerCase().includes('event')) return item;
      }
    } catch {}
  }
  return null;
}

function categorize(text: string): { category: string; rada: string } {
  const t = text.toLowerCase();
  const rules: [RegExp, string, string][] = [
    [/book club|poetry|exhibition|museum|theatre|theater|comedy/, 'Arts & Culture', 'arts'],
    [/festival|concert|live music|\blive\b|rnb|r&b|gig|afrobeat|jazz|choir|tour\b/, 'Concerts & Live Music', 'concerts'],
    [/party|club|rave|nightlife|afterparty|dj\b|vibez|vibe check|ladies night/, 'Nightlife & Parties', 'nightlife'],
    [/brunch|food|wine|tasting|dining|cook|bbq|nyama|carnivore|beer/, 'Food & Drink', 'food'],
    [/comedy|theatre|theater|art\b|exhibition|culture|book club|poetry|museum/, 'Arts & Culture', 'arts'],
    [/film|cinema|movie|screening/, 'Film & Cinema', 'cinemas'],
    [/football|match|marathon|run\b|rally|sports|gaming|esports|fitness|race|shooting|mud|hike/, 'Sports & Gaming', 'sports'],
    [/conference|summit|networking|business|expo|masterclass|\bsec\b/, 'Business & Networking', 'business'],
    [/workshop|class|training|bootcamp|course/, 'Education & Workshops', 'education'],
    [/church|worship|gospel|prayer|faith/, 'Faith & Spirituality', 'faith'],
    [/fashion|runway/, 'Fashion', 'fashion'],
    [/kids|family|children/, 'Family & Kids', 'family'],
    [/charity|fundrais/, 'Charity', 'charity'],
    [/travel|safari|camping|nature|trail|outdoor|adventure|paint/, 'Travel & Outdoors', 'outdoors'],
  ];
  for (const [re, cat, rada] of rules) if (re.test(t)) return { category: cat, rada };
  return { category: 'Community & Social', rada: 'community' };
}

const isKenya = (s: string) => !/uganda|tanzania|rwanda/i.test(s);

// ---------- Madfun ----------
function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'));
  return m ? decode(m[1]) : null;
}

async function scrapeMadfun(): Promise<EventRow[]> {
  console.log('Madfun...');
  const html = await getHtml('https://gigs.madfun.com/events');
  if (!html) return [];
  const rows: EventRow[] = [];
  const seen = new Set<string>();
  const anchors = [...html.matchAll(/<a\b([^>]*?href=["'](?:https?:\/\/gigs\.madfun\.com)?\/?event\/(\d+)["'][^>]*)>([\s\S]*?)<\/a>/gi)];
  console.log(`  event anchors ${anchors.length}`);
  for (const a of anchors) {
    const tag = a[1];
    const id = a[2];
    if (seen.has(id)) continue;
    seen.add(id);
    const url = `https://gigs.madfun.com/event/${id}`;
    const inner = a[3];
    const text = decode(inner.replace(/<[^>]+>/g, ' '));
    const date = attr(tag, 'data-date'); // 2026-10-24
    const venue = attr(tag, 'data-venue');
    const host = attr(tag, 'data-company');
    const title = (attr(tag, 'data-title') || attr(tag, 'data-name') || text.split(/\s+organized by\s+/i)[0] || '').trim();
    if (!title || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.log('  skip (no title/date):', id, title.slice(0, 40), date);
      continue;
    }
    const imgM = inner.match(/<img[^>]+src=["']([^"']+)["']/i);
    const img = imgM ? decode(imgM[1]).replace(/ /g, '%20') : null;
    const page = await getHtml(url);
    let desc = page ? meta(page, 'og:description') || meta(page, 'description') : null;
    if (desc && /discover popular events/i.test(desc)) desc = null;
    const { category, rada } = categorize(`${title} ${desc || ''}`);
    rows.push({
      source: 'madfun', source_url: url, title, category, rada_category: rada,
      start_at: new Date(`${date}T00:00:00+03:00`).toISOString(),
      end_at: null, venue, host, image_url: img,
      price_min: null, currency: 'KES', country: 'KE',
      description: desc, address: venue, has_time: false, tags: [], tiers: [], gallery: [],
      scraped_at: new Date().toISOString(),
    });
  }
  return rows;
}

// ---------- Generic JSON-LD page scraper (Ticketyetu, Solfest) ----------
async function scrapeEventPage(source: string, url: string): Promise<EventRow | null> {
  const html = await getHtml(url);
  if (!html) return null;
  const ld = jsonLdEvent(html);
  const title = decode(ld?.name || meta(html, 'og:title') || '').replace(/\s*[|\-–]\s*Ticket ?yetu.*$/i, '');
  let startRaw = ld?.startDate;
  if (!startRaw) {
    const text = decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' '));
    const m = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})[a-z]*,?\s+(\d{4})/);
    if (m && MONTHS[m[2].toLowerCase()]) startRaw = `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}T00:00:00+03:00`;
  }
  if (!title || !startRaw) { console.log('  skip (no title/date):', url, '| title:', title.slice(0, 40)); return null; }
  const start = new Date(startRaw);
  if (isNaN(start.getTime())) return null;
  const end = ld?.endDate ? new Date(ld.endDate) : null;
  const loc = ld?.location || {};
  const venue = loc.name ? decode(String(loc.name)) : null;
  const addr = loc.address
    ? typeof loc.address === 'string' ? loc.address
      : [loc.address.streetAddress, loc.address.addressLocality].filter(Boolean).join(', ')
    : null;
  const offers = ld?.offers ? (Array.isArray(ld.offers) ? ld.offers : [ld.offers]) : [];
  const prices = offers.map((o: any) => Number(o.price ?? o.lowPrice)).filter((n: number) => !isNaN(n));
  const imgRaw = Array.isArray(ld?.image) ? ld.image[0] : ld?.image;
  const img = (typeof imgRaw === 'string' ? imgRaw : imgRaw?.url) || meta(html, 'og:image');
  const desc = ld?.description ? decode(String(ld.description)) : meta(html, 'og:description');
  const hasTime = /T\d{2}:\d{2}/.test(String(startRaw)) && !/T00:00(:00)?(\.000)?(Z|\+00:00)?$/.test(String(startRaw));
  const { category, rada } = categorize(`${title} ${desc || ''}`);
  const org = ld?.organizer?.name ? decode(String(ld.organizer.name)) : null;
  return {
    source, source_url: url, title, category, rada_category: rada,
    start_at: start.toISOString(), end_at: end && !isNaN(end.getTime()) ? end.toISOString() : null,
    venue, host: org, image_url: img || null,
    price_min: prices.filter((n: number) => n > 0).length ? Math.min(...prices.filter((n: number) => n > 0)) : null,
    currency: offers[0]?.priceCurrency || 'KES', country: 'KE',
    description: desc || null, address: addr || venue, has_time: hasTime,
    tags: [], tiers: [], gallery: [], scraped_at: new Date().toISOString(),
  };
}

async function scrapeTicketyetu(): Promise<EventRow[]> {
  console.log('Ticketyetu...');
  const pages = ['https://ticketyetu.com/', 'https://ticketyetu.com/events'];
  const links = new Set<string>();
  for (const p of pages) {
    const html = await getHtml(p);
    if (!html) continue;
    for (const m of html.matchAll(/(?:href=["']|["'])(\/events\/[a-z0-9][a-z0-9-]*-[A-Za-z0-9_-]{5,8})(?=["'\\?#])/g)) {
      links.add('https://ticketyetu.com' + m[1]);
    }
    const apis = [...new Set([...html.matchAll(/(?:https?:\/\/[^"'\s<>)\\]+)?\/(?:api|_next\/data)[^"'\s<>)\\]*/g)].map((m) => m[0]))];
    console.log(`  ${p} html ${html.length}; api-like: ${apis.slice(0, 6).join(' | ')}`);
  }
  console.log(`  found ${links.size} event links`);
  // Diagnostic: find API endpoints inside the site's JS bundles
  const home = (await getHtml('https://ticketyetu.com/')) || '';
  const chunks = [...new Set([...home.matchAll(/\/_next\/static\/[^"'\s]+\.js/g)].map((m) => m[0]))].slice(0, 30);
  const found = new Set<string>();
  for (const c of chunks) {
    const js = await getHtml('https://ticketyetu.com' + c);
    if (!js) continue;
    for (const m of js.matchAll(/https?:\/\/[a-z0-9.-]*(?:api|backend|server)[a-z0-9.\/_-]*/gi)) found.add(m[0]);
    for (const m of js.matchAll(/["'`](\/api\/[a-zA-Z0-9\/_-]+)["'`]/g)) found.add(m[1]);
  }
  console.log(`  chunks scanned ${chunks.length}; endpoints: ${[...found].slice(0, 12).join(' | ')}`);
  const rows: EventRow[] = [];
  for (const url of links) {
    const r = await scrapeEventPage('ticketyetu', url);
    if (r) rows.push(r);
  }
  return rows;
}

async function scrapeSolfest(): Promise<EventRow[]> {
  console.log('Solfest...');
  const base = 'https://solfest.hustlesasa.shop';
  const html = await getHtml(base + '/');
  if (!html) return [];
  const links = new Set<string>();
  for (const m of html.matchAll(/href=["'](\/(?:event|events|product)s?\/[^"'#?]+)["']/g)) links.add(base + m[1]);
  console.log(`  found ${links.size} event links; html ${html.length}`);
  const hrefs = [...new Set([...html.matchAll(/href=["']([^"']+)["']/g)].map((m) => m[1]))].filter((h) => !/logos|_next\/static|facebook|instagram|x\.com|twitter|youtube/.test(h));
  console.log('  hrefs:', hrefs.slice(0, 15).join(' | '));
  const apis = [...new Set([...html.matchAll(/https?:\/\/[^"'\s<>)\\]*(?:api|graphql|firebase|firestore)[^"'\s<>)\\]*/gi)].map((m) => m[0]))];
  console.log('  api-like:', apis.slice(0, 8).join(' | '));
  const rows: EventRow[] = [];
  for (const url of links) {
    const r = await scrapeEventPage('solfest', url);
    if (r) rows.push(r);
  }
  return rows;
}

async function main() {
  const all = [
    ...(await scrapeMadfun()),
    ...(await scrapeTicketyetu()),
  ];
  const now = Date.now() - 6 * 3600 * 1000;
  const fresh = all.filter((e) => new Date(e.start_at).getTime() >= now && isKenya(`${e.venue} ${e.address}`));
  console.log(`Scraped ${all.length}, upcoming Kenya: ${fresh.length}`);

  // Link to a known spot by venue name (exact, case-insensitive)
  const { data: spots } = await supabase.from('unclaimedspots').select('name, google_place_id');
  const byName = new Map((spots || []).map((s: any) => [String(s.name).toLowerCase(), s.google_place_id]));

  let saved = 0;
  for (const e of fresh) {
    const place_id = e.venue ? byName.get(e.venue.toLowerCase()) ?? null : null;
    const { error } = await supabase
      .from('external_events')
      .upsert({ ...e, place_id }, { onConflict: 'source,source_url' });
    if (error) console.log('  ! upsert failed', e.title, error.message);
    else saved++;
  }
  console.log(`Done. Upserted ${saved} events.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
