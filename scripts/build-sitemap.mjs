// Writes public/sitemap.xml and the Sitemap line in public/robots.txt from VITE_PUBLIC_URL.
// Runs automatically before `npm run build`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fromFile = '';
for (const f of ['.env.local', '.env']) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  const m = fs.readFileSync(p, 'utf8').match(/^VITE_PUBLIC_URL\s*=\s*(.+)$/m);
  if (m) { fromFile = m[1].trim().replace(/^["']|["']$/g, ''); break; }
}
const base = String(process.env.VITE_PUBLIC_URL || fromFile || 'https://rada2026-omega.vercel.app').replace(/\/+$/, '');
const legal = JSON.parse(fs.readFileSync(path.join(root, 'src/data/legal.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);

// Only pages that exist as real addresses. The app itself is one page behind a sign-in.
const urls = [
  ['/', 'weekly', '1.0'],
  ['/privacy', 'yearly', '0.3'],
  ['/terms', 'yearly', '0.3'],
  ['/guidelines', 'yearly', '0.3'],
  ['/merchant-terms', 'yearly', '0.2'],
];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([p, f, pr]) => `  <url><loc>${base}${p}</loc><lastmod>${today}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(root, 'public/sitemap.xml'), xml);
fs.writeFileSync(path.join(root, 'public/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
console.log(`build-sitemap: ${urls.length} addresses for ${base}`);
