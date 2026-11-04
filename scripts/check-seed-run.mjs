// Verifies one seed run against the "at least N spots per place" gate and prints a verdict
// table into the GitHub job summary.
//
// Usage: node scripts/check-seed-run.mjs <seed-runs/....json> [minSpotsPerPlace=15]
//
// Exit codes
//   0  every place received at least one spot (shortfalls are reported as warnings)
//   1  a place received nothing at all (the write failed), or the log had no usable summary
//
// A place that received SOME spots but fewer than the target is a supply problem — Google had
// too few qualifying places for that search — not a write failure. That is a warning, so a run
// that genuinely saved spots is not reported as broken.
import fs from 'node:fs';

const [file, minArg] = process.argv.slice(2);
const MIN = Number(minArg) || 15;

if (!file) {
  console.error('Usage: node scripts/check-seed-run.mjs <seed-runs/....json> [minSpotsPerPlace]');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`Could not read the run log ${file}: ${e.message}`);
  process.exit(1);
}

const rows = Array.isArray(data.summary) ? data.summary : [];
if (!rows.length) {
  console.error('The run log has no per-place summary, so there is nothing to verify.');
  process.exit(1);
}

// One line per place (an area can appear once per category searched).
const places = [];
for (const row of rows) {
  let place = places.find((p) => p.area === row.area);
  if (!place) {
    place = { area: row.area, category: row.category, saved: 0, alreadyInDb: 0, qualified: 0 };
    places.push(place);
  }
  place.saved += Number(row.new) || 0;
  place.alreadyInDb += Number(row.alreadyInDb) || 0;
  place.qualified += Number(row.qualified) || 0;
}

const total = places.reduce((sum, p) => sum + p.saved, 0);
const categories = Array.isArray(data.categories) ? data.categories.join(', ') : (data.categories || 'unknown');

const lines = [
  '',
  '### Result: spots saved per place',
  '',
  `Category **${categories}** · target **${MIN}** per place · ${data.ranAt ? `ran ${data.ranAt}` : 'live run'}`,
  '',
  `| Place | Category | Qualified | Already in DB | Saved | Gate (>= ${MIN}) |`,
  '|---|---|---|---|---|---|',
];
for (const p of places) {
  lines.push(`| ${p.area} | ${p.category} | ${p.qualified} | ${p.alreadyInDb} | ${p.saved} | ${p.saved >= MIN ? 'PASS' : p.saved > 0 ? 'below target' : 'NOTHING SAVED'} |`);
}
lines.push('', `**Total saved: ${total}** across ${places.length} place(s).`);
const markdown = lines.join('\n');

if (process.env.GITHUB_STEP_SUMMARY) {
  try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + '\n'); } catch { /* summary is best-effort */ }
}
console.log(markdown);

const empty = places.filter((p) => p.saved === 0).map((p) => p.area);
const short = places.filter((p) => p.saved > 0 && p.saved < MIN).map((p) => `${p.area} (${p.saved})`);

if (short.length) {
  console.log(`::warning title=Short of the ${MIN}-per-place target::${short.join(', ')} — saved, but below ${MIN}. That is how many qualifying places Google returned, not a write failure.`);
}
if (empty.length) {
  console.error(`::error title=Nothing saved::No spots were written for: ${empty.join(', ')}.`);
  process.exit(1);
}
console.log(`OK: every place received spots (${total} total).`);
