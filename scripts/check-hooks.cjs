/**
 * Checks that every interactive hook in the built HTML is actually wired up
 * in the JavaScript, and vice versa.
 *
 *   node scripts/check-hooks.cjs
 *
 * This exists because it has now happened twice: editing one block of
 * generator.js silently removed an adjacent one, and the result was a button
 * that still rendered, still looked clickable, and did nothing at all. No
 * syntax error, no console error, no failing check. The only way to notice
 * was to click it.
 *
 * So: pull every id and data- attribute the scripts reach for out of the
 * HTML, pull every id and attribute the scripts actually reference out of
 * the JS, and complain about anything that appears on only one side.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'UPLOAD-TO-HOSTINGER');
const ASSETS = path.join(OUT, 'assets');

if (!fs.existsSync(OUT)) {
  console.error('No build found. Run `npm run build` first.');
  process.exit(1);
}

const external = fs.readdirSync(ASSETS)
  .filter((f) => f.endsWith('.js'))
  .map((f) => fs.readFileSync(path.join(ASSETS, f), 'utf8'))
  .join('\n');

/* Only the Kova pages. The demos are hand-written and self-contained. */
const pages = fs.readdirSync(OUT).filter((f) => f.endsWith('.html'));

/* Scripts written inline in a page count too: the Cal.com embed and the
   booking page's timezone list both live there. */
const inline = pages.map((p) => {
  const html = fs.readFileSync(path.join(OUT, p), 'utf8');
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
}).join('\n');

const js = external + '\n' + inline;

/* Ids that exist purely as link targets or for styling are not dead just
   because no script mentions them. */
const ANCHOR_ONLY = new Set(['top', 'work', 'contact', 'packages', 'message', 'tool', 'main', 'menu']);

const problems = [];

pages.forEach((page) => {
  const html = fs.readFileSync(path.join(OUT, page), 'utf8');

  /* An id is "wired" if any script looks it up by name. */
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  ids.forEach((id) => {
    if (ANCHOR_ONLY.has(id)) return;
    /* Ids that are only ever referenced from the HTML itself (a label's
       `for`, an aria-controls, an href anchor) are fine. */
    /* An SVG gradient or filter is referenced as url(#id), which is a
       perfectly good use and not a dangling hook. */
    const usedInHtml = new RegExp(`(for|aria-controls|aria-describedby|aria-labelledby)="[^"]*\\b${id}\\b|href="#${id}"|url\\(#${id}\\)`).test(html);
    const usedInJs = js.includes(`'${id}'`) || js.includes(`"${id}"`) || js.includes(`#${id}`);
    if (!usedInHtml && !usedInJs) {
      problems.push(`${page}: id="${id}" is referenced by nothing`);
    }
  });

  /* A data- hook exists to be found by a script. If no script looks for it,
     it is a button that does nothing. */
  const hooks = new Set([...html.matchAll(/\s(data-[a-z-]+)(?==|[\s>])/g)].map((m) => m[1]));
  hooks.forEach((hook) => {
    if (!js.includes(hook)) {
      problems.push(`${page}: ${hook} is on an element but no script reads it`);
    }
  });
});

/* The reverse: a script reaching for something the HTML no longer has. */
const wanted = new Set([...js.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]));
const allHtml = pages.map((p) => fs.readFileSync(path.join(OUT, p), 'utf8')).join('\n');
wanted.forEach((id) => {
  if (!allHtml.includes(`id="${id}"`)) {
    problems.push(`no page has id="${id}", but a script looks for it`);
  }
});

if (problems.length) {
  console.log('\n  DANGLING HOOKS\n  ' + '-'.repeat(60));
  problems.forEach((p) => console.log('  ' + p));
  console.log('  ' + '-'.repeat(60));
  console.log(`  ${problems.length} problem(s)\n`);
  process.exit(1);
}

console.log('  every id and data- hook is wired up on both sides');
