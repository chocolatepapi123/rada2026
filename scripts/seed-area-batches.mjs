// Prints the places in scripts/seed-areas.json as AREAS strings, one line per run (the seeder takes at most 8 places per run).
//   node scripts/seed-area-batches.mjs            -> every batch
//   AREAS_FILTER="Karen,Gigiri" node ...          -> only those labels
import fs from 'node:fs';
const all = JSON.parse(fs.readFileSync(new URL('./seed-areas.json', import.meta.url), 'utf8'));
const only = (process.env.AREAS_FILTER || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
const areas = only.length ? all.filter((a) => only.includes(a.label.toLowerCase())) : all;
if (!areas.length) { console.error('No matching places in seed-areas.json'); process.exit(1); }
for (let i = 0; i < areas.length; i += 8) {
  console.log(areas.slice(i, i + 8).map((a) => [a.query, a.label, a.geo].join('|')).join(';'));
}
