// Prints the RADA spot category that today's seed run should fill.
//
// The seed pipeline must "always alternate between the app's categories". This rotates
// exactly one category per UTC day through the 17 categories defined in
// src/lib/spotCategories.ts (SPOT_CATEGORIES), in the same order the app shows them.
// Because the choice is derived from the UTC day number it is deterministic: a scheduled
// run and a retry re-dispatched later the same UTC day pick up the SAME category, so a
// failed run is retried rather than skipped ahead.
//
// Usage:
//   node scripts/seed-next-category.mjs              -> today's category (plain label)
//   node scripts/seed-next-category.mjs --date=2026-11-05
//   node scripts/seed-next-category.mjs --index      -> just the rotation index
//   node scripts/seed-next-category.mjs --all        -> every category, one per line
//   node scripts/seed-next-category.mjs --json       -> { index, category, next, total }
//
// The labels below MUST stay character-identical to `label` in src/lib/spotCategories.ts,
// because seed-spots.mjs maps each label to a Google Maps search term and writes the label
// straight into the `category` column of `unclaimedspots`.

const CATEGORIES = [
  'Restaurants',
  'Hotels & Stays',
  'Clubs & Lounges',
  'Cafes & Bakeries',
  'Date Spots',
  'Outdoors & Nature',
  'Sports & Adventure',
  'Fast Food',
  'Getaways & Resorts',
  'Bars & Chill Spots',
  'Arts & Culture',
  'Gaming & Arcades',
  'Garden Hangouts',
  'Nyama Choma & Grills',
  'Rooftops',
  'Hangouts & Leisure',
  'Desserts & Ice Cream',
];

const arg = (name) => process.argv.slice(2).find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const DAY_MS = 86400000;

let now = Date.now();
const dateArg = arg('date');
if (dateArg) {
  const value = dateArg.includes('=') ? dateArg.split('=')[1] : '';
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed)) {
    console.error(`Bad --date value "${value}". Use YYYY-MM-DD.`);
    process.exit(1);
  }
  now = parsed;
}

const dayNumber = Math.floor(now / DAY_MS);
const total = CATEGORIES.length;
const index = ((dayNumber % total) + total) % total;
const category = CATEGORIES[index];
const next = CATEGORIES[(index + 1) % total];

if (arg('all')) {
  console.log(CATEGORIES.join('\n'));
} else if (arg('index')) {
  console.log(String(index));
} else if (arg('json')) {
  console.log(JSON.stringify({ index, category, next, total }, null, 2));
} else {
  // Nothing but the label on stdout: the workflow captures this straight into an env var.
  console.log(category);
}
