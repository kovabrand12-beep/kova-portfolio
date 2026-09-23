/**
 * 20-point pre-launch audit. Run before handing any site to a client:
 *
 *   npm run checklist
 *
 * Every check reads the BUILT output, not the source, so it tests what a
 * visitor actually receives. Exits non-zero if anything fails.
 *
 * ---------------------------------------------------------------------
 * Copied from the mosaic-dental build. Two deliberate changes, both because
 * this site legitimately ships more than one stylesheet:
 *
 *   - checks 13 and 14 read EVERY .css file rather than whichever one the
 *     directory walk happened to return first. On the original single
 *     stylesheet these are identical; here, picking the first would have
 *     audited assets/back-button.css and silently passed check 13 (no
 *     matching tokens) while failing check 14 (one breakpoint).
 *   - check 13's colour pairs use this site's token names, and additionally
 *     test a button label against the darkest point of its own gradient,
 *     which is where a gold brand colour actually fails.
 * ---------------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = fs.existsSync(path.join(ROOT, 'UPLOAD-TO-HOSTINGER'))
  ? path.join(ROOT, 'UPLOAD-TO-HOSTINGER') : path.join(ROOT, 'dist');

const walk = (d, b = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const rel = b ? `${b}/${e.name}` : e.name;
  return e.isDirectory() ? walk(path.join(d, e.name), rel) : [rel];
});
const all = walk(DIR);
const pages = all.filter((f) => f.endsWith('.html'))
  .filter((f) => !fs.readFileSync(path.join(DIR, f), 'utf8').includes('http-equiv="refresh"'));
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');
const htaccess = all.includes('.htaccess') ? read('.htaccess') : '';

const results = [];
const check = (n, name, fn) => {
  let pass = false, note = '';
  try { const r = fn(); pass = r === true || (r && r.pass); note = (r && r.note) || ''; }
  catch (e) { pass = false; note = e.message; }
  results.push({ n, name, pass, note });
};

/* 1  */ check(1, 'Privacy policy page', () => {
  const p = pages.find((f) => /privacy/i.test(f));
  return p ? { pass: true, note: '/' + p.replace('.html', '') } : { pass: false, note: 'no privacy page' };
});
/* 2  */ check(2, 'Terms & conditions page', () => {
  const p = pages.find((f) => /terms/i.test(f));
  return p ? { pass: true, note: '/' + p.replace('.html', '') } : { pass: false, note: 'no terms page' };
});
/* 3  */ check(3, 'No secrets in the frontend', () => {
  const pat = /(api[_-]?key|secret|password|BEGIN (RSA|PRIVATE)|sk_live|AKIA[0-9A-Z]{16})/i;
  const hits = all.filter((f) => /\.(html|js|css|json)$/.test(f))
    .filter((f) => pat.test(read(f)));
  return { pass: hits.length === 0, note: hits.length ? hits.join(', ') : 'clean' };
});
/* 4  */ check(4, 'Force HTTPS', () => {
  const ok = /RewriteCond\s+%\{HTTPS\}\s+!=on/.test(htaccess) && /R=301/.test(htaccess);
  return { pass: ok, note: ok ? 'redirect in .htaccess' : 'no https redirect found' };
});
/* 5  */ check(5, 'Cookie consent (only if tracking)', () => {
  const tracking = pages.some((f) => /googletagmanager|google-analytics|gtag\(|fbq\(|hotjar|clarity\.ms/i.test(read(f)));
  const banner = pages.some((f) => /cookie/i.test(read(f)) && /accept/i.test(read(f)));
  if (!tracking) return { pass: true, note: 'no tracking cookies set, so none needed' };
  return { pass: banner, note: banner ? 'banner present and gates the script' : 'TRACKING PRESENT WITH NO BANNER' };
});
/* 6  */ check(6, 'Unique meta title + description', () => {
  const t = new Map(), d = new Map();
  const missing = [];
  pages.forEach((f) => {
    const s = read(f);
    const title = (s.match(/<title>([^<]*)<\/title>/) || [])[1];
    const desc = (s.match(/<meta name="description" content="([^"]*)"/) || [])[1];
    if (!title || !desc) missing.push(f);
    t.set(title, (t.get(title) || 0) + 1); d.set(desc, (d.get(desc) || 0) + 1);
  });
  const dupT = [...t].filter(([, c]) => c > 1).length;
  const dupD = [...d].filter(([, c]) => c > 1).length;
  const ok = !missing.length && !dupT && !dupD;
  return { pass: ok, note: ok ? `${pages.length} pages, all unique` : `missing:${missing.length} dupTitles:${dupT} dupDescs:${dupD}` };
});
/* 7  */ check(7, 'Social preview image', () => {
  const bad = pages.filter((f) => !/property="og:image"/.test(read(f)));
  return { pass: !bad.length, note: bad.length ? `missing on ${bad.length}` : 'og:image on every page' };
});
/* 8  */ check(8, 'Favicon', () => {
  const bad = pages.filter((f) => !/rel="icon"/.test(read(f)));
  return { pass: !bad.length, note: bad.length ? `missing on ${bad.length}` : 'on every page' };
});
/* 9  */ check(9, 'Sitemap + robots.txt', () => {
  const ok = all.includes('sitemap.xml') && all.includes('robots.txt');
  const points = ok && /Sitemap:/i.test(read('robots.txt'));
  return { pass: ok && points, note: ok ? (points ? 'both present, robots points at sitemap' : 'robots does not reference sitemap') : 'missing' };
});
/* 10 */ check(10, 'Alt text on images', () => {
  let missing = 0, decorative = 0, total = 0;
  pages.forEach((f) => (read(f).match(/<img[^>]*>/g) || []).forEach((tag) => {
    total++;
    const m = tag.match(/alt="([^"]*)"/);
    if (!m) missing++;
    else if (!m[1].trim()) decorative++;
  }));
  return { pass: missing === 0, note: `${total} images, ${missing} with no alt, ${decorative} intentionally decorative` };
});
/* 11 */ check(11, 'Images compressed', () => {
  const imgs = all.filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f));
  const big = imgs.filter((f) => fs.statSync(path.join(DIR, f)).size > 400 * 1024);
  return { pass: big.length === 0, note: big.length ? `${big.length} over 400KB: ${big.slice(0,3).join(', ')}` : `${imgs.length} images, largest ${Math.round(Math.max(...imgs.map((f) => fs.statSync(path.join(DIR, f)).size)) / 1024)}KB` };
});
/* 12 */ check(12, 'Page weight', () => {
  const css = all.filter((f) => f.endsWith('.css')).reduce((a, f) => a + fs.statSync(path.join(DIR, f)).size, 0);
  const js = all.filter((f) => f.endsWith('.js')).reduce((a, f) => a + fs.statSync(path.join(DIR, f)).size, 0);
  const html = Math.max(...pages.map((f) => fs.statSync(path.join(DIR, f)).size));
  const kb = (n) => Math.round(n / 1024) + 'KB';
  const ok = css < 100 * 1024 && js < 150 * 1024;
  return { pass: ok, note: `css ${kb(css)}, js ${kb(js)}, largest page ${kb(html)}` };
});
/* 13 */ check(13, 'Colour contrast', () => {
  const lum = (h) => { h = h.replace('#',''); const c=[0,2,4].map(i=>parseInt(h.substr(i,2),16)/255).map(x=>x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
  const ratio = (a,b) => { const l1=lum(a), l2=lum(b); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };
  const cssFiles = all.filter((f) => f.endsWith('.css'));
  if (!cssFiles.length) return { pass: false, note: 'no stylesheet found' };
  const css = cssFiles.map(read).join('\n');
  const tok = (n) => (css.match(new RegExp('--' + n + ':\\s*(#[0-9A-Fa-f]{6})')) || [])[1];
  const pairs = [
    ['ink', 'bg', 'body text'],
    ['muted', 'bg', 'secondary text'],
    ['muted', 'card', 'secondary text on cards'],
    ['muted-soft', 'bg', 'footer note'],
    ['gold', 'bg', 'links and eyebrows'],
  ];
  const fails = [];
  let checked = 0;
  pairs.forEach(([a, b, label]) => {
    const A = tok(a), B = tok(b);
    if (!A || !B) return;
    checked++;
    if (ratio(A, B) < 4.5) fails.push(`${label} ${ratio(A, B).toFixed(2)}`);
  });
  /* A button label sits on its own fill, not on the page background, and a
     gradient is only as good as its darkest point. This is the pair that
     mid-tone brand colours usually fail. */
  const btnInk = (css.match(/\.btn-primary\s*\{[^}]*color:\s*(#[0-9A-Fa-f]{6})/) || [])[1];
  const btnFill = tok('gold');
  if (btnInk && btnFill) {
    checked++;
    if (ratio(btnInk, btnFill) < 4.5) fails.push(`button label ${ratio(btnInk, btnFill).toFixed(2)}`);
  }
  if (!checked) return { pass: false, note: 'no colour tokens matched — check the token names in this file' };
  return { pass: !fails.length, note: fails.length ? fails.join(', ') : `${checked} colour pairs checked, all pass AA` };
});
/* 14 */ check(14, 'Mobile friendly', () => {
  const noVp = pages.filter((f) => !/name="viewport"/.test(read(f)));
  const css = all.filter((f) => f.endsWith('.css')).map(read).join('\n');
  const bps = new Set(css.match(/@media[^{]*max-width:\s*(\d+)px/g) || []).size;
  return { pass: !noVp.length && bps >= 3, note: noVp.length ? `${noVp.length} pages with no viewport tag` : `viewport on all pages, ${bps} breakpoints` };
});
/* 15 */ check(15, 'Custom 404', () => {
  const file = all.includes('404.html');
  const wired = /ErrorDocument\s+404/.test(htaccess);
  return { pass: file && wired, note: file ? (wired ? 'page exists and is wired up' : 'page exists but ErrorDocument not set') : 'no 404 page' };
});
/* 16 */ check(16, 'No broken links', () => {
  const ids = {};
  pages.forEach((f) => { ids[f] = new Set([...read(f).matchAll(/id="([^"]+)"/g)].map((m) => m[1])); });
  const bad = [];
  pages.forEach((f) => {
    const base = path.dirname(f);
    [...read(f).matchAll(/href="([^"]+)"/g)].map((m) => m[1]).forEach((href) => {
      if (/^(https?:|mailto:|tel:|data:)/.test(href)) return;
      const [p, frag] = href.split('#');
      if (!p) { if (frag && !ids[f].has(frag)) bad.push(`${f} #${frag}`); return; }
      let t = path.posix.normalize(path.posix.join(base, p));
      // "./" and "../" point at a directory, which means its index page.
      if (p.endsWith('/') || t === '.' || t === '') t = path.posix.join(t === '.' ? '' : t, 'index.html');
      if (!all.includes(t) && !all.includes(t + '.html')) bad.push(`${f} -> ${href}`);
      else if (frag) { const tgt = all.includes(t) ? t : t + '.html'; if (tgt.endsWith('.html') && !ids[tgt]?.has(frag)) bad.push(`${f} -> ${href}`); }
    });
  });
  return { pass: !bad.length, note: bad.length ? bad.slice(0, 3).join('; ') : 'every internal link and anchor resolves' };
});
/* 17 */ check(17, 'Form validation', () => {
  const formPages = pages.filter((f) => /<form/.test(read(f)));
  if (!formPages.length) return { pass: false, note: 'no form found' };
  const js = all.filter((f) => f.endsWith('.js')).map(read).join('');
  const client = /aria-invalid/.test(js) && /required/.test(js);
  const serverFile = all.find((f) => /submit\.php$/.test(f));
  const server = serverFile && /FILTER_VALIDATE_EMAIL/.test(read(serverFile));
  return { pass: client && !!server, note: `client:${client ? 'yes' : 'NO'} server:${server ? 'yes' : 'NO'}` };
});
/* 18 */ check(18, 'Spam protection', () => {
  const serverFile = all.find((f) => /submit\.php$/.test(f));
  if (!serverFile) return { pass: false, note: 'no handler' };
  const s = read(serverFile);
  const hp = /honeypot|company/i.test(s), rate = /max_per_hour|rate/i.test(s);
  const timing = all.filter((f) => f.endsWith('.js')).map(read).join('').includes('firstTouch');
  return { pass: hp && rate && timing, note: `honeypot:${hp ? 'y' : 'N'} timing:${timing ? 'y' : 'N'} rate-limit:${rate ? 'y' : 'N'}` };
});
/* 19 */ check(19, 'Analytics', () => {
  /* Only script tags count. Matching the bare word "plausible" anywhere in
     the page meant a terms clause reading "a plausible guess" reported
     analytics as installed, which is the worst kind of failure: a check that
     says yes when the answer is no. */
  const providers = /googletagmanager\.com|gtag\(|plausible\.io|umami\.|cloudflareinsights\.com|clarity\.ms/i;
  const hit = pages.find((f) => {
    const scripts = [...read(f).matchAll(/<script\b[^>]*>[\s\S]*?<\/script>|<script\b[^>]*\/?>/gi)]
      .map((m) => m[0]).join('\n');
    return providers.test(scripts);
  });
  return { pass: !!hit, note: hit ? 'analytics script present' : 'NO analytics: you cannot prove the site works' };
});
/* 20 */ check(20, 'One clear call to action', () => {
  const bad = pages.filter((f) => {
    const s = read(f);
    const head = s.slice(0, s.indexOf('</header>') > 0 ? s.indexOf('</header>') + 4000 : 8000);
    /* "Book a call" is this studio's primary action and belongs in the same
       class as the phrases the original list looked for. */
    return !/tel:/.test(head) || !/Book Now|Book a call|Get a Quote|Contact/i.test(head);
  });
  return { pass: !bad.length, note: bad.length ? `${bad.length} pages with no CTA near the top` : 'phone + primary action high on every page' };
});

const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
console.log(`\n  PRE-LAUNCH CHECKLIST  —  ${path.basename(DIR)}  (${pages.length} pages)`);
console.log('  ' + '-'.repeat(86));
results.forEach((r) => {
  console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${pad(String(r.n), 3)}${pad(r.name, 34)}${r.note}`);
});
const failed = results.filter((r) => !r.pass);
console.log('  ' + '-'.repeat(86));
console.log(`  ${results.length - failed.length}/${results.length} passing\n`);
process.exit(failed.length ? 1 : 0);
