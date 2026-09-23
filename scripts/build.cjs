/**
 * Static build. Copies the site into UPLOAD-TO-HOSTINGER/ and injects the
 * things every page must carry: title, description, canonical URL, social
 * preview tags, favicon and analytics.
 *
 *   npm run build
 *
 * The demo sites under demos/ are hand-written and are copied through
 * untouched apart from that head block and the Kova bar at the top.
 *
 * No dependencies, so this still runs in five years.
 */
const fs = require('fs');
const path = require('path');
const C = require('../content/site.cjs');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'UPLOAD-TO-HOSTINGER');

/* Copied verbatim. Anything not listed here never reaches the server, which
   is how automation/ and package.json stay off the public web. */
const COPY = ['index.html', 'about.html', 'work-with-us.html', 'book.html',
  'prompt-generator.html',
  'privacy.html', 'terms.html', '404.html', 'submit.php', '.htaccess',
  'assets', 'demos'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ copy */

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const copy = (src, dest) => {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((f) => copy(path.join(src, f), path.join(dest, f)));
  } else {
    fs.copyFileSync(src, dest);
  }
};
COPY.forEach((f) => {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) copy(src, path.join(OUT, f));
});

const walk = (d, b = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const rel = b ? `${b}/${e.name}` : e.name;
  return e.isDirectory() ? walk(path.join(d, e.name), rel) : [rel];
});

/* --------------------------------------------------------------- inject */

/** Public URL for a built file. index.html is the folder itself, and the
 *  .html is dropped everywhere else because .htaccess serves both. */
const urlFor = (rel) => {
  if (rel === 'index.html') return C.origin + '/';
  if (rel.endsWith('/index.html')) return `${C.origin}/${rel.slice(0, -'index.html'.length)}`;
  return `${C.origin}/${rel.replace(/\.html$/, '')}`;
};

/** How many ../ it takes to get from a page back to the site root.
 *  404.html is the exception: Apache serves it in place of any missing URL,
 *  at any depth, so its links have to be root-relative or they resolve
 *  against a folder that was never there. */
const upTo = (rel) => (rel === '404.html' ? '/' : '../'.repeat(rel.split('/').length - 1));

const analyticsTag = () => {
  if (!C.analytics.token) return '';
  /* Cloudflare's current snippet. Modules are deferred by definition, so no
     defer attribute, and the beacon sets no cookie, which is why the site
     ships no consent banner. */
  return `\n<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" `
    + `data-cf-beacon='{"token": "${C.analytics.token}"}'></script>`;
};

/** The booking widget.
 *
 *  Scheduling is handed to an external tool that syncs with a real calendar,
 *  so it can never offer a slot that is already taken. Three shapes,
 *  depending on how it is configured, and none of them leave a dead page:
 *  an embed, a button, or a notice pointing at the message form below. */
