# Kova , kova-scaling.com

The Kova studio website: the portfolio, a free website-brief generator, a
Cal.com booking page, and nine demo builds that show the range of work.

You do not need to be a developer to change the text on this site. Most
edits are one file: **`content/site.cjs`**.

---

## Changing the site

### The quick version

1. Open `content/site.cjs` in any text editor
2. Change the text inside the quote marks
3. Save
4. Run `npm run checklist` in a terminal
5. Upload , see [DEPLOY.md](DEPLOY.md)

### What lives where

| What you want to change | File |
|---|---|
| Phone number, email, city | `content/site.cjs` → `contact` |
| The page titles and descriptions Google shows | `content/site.cjs` → `pages` |
| The menu at the top of every page | `content/site.cjs` → `nav` |
| Analytics token | `content/site.cjs` → `analytics` |
| Homepage wording and the project cards | `index.html` |
| The About story | `about.html` |
| Process, hosting and maintenance | `work-with-us.html` |
| The FAQ (page text and Google's rich results) | `content/site.cjs` → `faq` |
| Booking link | `content/site.cjs` → `scheduler` |
| The brief generator's questions | `content/site.cjs` → `promptGenerator` |
| Privacy policy / terms | `privacy.html` / `terms.html` |
| Colours, fonts, spacing | `assets/main.css` |

**Never edit anything inside `UPLOAD-TO-HOSTINGER/`.** That folder is
generated from everything else and is wiped and rebuilt every time you run
`npm run build`.

### Page titles and descriptions

These are what someone sees in Google's results, and every page needs its own.
In `content/site.cjs`:

```js
'about.html': {
  title: 'About Kova | Who Builds Your Site and How',
  description: 'Kova is a small studio building websites that load fast...',
},
```

Keep descriptions to roughly 140 to 160 characters, and never reuse one. The
pre-launch check fails on duplicates, because Google reads them as a sign of
a thin, auto-generated site.

---

## The commands

Run these from this folder in a terminal.

| Command | What it does |
|---|---|
| `npm run build` | Builds the site into `UPLOAD-TO-HOSTINGER/` |
| `npm run checklist` | Builds, checks every button is wired up, then runs the 20-point pre-launch audit. **This is the one to run before uploading.** |
| `npm run htaccess` | Serves the build through a real Apache and tests every route and redirect |
| `npm run serve` | Local preview at http://localhost:8000, **with PHP running**, so the contact form works |
| `npm run images` | Regenerates the favicon and the social preview card |

### The dangling-hook check

`npm run checklist` runs `scripts/check-hooks.cjs` before the audit. It
cross-references every `id` and `data-` attribute in the built HTML against
what the JavaScript actually reaches for, in both directions.

It exists because this went wrong twice: editing one block of
`assets/generator.js` silently deleted an adjacent one, and the result was a
button that still rendered, still looked clickable, and did nothing. No
syntax error, no console error, nothing in the audit. The only way to find it
was to click it.

### About `npm run serve`

It uses PHP's built-in server with `scripts/router.php`, which reproduces the
clean URLs, the custom 404 and the blocked folders, and **runs PHP**, so this
is the preview where you can actually submit the contact form and watch the
enquiry land.

What it cannot test is the real `.htaccess`: HTTPS forcing, the www redirect
and the exact protected paths. Use `npm run htaccess` for those, which serves
the build through a real Apache.

---

## The pre-launch checklist

`npm run checklist` audits the built site against twenty things every site
here has to get right , privacy policy, unique meta tags, social preview
image, favicon, sitemap, image sizes, page weight, colour contrast, three
responsive tiers, a custom 404, broken links, form validation on both sides,
spam protection, analytics, and a clear call to action.

It reads the **built output**, not the source, so it tests what a visitor
actually receives. It exits with an error if anything fails.

```
  PASS  16 No broken links     every internal link and anchor resolves
  FAIL  19 Analytics           NO analytics: you cannot prove the site works
  19/20 passing
```

A failing check is a blocker, not a suggestion. If one fails for a reason that
is genuinely fine, change the check and write down why. Do not ignore it.

---

## How it is built

Plain HTML, CSS and JavaScript. No framework, no database, and nothing to
install on the server. The build is a copy-and-inject step: it copies the
source files and adds the head tags (title, description, canonical URL, social
image, favicon, analytics) and the shared header and footer to each page.

That means the nine demo sites stay exactly as hand-written, and the
navigation is defined once rather than in 44 files.

```
content/site.cjs      all editable text and settings
index.html            homepage
about.html            about page
work-with-us.html     process, hosting and maintenance, FAQ
book.html             Cal.com booking embed plus a message form
prompt-generator.html free website brief generator
privacy.html          PIPEDA privacy policy (needs legal sign-off)
terms.html            terms of service (needs legal sign-off)
404.html              custom not-found page
submit.php            message form handler (validation, anti-spam, storage, email)
scripts/router.php    dev only: makes `npm run serve` behave like the host
.htaccess             HTTPS, clean URLs, 404, private folders
assets/               stylesheets, scripts, favicon and social card
demos/                nine self-initiated demo sites
scripts/              build and audit tooling
automation/           booking confirmation and reminder emails (GitHub Actions)
UPLOAD-TO-HOSTINGER/  generated , the folder you upload
```

### The brief generator

`prompt-generator.html` asks nine questions one at a time and assembles a
written website brief at the end. It runs entirely in the visitor's browser ,
nothing is sent anywhere, and no email is asked for, so there is no lead
capture and no privacy obligation attached to it.

The questions live in `content/site.cjs` under `promptGenerator`. Add, remove,
reword or reorder them there and the page rebuilds itself , `assets/generator.js`
reads the list rather than hard-coding it. Question types are `text`,
`longtext`, `choice` (pick one) and `multi` (pick several, with an optional
`max`).

The "what this means for the build" notes at the end of the brief are the one
part that is not a straight echo of the answers , they are in `readOut()` in
`assets/generator.js`. That is the part that makes the tool worth filling in,
so it is worth keeping accurate.

### The booking page

Scheduling is handled by Cal.com, set in `content/site.cjs` under
`scheduler`. The build reads that one URL and generates Cal's inline embed
from it, themed to the site's own colour tokens so it does not arrive as a
white panel. Availability is configured inside Cal.com, not here, so it stays
in sync with the real calendar.

Underneath it is a short message form for people who would rather write. It
asks its three questions one at a time, driven by `data-steps` plus one
`.form-step` per question, and posts to `submit.php`, which:

- validates every field again on the server, because the browser can be bypassed
- rejects bots with a honeypot field, a timing check and a per-IP rate limit,
  and no CAPTCHA, because CAPTCHAs cost you mobile conversions
- writes the enquiry to disk **before** trying to email it, so a failed email
  is never a lost enquiry
- logs any failed send to `mail-failures.log`, so a silent mail problem is
  visible instead of being discovered weeks later
- writes each enquiry twice: a `.csv` that opens in Excel, and a `.jsonl`
  holding the full record including IP and browser
- shows the phone number if anything goes wrong, so the form never dead-ends

Enquiries are stored in `kova-leads/`, one level **above** the web root, so
they are unreachable over HTTP even if `.htaccess` goes missing. They hold
names, email addresses and IPs. If the host will not allow that, it falls
back to `leads/` inside the site and writes its own deny file.

---

## Before this goes live

See **[CONTENT-TODO.md](CONTENT-TODO.md)** , every placeholder currently in
the build, ordered by what it costs if it ships wrong. Items 1–3 are blockers.

The biggest: the privacy policy and terms are **unreviewed boilerplate** that
still need a lawyer, and the About page still has a placeholder paragraph
where your own story belongs.

The site publishes no prices at all, so there is nothing invented to ship
wrong there. See the "Resolved" note at the bottom of CONTENT-TODO.

---

## The demo sites

The nine builds under `demos/` are self-initiated. The businesses in them are
invented, and their prices, hours, menus and reviews are fictional. The
footer and `terms.html` §3 both say so plainly, which is what keeps them
honest.

**Baptiste Plumbing**, linked from the homepage, is a real live client site and
is marked as such.

Never add an invented testimonial, review count or credential to a page about
a real business. Beyond being dishonest, fabricated reviews are a Competition
Act problem in Canada. The same goes for availability: if the booking calendar
shows a slot as taken, it should actually be taken.
