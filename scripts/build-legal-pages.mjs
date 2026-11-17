// Turns src/data/legal.json into plain web pages in public/ so the Terms and Privacy Policy
// have their own web addresses (needed for sign-in providers, app stores and Safaricom Daraja).
// Runs automatically before `npm run build`. Edit the text in src/data/legal.json, never the HTML.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legal = JSON.parse(fs.readFileSync(path.join(root, 'src/data/legal.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const PAGES = { terms: 'terms.html', privacy: 'privacy.html', guidelines: 'guidelines.html', merchant: 'merchant-terms.html' };
const NAMES = { terms: 'Terms of Use', privacy: 'Privacy Policy', guidelines: 'Community Guidelines', merchant: 'Merchant Terms' };

function page(key) {
  const doc = legal.docs[key];
  const op = legal.operator && legal.operator.name
    ? `<p class="op">Run by ${esc(legal.operator.name)}${legal.operator.address ? ', ' + esc(legal.operator.address) : ''}.</p>` : '';
  const body = [
    op,
    ...doc.intro.map((t) => `<p>${esc(t)}</p>`),
    doc.sections.map((s) =>
      `<section><h2>${esc(s.h)}</h2>` +
      (s.p || []).map((t) => `<p>${esc(t)}</p>`).join('') +
      (s.li ? `<ul>${s.li.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '') +
      `</section>`).join('\n'),
  ].join('\n');
  const nav = Object.keys(PAGES).map((k) => `<a href="/${PAGES[k]}"${k === key ? ' aria-current="page"' : ''}>${esc(NAMES[k])}</a>`).join(' · ');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(doc.title)} | RADA</title>
<meta name="description" content="${esc(doc.title)} for RADA, the Nairobi app for spots, events and outings.">
<meta name="color-scheme" content="light dark">
<link rel="icon" type="image/png" href="/favicon.png">
<style>
:root{--bg:#fff;--fg:#1c1917;--muted:#57534e;--brand:#E05328;--line:#e7e5e4}
@media (prefers-color-scheme:dark){:root{--bg:#171412;--fg:#f5f5f4;--muted:#a8a29e;--brand:#ff7a55;--line:#292524}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:720px;margin:0 auto;padding:24px 20px 64px}
header a.logo{font-weight:900;font-size:22px;color:var(--brand);text-decoration:none;letter-spacing:.02em}
h1{font-size:28px;margin:20px 0 4px}
h2{font-size:18px;margin:28px 0 6px}
p,li{color:var(--fg)}.meta,.op{color:var(--muted);font-size:13px}
ul{padding-left:20px}
nav{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);font-size:14px;color:var(--muted)}
a{color:var(--brand)}
</style>
</head>
<body>
<main>
<header><a class="logo" href="/">RADA</a></header>
<h1>${esc(doc.title)}</h1>
<p class="meta">Version ${esc(legal.version)} · Questions: <a href="mailto:${esc(legal.support_email)}">${esc(legal.support_email)}</a></p>
${body}
<nav>${nav}</nav>
</main>
</body>
</html>
`;
}

for (const key of Object.keys(PAGES)) {
  fs.writeFileSync(path.join(root, 'public', PAGES[key]), page(key));
}
console.log('Legal pages written:', Object.values(PAGES).map((f) => '/' + f).join(', '));
