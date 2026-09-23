/**
 * Generates the favicon, the apple-touch-icon and the social preview card
 * into assets/img/, using the copy of Chrome already on this machine. No
 * image libraries to install.
 *
 *   node scripts/make-images.js
 *
 * Output is committed, so this only needs re-running when the brand or the
 * wording on the card changes.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const C = require('../content/site.cjs');

const IMG = path.join(__dirname, '..', 'assets', 'img');
fs.mkdirSync(IMG, { recursive: true });

/* The Kova mark: a gold K on a near-black rounded tile. */
const MARK = `<rect width="40" height="40" rx="10" fill="#111"/>
  <path d="M13 9h4.2v9.4L25.4 9H30l-9.6 11.3L30.6 31H25.8L17.2 21.3V31H13z" fill="url(#g)"/>`;

/* SVG favicon: one file, sharp at every size, ~450 bytes. Modern browsers
   prefer it; the PNG below covers iOS, which does not read SVG icons. */
fs.writeFileSync(path.join(IMG, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#e3c581"/><stop offset="100%" stop-color="#8a7440"/>
  </linearGradient></defs>
  ${MARK}
</svg>
`);
console.log('favicon.svg');

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
].find((p) => fs.existsSync(p));

if (!CHROME) {
  console.error('No Chrome found — skipping the PNG icon and the social card.');
  process.exit(0);
}

function render(html, out, w, h) {
  const tmp = path.join(os.tmpdir(), `kova-${Date.now()}-${w}.html`);
  fs.writeFileSync(tmp, html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--screenshot=${out}`, `--window-size=${w},${h}`,
    'file://' + tmp,
  ], { stdio: 'ignore' }); // Chrome is noisy; a failure shows up as a missing file
  fs.unlinkSync(tmp);
  console.log(`${path.basename(out)}  ${w}x${h}  ${Math.round(fs.statSync(out).size / 1024)}KB`);
}

const font = `'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
const markSvg = (size) => `<svg viewBox="0 0 40 40" width="${size}" height="${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#e3c581"/><stop offset="100%" stop-color="#8a7440"/>
  </linearGradient></defs>${MARK}</svg>`;

/* -------------------------------------------------------- social card */

const tagline = C.brand.tagline;
const card = `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  html,body{margin:0}
  body{width:1200px;height:630px;box-sizing:border-box;padding:80px 84px;
    background:radial-gradient(1100px 620px at 78% 8%,#1d1a12 0%,#0a0a0a 62%);
    color:#f5f1e6;font:400 24px/1.45 ${font};
    display:flex;flex-direction:column;justify-content:space-between;position:relative}
  body::after{content:"";position:absolute;inset:0;
    background:linear-gradient(115deg,rgba(201,169,97,.10),transparent 46%)}
  .top{display:flex;align-items:center;gap:20px;position:relative;z-index:1}
  .word{font-weight:700;font-size:38px;letter-spacing:.18em}
  .tag{margin-left:auto;font-size:19px;font-weight:700;letter-spacing:.2em;
    text-transform:uppercase;color:#c9a961}
  h1{position:relative;z-index:1;margin:0;font-weight:700;font-size:74px;
    line-height:1.07;letter-spacing:-.025em;max-width:19ch}
  h1 em{font-style:normal;color:#e3c581}
  .foot{position:relative;z-index:1;display:flex;align-items:center;gap:16px;
    font-size:22px;color:#9c9689;border-top:1px solid #2a2a22;padding-top:26px}
  .dot{width:6px;height:6px;border-radius:50%;background:#c9a961;flex:none}
</style>
<div class="top">${markSvg(64)}<span class="word">KOVA</span><span class="tag">${tagline}</span></div>
<h1>Websites built to <em>bring in customers</em>, not just to look good.</h1>
<div class="foot"><span class="dot"></span><span>kova-scaling.com</span>
  <span class="dot"></span><span>Design, build and launch</span></div>`;

const ogPng = path.join(IMG, 'og-cover.png');
const ogJpg = path.join(IMG, 'og-cover.jpg');
render(card, ogPng, 1200, 630);

/* The card is mostly a smooth gradient, which PNG stores badly. JPEG at q82
   is the same picture at a fraction of the bytes, well under the 400KB cap. */
try {
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82',
    ogPng, '--out', ogJpg], { stdio: 'ignore' });
  const was = Math.round(fs.statSync(ogPng).size / 1024);
  fs.unlinkSync(ogPng);
  console.log(`og-cover.jpg  1200x630  ${Math.round(fs.statSync(ogJpg).size / 1024)}KB (was ${was}KB as PNG)`);
} catch (e) {
  console.warn('sips unavailable — keeping the PNG. Point og:image at .png in scripts/build.js.');
}

/* ---------------------------------------------------------- app icon */

render(`<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0}
  body{width:180px;height:180px;background:#0a0a0a;display:grid;place-content:center}
</style>${markSvg(180)}`, path.join(IMG, 'apple-touch-icon.png'), 180, 180);
