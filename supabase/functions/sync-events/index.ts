import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * sync-events: reads Mookh, Ticketsasa, Tikiti and mTickets and keeps public.external_events fresh.
 * Protected by the same key as seed-cinemas (SEED_CINEMAS_KEY). Add dry=1 to preview without saving.
 * Existing rows keep their category, tags, place and description. Only title, venue, price, image,
 * time and scraped_at are refreshed. Past events are removed by cleanup_past_listings().
 */

const UA = "Mozilla/5.0 (compatible; RADA-events/1.0)";
const ALLOWED = ["ticketsasa.com", "mookh.com", "tikiti.co.ke", "mtickets.com"];
const TIKITI_PAGES = 30;
const TICKETSASA_IMAGE_FETCHES = 10;
const MTICKETS_IMAGE_COPIES = 20;

type Ev = {
  source: string; source_url: string; title: string; category: string | null; rada_category: string;
  start_at: string; end_at: string | null; has_time: boolean; venue: string | null; image_url: string | null;
  price_min: number | null; currency: string | null; country: string | null;
};

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string): Promise<string> {
  const r = await fetch(url, { headers: { "user-agent": UA, "accept-language": "en" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return await r.text();
}

function decode(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const p2 = (n: number) => String(n).padStart(2, "0");

/** Nairobi time (UTC+3, no daylight saving). */
function nairobi(y: number, mo: number, d: number, h = 0, mi = 0): string {
  return new Date(`${y}-${p2(mo)}-${p2(d)}T${p2(h)}:${p2(mi)}:00+03:00`).toISOString();
}

const LABELS: Record<string, string> = {
  concerts: "Concerts & Live Music", nightlife: "Nightlife & Parties", arts: "Arts & Culture", community: "Community & Social",
  sports: "Sports & Fitness", business: "Business & Networking", food: "Food & Drink", family: "Family & Kids",
  outdoors: "Outdoors & Adventure", fashion: "Fashion", charity: "Charity", faith: "Faith & Spirituality",
};

function guessCategory(text: string): string {
  const t = text.toLowerCase();
  const has = (re: RegExp) => re.test(t);
  if (has(/charity|fundrais|cancer|autism|awareness|donat/)) return "charity";
  if (has(/church|gospel|worship|praise|prayer|crusade|revival/)) return "faith";
  if (has(/marathon|\brun\b|race|tournament|football|rugby|golf|\bcup\b|fitness|yoga|workout|bootcamp/)) return "sports";
  if (has(/hike|camp|safari|outdoor|trail|adventure|picnic/)) return "outdoors";
  if (has(/kids|children|family|toddler/)) return "family";
  if (has(/fashion|runway|style show|model/)) return "fashion";
  if (has(/conference|summit|network|business|expo|workshop|masterclass|career|startup|forum|seminar/)) return "business";
  if (has(/food|wine|whisky|whiskey|taste|dinner|brunch|bbq|nyama|cocktail|beer|coffee/)) return "food";
  if (has(/comedy|theatre|theater|art\b|film|exhibit|poetry|gallery|stand-?up|dance show|opera/)) return "arts";
  if (has(/party|club|rave|afro|amapiano|ladies night|\bdj\b|after ?party|vibe|bash|\bnight\b/)) return "nightlife";
  if (has(/concert|live|festival|tour|music|gig|band|sessions|unplugged|jazz|gospel/)) return "concerts";
  return "community";
}

function countryFromCurrency(c: string | null): string | null {
  if (!c) return "KE";
  return ({ KES: "KE", UGX: "UG", TZS: "TZ", RWF: "RW", ETB: "ET" } as Record<string, string>)[c.toUpperCase()] ?? null;
}
function countryFromName(n: string | null): string | null {
  if (!n) return "KE";
  const m = n.toLowerCase();
  if (m.includes("kenya")) return "KE";
  if (m.includes("uganda")) return "UG";
  if (m.includes("tanzania")) return "TZ";
  if (m.includes("rwanda")) return "RW";
  return null;
}
function priceNum(s: string | null): number | null {
  if (!s) return null;
  if (/free/i.test(s)) return 0;
  const m = s.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

// ---------------- Tikiti ----------------
async function scrapeTikiti(): Promise<Ev[]> {
  const out: Ev[] = [];
  for (let page = 1; page <= TIKITI_PAGES; page++) {
    const html = await get(page === 1 ? "https://tikiti.co.ke/" : `https://tikiti.co.ke/?page=${page}`);
    const parts = html.split('<a href="https://tikiti.co.ke/e/').slice(1);
    if (!parts.length) break;
    for (const chunk of parts) {
      const slug = chunk.slice(0, chunk.indexOf('"'));
      const title = decode((chunk.match(/<h3[^>]*>([^<]*)<\/h3>/) || [])[1] || "");
      const date = (chunk.match(/fa-calendar-days[^>]*><\/i>\s*<span>([^<]+)<\/span>/) || [])[1] || "";
      const dm = date.match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})/);
      if (!slug || !title || !dm || !MONTHS[dm[1].toLowerCase()]) continue;
      const venue = decode((chunk.match(/fa-location-dot[\s\S]*?<span[^>]*>([^<]+)<\/span>/) || [])[1] || "") || null;
      const img = (chunk.match(/<img src="([^"]+)"/) || [])[1] || null;
      const priceText = (chunk.match(/<span class="font-semibold text-ink-900">([^<]+)<\/span>/) || [])[1] || null;
      const rc = guessCategory(title);
      out.push({
        source: "tikiti", source_url: `https://tikiti.co.ke/e/${slug}`, title, category: LABELS[rc], rada_category: rc,
        start_at: nairobi(Number(dm[3]), MONTHS[dm[1].toLowerCase()], Number(dm[2])), end_at: null, has_time: false,
        venue, image_url: img, price_min: priceNum(priceText), currency: "KES", country: "KE",
      });
    }
    await sleep(300);
  }
  return out;
}

// ---------------- Ticketsasa ----------------
async function scrapeTicketsasa(): Promise<Ev[]> {
  const html = await get("https://www.ticketsasa.com/events");
  const parts = html.split('class="pt-4 event-date"').slice(1);
  const out: Ev[] = [];
  for (const raw of parts) {
    const chunk = raw.slice(0, 1800);
    const dt = (chunk.match(/>([^<]+)<\/p>/) || [])[1] || "";
    const dm = dt.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    const link = chunk.match(/<a href="\/events\/([^"]+)"[^>]*title="([^"]*)"/);
    if (!dm || !link || !MONTHS[dm[2].toLowerCase()]) continue;
    let h = Number(dm[4]) % 12;
    if (dm[6].toUpperCase() === "PM") h += 12;
    const venue = decode((chunk.match(/event-location"[^>]*title="([^"]*)"/) || [])[1] || "") || null;
    const priceM = chunk.match(/tkt-price[^>]*>([^<]*)</);
    const priceText = priceM ? priceM[1] : null;
    const cur = priceText ? (priceText.match(/\b([A-Z]{3})\b/) || [])[1] || null : null;
    const title = decode(link[2]);
    const rc = guessCategory(title);
    out.push({
      source: "ticketsasa", source_url: `https://www.ticketsasa.com/events/${link[1]}`, title, category: LABELS[rc], rada_category: rc,
      start_at: nairobi(Number(dm[3]), MONTHS[dm[2].toLowerCase()], Number(dm[1]), h, Number(dm[5])), end_at: null, has_time: true,
      venue, image_url: null, price_min: priceNum(priceText), currency: cur || "KES",
      country: cur ? countryFromCurrency(cur) : (venue && /uganda/i.test(venue) ? "UG" : "KE"),
    });
  }
  return out;
}

// ---------------- Mookh ----------------
async function scrapeMookh(): Promise<Ev[]> {
  const raw = await get("https://mookh.com/");
  const html = raw.replace(/\\"/g, '"');
  const re = /"slug":"([^"]+)","title":"((?:[^"\\]|\\.)*)","startDate":"([^"]+)"/g;
  const hits: { i: number; slug: string; title: string; start: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) hits.push({ i: m.index, slug: m[1], title: m[2], start: m[3] });
  const out: Ev[] = [];
  const seen = new Set<string>();
  for (let k = 0; k < hits.length; k++) {
    const h = hits[k];
    if (seen.has(h.slug)) continue;
    seen.add(h.slug);
    const win = html.slice(h.i, Math.min(hits[k + 1]?.i ?? h.i + 3000, h.i + 3000));
    const str = (key: string) => {
      const x = win.match(new RegExp(`"${key}":"((?:[^"\\\\]|\\\\.)*)"`));
      return x && x[1] !== "$undefined" ? x[1] : null;
    };
    const start = new Date(h.start);
    if (isNaN(start.getTime())) continue;
    const free = /"isFreeEvent":true/.test(win);
    const lp = win.match(/"lowestPaidPrice":(\d+(?:\.\d+)?)/);
    const macro = (win.match(/"macroCategory":\{"id":"[^"]*","name":"([^"]*)"/) || [])[1] || "";
    const title = decode(h.title);
    const rc = guessCategory(`${title} ${macro}`);
    out.push({
      source: "mookh", source_url: `https://mookh.com/${h.slug}/`, title, category: LABELS[rc], rada_category: rc,
      start_at: start.toISOString(), end_at: null, has_time: true,
      venue: decode(str("venueName") || "") || null, image_url: str("featuredImage"),
      price_min: free ? 0 : lp ? Number(lp[1]) : null, currency: str("currency") || "KES",
      country: countryFromName(str("venueCountry")),
    });
  }
  return out;
}

// ---------------- mTickets ----------------
// Public JSON feed used by mtickets.com itself. Poster links are signed and expire after an hour,
// so new posters are copied into our own public bucket (see mirrorPoster) and the signed link is never stored.
async function scrapeMtickets(): Promise<Ev[]> {
  const raw = await get("https://mtickets.com/api/v1/events/all-events/?page_size=200");
  const data = JSON.parse(raw);
  const list: any[] = Array.isArray(data?.events) ? data.events : [];
  const out: Ev[] = [];
  for (const x of list) {
    if (!x || x.active === false || x.visible === false || !x.slug || !x.name || !x.starts_at) continue;
    const m = String(x.starts_at).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (!m) continue;
    const hasTime = !!x.time || (m[4] !== undefined && !(m[4] === "00" && m[5] === "00"));
    const city = x.venue?.city ? String(x.venue.city).toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : "";
    const vname = decode(String(x.venue?.name || ""));
    const venue = vname ? (city && !vname.toLowerCase().includes(city.toLowerCase()) ? `${vname}, ${city}` : vname) : (city || null);
    const title = decode(String(x.name));
    const catCode = String(x.category?.code || "");
    const rc = catCode === "sports" ? "sports" : guessCategory(title);
    const price = x.price_from && typeof x.price_from.amount === "number" ? x.price_from.amount : null;
    out.push({
      source: "mtickets", source_url: `https://mtickets.com/${x.slug}/`, title, category: LABELS[rc], rada_category: rc,
      start_at: nairobi(Number(m[1]), Number(m[2]), Number(m[3]), m[4] ? Number(m[4]) : 0, m[5] ? Number(m[5]) : 0),
      end_at: null, has_time: hasTime, venue,
      image_url: x.images?.poster || x.images?.banner || null,
      price_min: price, currency: x.price_from?.currency || x.currency || "KES",
      country: countryFromName(x.venue?.country || null),
    });
  }
  return out;
}

async function mirrorPoster(sb: any, src: string, key: string): Promise<string | null> {
  try {
    const r = await fetch(src, { headers: { "user-agent": UA } });
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const ext = ct === "image/png" ? "png" : ct === "image/webp" ? "webp" : ct === "image/jpeg" ? "jpg" : null;
    if (!ext) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length === 0 || buf.length > 5 * 1024 * 1024 - 2048) return null;
    const path = `events/mtickets/${key.replace(/[^A-Za-z0-9_-]/g, "")}.${ext}`;
    const { error } = await sb.storage.from("rada-media").upload(path, buf, { contentType: ct, upsert: true, cacheControl: "31536000" });
    if (error) return null;
    return sb.storage.from("rada-media").getPublicUrl(path).data.publicUrl as string;
  } catch {
    return null;
  }
}

async function ticketsasaImage(url: string): Promise<string | null> {
  try {
    const html = await get(url);
    return (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1] || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o, null, 2), { status, headers: { "content-type": "application/json" } });
  const SECRET = Deno.env.get("SEED_CINEMAS_KEY");
  if (!SECRET || SECRET.length < 16) return json({ error: "disabled: set the SEED_CINEMAS_KEY secret" }, 503);
  if (!same(url.searchParams.get("key") || "", SECRET)) return json({ error: "unauthorized" }, 401);

  // Maintenance helper: look inside a page from an allowed site (needs the key).
  const target = url.searchParams.get("debug");
  if (target) {
    let host = "";
    try { host = new URL(target).hostname.replace(/^www\./, ""); } catch { return json({ error: "bad url" }, 400); }
    if (!ALLOWED.some((d) => host === d || host.endsWith("." + d))) return json({ error: "host not allowed" }, 400);
    try {
      const text = await get(target);
      const find = url.searchParams.get("find");
      if (find) {
        const ctx = Math.min(Number(url.searchParams.get("ctx") || 300), 1500);
        const max = Math.min(Number(url.searchParams.get("max") || 4), 10);
        const skip = Number(url.searchParams.get("skip") || 0);
        const rx = new RegExp(find, "g");
        const outm: string[] = [];
        let mm: RegExpExecArray | null; let n = 0;
        while ((mm = rx.exec(text)) && outm.length < max) { if (n++ < skip) continue; outm.push(text.slice(Math.max(0, mm.index - ctx), mm.index + mm[0].length + ctx)); }
        return json({ length: text.length, matches: outm });
      }
      const from = Number(url.searchParams.get("from") || 0);
      return json({ length: text.length, snippet: text.slice(from, from + Math.min(Number(url.searchParams.get("len") || 3000), 20000)) });
    } catch (e) { return json({ error: String((e as Error).message || e) }, 502); }
  }

  const dry = url.searchParams.get("dry") === "1";
  const only = url.searchParams.get("only");
  const report: Record<string, unknown> = { dry };
  const all: Ev[] = [];
  const scrapers: [string, () => Promise<Ev[]>][] = [["tikiti", scrapeTikiti], ["ticketsasa", scrapeTicketsasa], ["mookh", scrapeMookh], ["mtickets", scrapeMtickets]];
  for (const [name, fn] of scrapers) {
    if (only && only !== name) continue;
    try {
      const evs = await fn();
      all.push(...evs);
      report[name] = { found: evs.length };
    } catch (e) {
      report[name] = { error: String((e as Error).message || e) };
    }
  }

  // Skip events that are already over (same rule as the nightly cleanup: 24 hours after), and any repeats.
  const cutoff = Date.now() - 24 * 3600 * 1000;
  const byUrl = new Map<string, Ev>();
  for (const e of all) if (new Date(e.start_at).getTime() >= cutoff && !byUrl.has(e.source_url)) byUrl.set(e.source_url, e);
  const fresh = [...byUrl.values()];

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const urls = fresh.map((e) => e.source_url);
  const existing = new Map<string, { has_time: boolean; image_url: string | null }>();
  for (let i = 0; i < urls.length; i += 100) {
    const { data } = await sb.from("external_events").select("source_url,has_time,image_url").in("source_url", urls.slice(i, i + 100));
    for (const r of data || []) existing.set(r.source_url, { has_time: r.has_time, image_url: r.image_url });
  }

  // Ticketsasa list pages show placeholder pictures, so fetch the real one for new events only.
  let imgFetches = 0;
  if (!dry) {
    for (const e of fresh) {
      if (e.source === "ticketsasa" && !existing.has(e.source_url) && imgFetches < TICKETSASA_IMAGE_FETCHES) {
        imgFetches++;
        e.image_url = await ticketsasaImage(e.source_url);
        await sleep(300);
      }
    }

    // mTickets poster links expire after an hour: copy each poster into our own bucket, never store the signed link.
    let copies = 0;
    for (const e of fresh) {
      if (e.source !== "mtickets" || !e.image_url) continue;
      const prev = existing.get(e.source_url);
      if (prev && prev.image_url) { e.image_url = null; continue; } // already has a saved poster
      if (copies >= MTICKETS_IMAGE_COPIES) { e.image_url = null; continue; }
      copies++;
      const key = e.source_url.replace(/^https:\/\/mtickets\.com\//, "").replace(/\/$/, "");
      e.image_url = await mirrorPoster(sb, e.image_url, key);
    }
  }

  const fresh_new = fresh.filter((e) => !existing.has(e.source_url));
  const fresh_old = fresh.filter((e) => existing.has(e.source_url));
  report.summary = { found: all.length, skipped_past: all.length - fresh.length, new: fresh_new.length, existing: fresh_old.length };

  if (dry) {
    report.sample_new = fresh_new.slice(0, 6).map((e) => ({ source: e.source, title: e.title, start_at: e.start_at, has_time: e.has_time, venue: e.venue, price: e.price_min, cur: e.currency, country: e.country, cat: e.rada_category, img: e.image_url ? e.image_url.slice(0, 60) : null }));
    return json(report);
  }

  let inserted = 0, updated = 0; const errors: string[] = [];
  for (let i = 0; i < fresh_new.length; i += 50) {
    const { error } = await sb.from("external_events").insert(fresh_new.slice(i, i + 50).map((e) => ({ ...e, scraped_at: new Date().toISOString() })));
    if (error) errors.push(error.message); else inserted += Math.min(50, fresh_new.length - i);
  }
  for (const e of fresh_old) {
    const prev = existing.get(e.source_url)!;
    const patch: Record<string, unknown> = { title: e.title, venue: e.venue, price_min: e.price_min, currency: e.currency, scraped_at: new Date().toISOString() };
    if (e.image_url && !prev.image_url) patch.image_url = e.image_url;
    // Do not overwrite an exact time with a date-only value.
    if (e.has_time || !prev.has_time) { patch.start_at = e.start_at; patch.has_time = e.has_time; }
    const { error } = await sb.from("external_events").update(patch).eq("source_url", e.source_url);
    if (error) errors.push(error.message); else updated++;
  }
  report.result = { inserted, updated, errors };
  return json(report);
});