function schedulerHtml() {
  const sc = C.scheduler || {};
  if (!sc.url) {
    return `<div class="note reveal">
      <p><strong>Online booking is not switched on yet.</strong> Send a message
      using the form below and we will reply with some times, usually the same day.</p>
    </div>`;
  }

  let u;
  try { u = new URL(sc.url); } catch (e) { u = null; }
  const host = u ? u.hostname.replace(/^www\./, '') : '';
  const isCal = host.endsWith('cal.com');
  const plain = esc(sc.url);

  /* Button mode: no embed at all. The cleanest-looking option, and it cannot
     be broken by a content blocker. */
  if (!sc.embed) {
    return `<div class="sched-cta reveal">
      <a class="btn btn-primary btn-lg" href="${plain}" target="_blank" rel="noopener">Choose a time${
        sc.duration ? ` (${esc(sc.duration)})` : ''}</a>
      <p class="cal-note">Opens our booking page in a new tab.</p>
    </div>`;
  }

  /* Cal.com's own inline embed, rather than a bare iframe. It resizes itself
     to the content, handles the month and slot views properly on a phone,
     and takes the theme through its API instead of URL parameters.
     calLink is the account and event slug, taken from the booking URL so
     there is still only one place to change it. */
  if (isCal) {
    const calLink = u.pathname.replace(/^\/+|\/+$/g, '');
    const ns = calLink.split('/').pop().replace(/[^a-zA-Z0-9_-]/g, '') || 'booking';
    return `<div class="sched reveal">
    <div id="cal-inline" class="sched-embed"></div>
    <p class="cal-note">Not loading? <a href="${plain}" target="_blank" rel="noopener">Open the booking page directly</a>, or send a message below.</p>
  </div>
  <script>
  (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");

  Cal("init", "${ns}", { origin: "https://app.cal.com" });
  Cal.config = Cal.config || {};
  Cal.config.forwardQueryParams = true;

  Cal.ns["${ns}"]("inline", {
    elementOrSelector: "#cal-inline",
    config: { layout: "month_view", useSlotsViewOnSmallScreen: "true" },
    calLink: "${calLink}"
  });

  /* Themed from the site's own tokens so the widget is part of the page
     rather than a white panel dropped into it. cssVarsPerTheme is Cal's
     supported way in; editing their stylesheet is not. */
  Cal.ns["${ns}"]("ui", {
    theme: "dark",
    hideEventTypeDetails: false,
    layout: "month_view",
    cssVarsPerTheme: {
      dark: {
        "cal-brand": "#c9a961",
        "cal-bg": "transparent",
        "cal-bg-emphasis": "#16160f",
        "cal-bg-subtle": "#131311",
        "cal-bg-muted": "transparent",
        "cal-border": "#2a2a22",
        "cal-border-subtle": "#2a2a22",
        "cal-text": "#f5f1e6",
        "cal-text-emphasis": "#f5f1e6",
        "cal-text-subtle": "#9c9689",
        "cal-brand-text": "#100d05"
      }
    }
  });
  </script>`;
  }

  /* Any other provider: a plain iframe, tinted through URL parameters where
     the provider supports them. */
  let themed = sc.url;
  if (u && host.endsWith('calendly.com')) {
    const set = (k, v) => { if (!u.searchParams.has(k)) u.searchParams.set(k, v); };
    set('background_color', '0a0a0a');
    set('text_color', 'f5f1e6');
    set('primary_color', 'c9a961');
    set('hide_gdpr_banner', '1');
    set('hide_landing_page_details', '1');
    themed = u.toString();
  }
  return `<div class="sched reveal">
    <iframe class="sched-frame" src="${esc(themed)}" title="Book a call with Kova"
      loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    <p class="cal-note">Not loading? <a href="${plain}" target="_blank" rel="noopener">Open the booking page directly</a>, or send a message below.</p>
  </div>`;
}

/** The FAQ, rendered from content/site.cjs into the visible page. The same
 *  source feeds the FAQPage structured data below, so they cannot disagree. */
const faqHtml = () => C.faq.map((f) => `      <details class="reveal">
        <summary>${esc(f.q)}</summary>
        <p>${esc(f.a)}</p>
      </details>`).join('\n');

const faqLd = () => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: C.faq.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
});

/** Breadcrumbs. Cheap to emit and they give both Google and an assistant a
 *  reliable sense of where a page sits, which a flat set of URLs does not. */
function breadcrumbLd(rel, meta) {
  if (rel === 'index.html' || rel === '404.html') return '';
  const trail = [{ name: 'Home', url: C.origin + '/' }];

  if (rel.startsWith('demos/')) {
    trail.push({ name: 'Work', url: C.origin + '/#work' });
  }
  trail.push({ name: meta.title.split(' | ')[0], url: urlFor(rel) });

  return `\n<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem', position: i + 1, name: t.name, item: t.url,
    })),
  })}</script>`;
}

/** Organisation structured data, homepage only. Tells Google what Kova is. */
const jsonLd = () => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': C.origin + '/#studio',
  name: C.brand.name,
  description: C.brand.blurb,
  url: C.origin,
  email: C.contact.email,
  ...(C.brand.founder ? { founder: { '@type': 'Person', name: C.brand.founder } } : {}),
  /* Optional, and only included once real. Each one is a fact Google can
     use to tell this business apart from another of the same name. */
  ...(C.brand.legalName && !C.brand.legalName.startsWith('[') ? { legalName: C.brand.legalName } : {}),
  ...(C.brand.founded && !C.brand.founded.startsWith('[') ? { foundingDate: C.brand.founded } : {}),
  ...(C.contact.phoneHref ? { telephone: C.contact.phoneHref } : {}),
  image: C.origin + '/assets/img/og-cover.jpg',
  /* An address is only included once it is real. Publishing "[TODO: city]"
     to Google is worse than publishing no address at all: incomplete
     structured data is ignored, wrong structured data is believed. */
  ...(C.contact.city.startsWith('[TODO') ? {} : {
    address: {
      '@type': 'PostalAddress',
      addressLocality: C.contact.city,
      addressRegion: C.contact.region,
      addressCountry: C.contact.country,
    },
  }),
  serviceType: ['Web design', 'Web development', 'Website maintenance', 'Search engine optimisation'],
  areaServed: 'Worldwide',
  knowsAbout: ['Static website development', 'Conversion-focused web design',
    'Local search optimisation', 'Online booking systems', 'Website accessibility'],
  /* One named offering, described the way the site describes it. Structured
     data that claims services the pages do not mention is the kind of
     mismatch that gets rich results withdrawn. */
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Website builds',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Website build, live in three to five days',
          description: 'A fast, static, search-ready website built around one thing a visitor needs to do, such as booking an appointment or requesting a quote. Fixed price agreed on the first call, live within three to five days.',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Website hosting and maintenance',
          description: 'Optional ongoing hosting, content updates, backups and uptime monitoring after launch. The client keeps ownership of the domain, hosting account and source code throughout, so the arrangement can be ended at any time.',
        },
      },
    ],
  },
});

/** WebSite entity, homepage only. Declares the canonical name an assistant
 *  or a search engine should use for the site itself. */
const webSiteLd = () => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': C.origin + '/#website',
  name: C.brand.name,
  url: C.origin,
  description: C.brand.blurb,
  publisher: { '@id': C.origin + '/#studio' },
  inLanguage: 'en',
});

/** The head block every page gets. */
function head(rel, meta) {
  const up = upTo(rel);
  const url = urlFor(rel);
  const og = C.origin + '/assets/img/og-cover.jpg';
  return `
<meta name="description" content="${esc(meta.description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow">
<link rel="icon" href="${up}assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${up}assets/img/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(C.brand.name)}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(meta.title)}">
<meta name="twitter:description" content="${esc(meta.description)}">
<meta name="twitter:image" content="${og}">${rel === 'index.html'
    ? `\n<script type="application/ld+json">${jsonLd()}</script>`
      + `\n<script type="application/ld+json">${webSiteLd()}</script>` : ''}${
    rel === 'work-with-us.html' ? `\n<script type="application/ld+json">${faqLd()}</script>` : ''
  }${breadcrumbLd(rel, meta)}${analyticsTag()}
`;
}

/** The Kova bar that sits at the top of every demo page: a way back, and a
 *  way to hire the studio that built the thing you are looking at. */
function kovaBar(rel) {
  const up = upTo(rel);
  const call = C.contact.phoneHref
    ? `<a class="kb-call" href="tel:${C.contact.phoneHref}">${esc(C.contact.phone)}</a>`
    : `<a class="kb-call" href="mailto:${C.contact.email}">Email Kova</a>`;
  return `<div class="kova-bar">
  <a class="kb-back" href="${up}index.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Kova</a>
  <span class="kb-note">Demo build</span>
  ${call}
  <a class="kb-book" href="${up}book.html">Book a call</a>
</div>`;
}

/** The Kova mark. Inline so it costs no extra request. */
const mark = `<svg class="mark" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs><linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#e3c581"/><stop offset="100%" stop-color="#8a7440"/>
        </linearGradient></defs>
        <rect width="40" height="40" rx="10" fill="#111"/>
        <path d="M13 9h4.2v9.4L25.4 9H30l-9.6 11.3L30.6 31H25.8L17.2 21.3V31H13z" fill="url(#goldGrad)"/>
      </svg>`;

/** Header and footer for the Kova pages (not the demos, which have their
 *  own). Injected into <!--HEADER--> / <!--FOOTER--> so the navigation is
 *  defined once, in content/site.js. */
function siteHeader(rel) {
  const up = upTo(rel);
  const here = rel.replace(/\.html$/, '');
  const links = C.nav.map((n) => {
    const target = n.href.replace(/^\//, '');
    /* A bare "#work" means a section of the homepage, which is only a
       same-page anchor when you are already on the homepage. Anywhere else
       it has to name the page too, or it points at an id that is not
       there. */
    let href;
    if (target.startsWith('#')) {
      href = rel === 'index.html' ? target : `${up}index.html${target}`;
    } else {
      href = `${up}${target || 'index.html'}`;
    }
    const current = target.replace(/#.*$/, '') === here;
    return `<a href="${href}"${current ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`;
  }).join('\n      ');

  const call = C.contact.phoneHref
    ? `<a class="hdr-call" href="tel:${C.contact.phoneHref}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.37 2.3.57 3.5.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.2.2 2.4.57 3.5a1 1 0 0 1-.25 1z"/></svg><span>${esc(C.contact.phone)}</span></a>`
    : `<a class="hdr-call" href="mailto:${C.contact.email}"><span>${esc(C.contact.email)}</span></a>`;

  return `<header class="site">
  <div class="wrap">
    <a class="logo" href="${up}index.html" aria-label="Kova home">
      ${mark}
      <span class="word">KOVA</span>
    </a>
    <nav class="primary">
      ${links}
    </nav>
    <div class="hdr-cta">
      ${call}
      <a class="btn btn-primary btn-sm" href="${up}book.html">Book a call</a>
    </div>
    <button class="burger" type="button" aria-expanded="false" aria-controls="menu" aria-label="Open menu"><i></i><i></i><i></i></button>
  </div>
  <div class="drawer" id="menu" hidden>
    ${links}
    ${call}
    <a class="btn btn-primary btn-block" href="${up}book.html">Book a call</a>
  </div>
</header>`;
}

function siteFooter(rel) {
  const up = upTo(rel);
  return `<footer class="site">
  <div class="wrap">
    <div class="foot-top">
      <span>&copy; ${new Date().getFullYear()} ${esc(C.brand.name)}</span>
      <nav class="foot-nav">
        <a href="${up}about.html">About</a>
        <a href="${up}work-with-us.html">Work with us</a>
        <a href="${up}book.html#message">Send a message</a>
        <a href="${up}privacy.html">Privacy</a>
        <a href="${up}terms.html">Terms</a>
        <a href="https://github.com/kovabrand12-beep/kova-portfolio" target="_blank" rel="noopener">GitHub</a>
      </nav>
    </div>
    <div class="note">Baptiste Plumbing is a live client build. The rest of the work shown is self-initiated studio work, built to demonstrate range and code quality.</div>
  </div>
</footer>`;
}

const pagesBuilt = [];
walk(OUT).filter((f) => f.endsWith('.html')).forEach((rel) => {
  const file = path.join(OUT, rel);
  let s = fs.readFileSync(file, 'utf8');
  const meta = C.pages[rel];
  if (!meta) {
    console.warn(`  ! no entry in content/site.js for ${rel} — skipped`);
    return;
  }

  s = s.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`);
  /* Drop any description already in the source so the data file is the one
     source of truth and we never ship two of them. */
  s = s.replace(/\n?\s*<meta name="description"[^>]*>/g, '');
  s = s.replace('</head>', head(rel, meta) + '</head>');

  /* Kova pages: drop in the shared header and footer. */
  s = s.replace('<!--HEADER-->', () => siteHeader(rel));
  s = s.replace('<!--FOOTER-->', () => siteFooter(rel));

  /* Contact details come from content/site.js so they are never edited in
     two places and can never disagree between pages. */
  /* Until a real phone number is set, anything that would render a tel:
     link falls back to email rather than printing the placeholder at a
     visitor. */
  const contactLine = C.contact.phoneHref
    ? `<a href="tel:${C.contact.phoneHref}">${esc(C.contact.phone)}</a> &middot; <a href="mailto:${C.contact.email}">${esc(C.contact.email)}</a>`
    : `<a href="mailto:${C.contact.email}">${esc(C.contact.email)}</a>`;

  s = s.split('{{SCHEDULER}}').join(schedulerHtml())
    .split('{{FAQ}}').join(faqHtml())
    .split('{{CONTACT_LINE}}').join(contactLine)
    .split('{{PHONE_HREF}}').join(C.contact.phoneHref || '')
    .split('{{PHONE}}').join(C.contact.phone)
    .split('{{EMAIL}}').join(C.contact.email);

  /* The brief generator's questions travel to the browser as JSON so the
     wording lives in content/site.cjs like everything else. */
  if (s.includes('{{GEN_QUESTIONS}}')) {
    const g = C.promptGenerator;
    s = s.split('{{GEN_QUESTIONS}}').join(JSON.stringify({ questions: g.questions }))
      .split('{{GEN_EYEBROW}}').join(esc(g.intro.eyebrow))
      .split('{{GEN_HEADING}}').join(esc(g.intro.heading))
      .split('{{GEN_LEAD}}').join(esc(g.intro.lead))
      .split('{{GEN_START}}').join(esc(g.intro.start))
      .split('{{GEN_NOTE}}').join(esc(g.intro.note));
  }

  /* Demo pages: swap the old floating pill for the full Kova bar. */
  if (rel.startsWith('demos/')) {
    s = s.replace(/\s*<a href="[^"]*" class="back-to-kova">[\s\S]*?<\/a>/, '');
    s = s.replace(/<body>/, '<body>\n\n' + kovaBar(rel));
  }

  /* With direct booking on, every "Book a call" goes straight to the
     scheduler rather than to a page that holds the scheduler. The booking
     page itself is left alone, and so is the footer link that keeps it
     reachable. */
  if (C.scheduler && C.scheduler.direct && C.scheduler.url && rel !== 'book.html') {
    const up = upTo(rel);
    const direct = `href="${esc(C.scheduler.url)}" target="_blank" rel="noopener"`;
    [`href="${up}book.html"`, `href="${up}book"`].forEach((form) => {
      s = s.split(form).join(direct);
    });
  }

  /* Internal links drop the .html. .htaccess 301s the .html form to the
     clean one, so leaving them in would make every single click a redirect,
     and would disagree with the canonical tag and the sitemap. Absolute
     URLs and non-page links are left alone. */
  s = s.replace(/href="(?!https?:|mailto:|tel:|data:|\/\/)([^"#]*?)\.html(#[^"]*)?"/g,
    (_m, p, frag) => {
      const clean = p.replace(/(^|\/)index$/, '$1') || './';
      return `href="${clean}${frag || ''}"`;
    });

  fs.writeFileSync(file, s);
  pagesBuilt.push(rel);
});

/* ------------------------------------------------- sitemap + robots.txt */

/* Demo pages are real pages and can be indexed, but they must not outrank
   the studio itself, so they carry a lower priority. */
const priority = (rel) => (rel === 'index.html' ? '1.0'
  : rel.startsWith('demos/') ? '0.4'
  : /privacy|terms|404/.test(rel) ? '0.2' : '0.8');

const today = new Date().toISOString().slice(0, 10);
const urls = pagesBuilt.filter((r) => r !== '404.html').sort()
  .map((rel) => `  <url>
    <loc>${urlFor(rel)}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority(rel)}</priority>
  </url>`).join('\n');

fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);

/* Assistant crawlers are named explicitly and allowed on purpose. A studio
   that wants to be recommended when someone asks an assistant for a web
   developer has to be readable by the thing doing the recommending. If that
   ever stops being the right trade, flip these to Disallow. */
const AI_AGENTS = [
  'GPTBot',              // OpenAI, training and browsing
  'OAI-SearchBot',       // OpenAI, search index
  'ChatGPT-User',        // OpenAI, fetches a page a user asked about
  'ClaudeBot',           // Anthropic
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',     // Gemini grounding, separate from Googlebot
  'Applebot-Extended',
  'CCBot',               // Common Crawl, feeds many models
  'Bytespider',
  'meta-externalagent',
];

fs.writeFileSync(path.join(OUT, 'robots.txt'),
  `User-agent: *
Allow: /

# Nothing here is secret, but there is no reason to spend crawl budget on it.
Disallow: /submit.php

# Assistants and answer engines are welcome. See llms.txt for a plain-text
# summary of the site written for them.
${AI_AGENTS.map((a) => `User-agent: ${a}\nAllow: /`).join('\n\n')}

Sitemap: ${C.origin}/sitemap.xml
`);

/* llms.txt: a short, plain-markdown description of the site for assistants
   that look for one, following the llmstxt.org convention. HTML is noisy to
   parse and the important facts about a small studio fit on one screen.

   Everything here is generated from content/site.cjs, so it cannot drift
   away from the pages themselves. */
const llms = () => {
  const phone = C.contact.phoneHref ? `\n- Phone: ${C.contact.phone}` : '';
  const where = C.contact.city.startsWith('[TODO')
    ? '' : `\n- Based in: ${C.contact.city}, ${C.contact.region}`;

  return `# ${C.brand.name}

> ${C.brand.blurb}

${C.brand.name} is a small web studio run by ${C.brand.founder}, building fast,
static websites for small businesses. The distinguishing feature of the work is that every site is built
around one thing a visitor needs to do, such as booking an appointment,
requesting a quote or checking availability, rather than being a brochure with
a contact form at the end.

## How Kova works

- Sites are built in plain HTML, CSS and JavaScript. No framework, no CMS
  subscription and no plugins.
- Every project is a fixed price agreed on the first call. There is no hourly
  billing and no published price list, because the figure depends on scope.
- Sites go live in three to five days from the first call. Speed is the
  distinguishing feature of the studio: one person builds the whole site in
  one pass, so there is no handover between a designer, a developer and a
  project manager to wait on.
- The client owns the domain, the hosting account and the source code outright.
- Every site is checked against a twenty-point pre-launch audit covering
  speed, accessibility, colour contrast, meta tags, structured data, forms,
  spam protection and broken links.
- Kova also offers optional hosting and maintenance after launch, covering
  content updates, backups and uptime monitoring. It is optional in the real
  sense: the client owns the domain, the hosting account and the source code
  regardless, and can move the site elsewhere at any time.

## Pages

- [Home](${C.origin}/): what Kova does, and the portfolio of builds.
- [Work with us](${C.origin}/work-with-us): the four-stage, five-day process,
  what would slow a build down, and answers to common questions.
- [About](${C.origin}/about): who Kova is and the four decisions behind
  every build.
- [Website prompt generator](${C.origin}/prompt-generator): a free tool that
  asks eleven plain questions and returns a ready-to-paste AI prompt that
  builds the website, a preview of the design, and the Apache .htaccess file
  for clean URLs. Runs entirely in the browser, asks for no email address and
  stores nothing.
- [Book a call](${C.origin}/book): a fifteen-minute call, booked from an
  online scheduler at cal.com/kova-icu0vr/15min, or by sending a message.

## Questions and answers

${C.faq.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n')}

## Who runs it

${C.brand.founder} runs Kova and does the work personally, from the first call
through to launch and afterwards. The studio judges a website by one measure:
whether it brings the owner more work than it cost to build.

## Contact
${where}${phone}
- Email: ${C.contact.email}
- Website: ${C.origin}

## Note on the portfolio

Baptiste Plumbing, linked from the homepage, is a real client site for a live
business. The other nine builds are self-initiated demonstrations. The
businesses in those are invented, and their names, prices, opening hours and
reviews are fictional and exist only to show how a site of that kind behaves.
They should not be described as real companies.
`;
};

fs.writeFileSync(path.join(OUT, 'llms.txt'), llms());

/* No leads folder is created here on purpose.

   Enquiries are stored in kova-leads/, one level ABOVE the web root, which
   is outside this build entirely and must never be uploaded. submit.php
   creates it on the first submission. If the host will not allow that, it
   falls back to a leads/ folder beside itself and creates that instead.

   An empty folder shipped in the package would not survive a zip round trip
   anyway, and having one here only makes it look as though something failed
   to upload. */

console.log(`\n  built ${pagesBuilt.length} pages -> UPLOAD-TO-HOSTINGER/`);
if (!C.analytics.token) console.log('  ! analytics token not set — no analytics in this build');
if (!C.contact.phoneHref) console.log('  ! phone not set — CTA falls back to email');
console.log('');
