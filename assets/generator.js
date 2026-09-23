/**
 * Website brief generator, one question at a time.
 *
 * The question list comes from content/site.cjs and is embedded in the page
 * as JSON at build time, so the wording can change without touching this
 * file. Nothing here talks to a server: the brief is assembled in the
 * browser and never leaves it unless the visitor copies or downloads it.
 */
(function () {
  var dataEl = document.getElementById('gen-data');
  if (!dataEl) return;

  var QUESTIONS;
  try {
    QUESTIONS = JSON.parse(dataEl.textContent).questions;
  } catch (e) {
    return; // malformed data: leave the intro standing rather than a broken tool
  }
  if (!QUESTIONS || !QUESTIONS.length) return;

  var intro = document.getElementById('gen-intro');
  var flow = document.getElementById('gen-flow');
  var result = document.getElementById('gen-result');
  var card = document.getElementById('gen-card');
  var barFill = document.getElementById('gen-bar-fill');
  var count = document.getElementById('gen-count');
  var btnBack = document.getElementById('gen-back');
  var btnNext = document.getElementById('gen-next');

  var answers = {};
  var at = 0;

  /* ------------------------------------------------------------ helpers */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function answered(q) {
    var a = answers[q.id];
    if (q.optional) return true;
    if (q.type === 'multi') return Array.isArray(a) && a.length > 0;
    return typeof a === 'string' && a.trim() !== '';
  }

  function setError(msg) {
    var existing = card.querySelector('.gen-err');
    if (existing) existing.remove();
    if (!msg) return;
    var e = el('p', 'gen-err', msg);
    e.setAttribute('role', 'alert');
    card.appendChild(e);
  }

  /* ------------------------------------------------------------ render */

  function render() {
    var q = QUESTIONS[at];
    card.innerHTML = '';

    card.appendChild(el('h2', 'gen-q', q.question));
    if (q.help) card.appendChild(el('p', 'gen-help', q.help));

    if (q.type === 'text' || q.type === 'longtext') {
      var input = q.type === 'longtext'
        ? document.createElement('textarea')
        : document.createElement('input');
      if (q.type === 'text') input.type = 'text';
      input.className = 'gen-input';
      input.id = 'q-' + q.id;
      input.placeholder = q.placeholder || '';
      input.value = answers[q.id] || '';
      input.setAttribute('aria-label', q.question);
      input.addEventListener('input', function () {
        answers[q.id] = input.value;
        setError('');
        syncNext();
      });
      /* Enter advances on a single-line field; in a textarea it should still
         make a new paragraph. */
      if (q.type === 'text') {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); next(); }
        });
      }
      card.appendChild(input);
      setTimeout(function () { input.focus(); }, 40);
    }

    if (q.type === 'choice' || q.type === 'multi') {
      var list = el('div', 'gen-options');
      var chosen = q.type === 'multi' ? (answers[q.id] || []) : answers[q.id];

      q.options.forEach(function (opt) {
        var on = q.type === 'multi' ? chosen.indexOf(opt) !== -1 : chosen === opt;
        var b = el('button', 'gen-opt' + (on ? ' on' : ''), opt);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(on));
        b.addEventListener('click', function () {
          if (q.type === 'multi') {
            var cur = answers[q.id] || [];
            var i = cur.indexOf(opt);
            if (i === -1) {
              if (q.max && cur.length >= q.max) {
                setError('Pick up to ' + q.max + '. Unpick one first.');
                return;
              }
              cur = cur.concat([opt]);
            } else {
              cur = cur.slice(0, i).concat(cur.slice(i + 1));
            }
            answers[q.id] = cur;
            setError('');

            /* Toggle this one button in place. Re-rendering the card would
               rebuild every option, restart their entrance animation and
               throw away keyboard focus, so ticking a second box would look
               like the question had reloaded. */
            var nowOn = cur.indexOf(opt) !== -1;
            b.classList.toggle('on', nowOn);
            b.setAttribute('aria-pressed', String(nowOn));
            syncNext();
          } else {
            answers[q.id] = opt;
            setError('');
            /* Single-choice: picking one is the answer, so move straight on
               rather than making them press Next as well. */
            next();
          }
        });
        list.appendChild(b);
      });
      card.appendChild(list);
    }

    btnBack.disabled = at === 0;
    btnNext.textContent = at === QUESTIONS.length - 1 ? 'See my brief' : 'Next question';
    count.textContent = 'Question ' + (at + 1) + ' of ' + QUESTIONS.length;
    barFill.style.width = ((at) / QUESTIONS.length * 100) + '%';
    syncNext();
  }

  function syncNext() {
    var q = QUESTIONS[at];
    btnNext.classList.toggle('is-ready', answered(q));
  }

  function next() {
    var q = QUESTIONS[at];
    if (!answered(q)) {
      setError(q.type === 'multi' ? 'Pick at least one to carry on.' : 'This one is needed to carry on.');
      return;
    }
    if (at === QUESTIONS.length - 1) return finish();
    at++;
    render();
  }

  function back() {
    if (at === 0) return;
    at--;
    render();
  }

  btnNext.addEventListener('click', next);
  btnBack.addEventListener('click', back);

  document.getElementById('gen-start').addEventListener('click', function () {
    intro.hidden = true;
    flow.hidden = false;
    at = 0;
    render();
    flow.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* --------------------------------------------------------- the brief */

  var A = function (id) {
    var v = answers[id];
    return Array.isArray(v) ? v.join(', ') : (v || '').trim();
  };

  /* The part that makes this worth filling in: what the answers actually
     mean for the build. Generic advice would be obvious; these are the
     judgements we would make on a call. */
  function readOut() {
    var notes = [];

    var action = A('action');
    if (/book it/i.test(action)) {
      notes.push('Because a visitor needs to book a specific time, a contact form will not do the job. This needs a real booking flow that confirms on the page and sends an email. It is usually the most expensive part of the build, and the part that earns it back.');
    } else if (/for a price/i.test(action)) {
      notes.push('Showing a price range on the page works far better than promising to ring back. It does mean deciding your pricing rules up front, which is worth doing anyway.');
    } else if (/Ring me/i.test(action)) {
      notes.push('If the phone ringing is the goal, the number belongs in the header of every page as a tappable link rather than buried on a contact page. Most of the traffic will be on a phone already.');
    } else if (/Buy something/i.test(action)) {
      notes.push('Selling online is a bigger job than the rest of the site. Taking payment, tax, postage and refunds all need deciding before anything gets built, so it is worth pricing that part separately.');
    }

    var content = A('content');
    if (/Neither yet/i.test(content)) {
      notes.push('This is the thing that will decide how fast the site is finished. With no photos or text yet, the wait is on you rather than on the building. Real photographs of your own work do more for a small business than any design choice.');
    } else if (/some of it/i.test(content)) {
      notes.push('Half-ready is normal. The thing to protect is the photography. Stock photos look like stock photos, and for a local business a real picture of your own work is the one thing a competitor cannot copy.');
    } else if (/I have photos and the text/i.test(content)) {
      notes.push('Having both ready up front is the difference between a site finished this week and one that drags for a month. This should move quickly.');
    }

    var pages = answers.pages || [];
    if (pages.length >= 8) {
      notes.push('Eight or more pages is more than most small businesses need at launch. Fewer, better pages rank more easily and are far less work to keep accurate. Worth challenging the list before anyone builds it.');
    }

    var goal = A('goal');
    if (/look professional/i.test(goal)) {
      notes.push('If the job is credibility before a meeting, the About page and real photography do more work than anything else on the site. That is where the effort should go.');
    }

    return notes;
  }

  /* The page map: what the visitor ticked, and what each page is for. An AI
     told only "build an About page" writes filler; told what the page is for,
     it writes something usable. */
  /* ------------------------------------------- answer-to-output mapping */

  /* The answers are phrased from the owner's side ("book me online"). The
     prompt is written about the business, so they are restated in the third
     person before they go anywhere near it. */
  var GOAL_PHRASING = {
    'Get my phone ringing':         'get the phone ringing',
    'Let people book me online':    'let customers book appointments online',
    'Get people asking for prices': 'bring in quote requests',
    'Sell my products':             'sell products online',
    'Make us look professional':    'establish credibility before a customer makes contact',
  };

  var ACTION_PHRASING = {
    'Ring me in one tap':      'call the business in one tap',
    'Pick a time and book it': 'pick a time and book it',
    'Ask me for a price':      'request a price',
    'Buy something':           'buy something',
    'Send me a message':       'send the business a message',
  };

  /* Six palettes for the preview, one per "what should it look like" answer.
     Whichever was picked first wins: a preview honouring three at once
     honours none of them. */
  var PALETTES = {
    'Clean and simple':        { bg: '#ffffff', ink: '#16181d', soft: '#6b7280', line: '#e5e7eb', accent: '#2563eb', onAccent: '#ffffff', panel: '#f7f8fa', font: 'system-ui, sans-serif', radius: '8px' },
    'Bold and loud':           { bg: '#0b0b0c', ink: '#ffffff', soft: '#a1a1aa', line: '#27272a', accent: '#e8ff5b', onAccent: '#111111', panel: '#161617', font: 'system-ui, sans-serif', radius: '4px' },
    'Warm and friendly':       { bg: '#fdf8f1', ink: '#3b2b21', soft: '#8a7059', line: '#eaddcc', accent: '#c96f3f', onAccent: '#ffffff', panel: '#f6ecdf', font: 'Georgia, serif', radius: '14px' },
    'Smart and understated':   { bg: '#0d0d0c', ink: '#f3efe6', soft: '#9c9689', line: '#2a2a24', accent: '#c9a961', onAccent: '#100d05', panel: '#16160f', font: 'Georgia, serif', radius: '10px' },
    'Modern and techy':        { bg: '#0f1418', ink: '#e6edf3', soft: '#8b949e', line: '#21262d', accent: '#2dd4bf', onAccent: '#04201c', panel: '#161b22', font: 'ui-monospace, Menlo, monospace', radius: '5px' },
    'Classic and trustworthy': { bg: '#ffffff', ink: '#14243d', soft: '#5a6b85', line: '#dbe2ec', accent: '#1e3a6b', onAccent: '#ffffff', panel: '#f1f5fa', font: 'Georgia, serif', radius: '3px' },
  };

  /* The preview's hero line follows the goal, because the goal is what the
     page is for. Their own words carry the sub-line underneath. */
  var HEADLINES = {
    'Get my phone ringing':         'Call today, sorted today.',
    'Let people book me online':    'Book online in under a minute.',
    'Get people asking for prices': 'Get a price before you commit.',
    'Sell my products':             'Shop the collection.',
    'Make us look professional':    'Work you can check before you call.',
  };

  var ACTIONS = {
    'Ring me in one tap':      'Call now',
    'Pick a time and book it': 'Book a time',
    'Ask me for a price':      'Get a quote',
    'Buy something':           'Shop now',
    'Send me a message':       'Get in touch',
  };

  function initials(text) {
    var words = (text || 'Your Business').replace(/^(a|an|the)\s+/i, '').split(/\s+/).filter(Boolean);
    return (words.slice(0, 2).map(function (w) { return w[0]; }).join('') || 'YB').toUpperCase();
  }

  function siteName(text) {
    var t = (text || '').replace(/^(a|an|the)\s+/i, '').trim();
    if (!t) return 'Your Business';
    var words = t.split(/\s+/).slice(0, 3).join(' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  var PAGE_BRIEFS = {
    'Home': 'the main page, leading with what you do and where, and the primary action',
    'About us': 'who runs the business and why someone should trust it, written to build confidence rather than to fill space',
    'What we do': 'the services offered, each one described plainly enough that a customer can tell which one they need',
    'Photos of our work': 'a gallery of completed work, with real captions saying what each job was',
    'Reviews': 'customer reviews, quoted exactly and attributed, with a link to where they can be verified',
    'Areas we cover': 'the towns and neighbourhoods served, which is what gets a local business found',
    'Contact': 'every way to get in touch, with the primary action repeated at the top',
    'Book online': 'a booking flow that confirms on the page rather than promising a callback',
    'Shop': 'the products for sale, with prices and a working basket',
    'News': 'updates and articles, useful only if they will actually be written',
  };

  var STYLE_NOTES = {
    'Clean and simple': 'generous white space, a single accent colour, plain sans-serif type, nothing decorative',
    'Bold and loud': 'high contrast, large heavy headlines, one bright accent against near-black, confident and hard to ignore',
    'Warm and friendly': 'warm off-white and earth tones, rounded corners, a serif for headings, approachable rather than corporate',
    'Smart and understated': 'dark background, restrained metallic or muted accent, elegant serif headings, quiet and expensive-looking',
    'Modern and techy': 'dark interface tones, a cool accent such as teal or cyan, precise spacing, monospace for small details',
    'Classic and trustworthy': 'white background, navy and a traditional serif, conservative and established, the look of a firm that has been around',
  };

  /* The prompt itself. Written as instructions to an AI that will produce
     the site, in the order the AI needs them: what it is building, for whom,
     the one thing that matters, then the rules it must not break. */
  function promptText() {
    var pages = answers.pages || ['Home', 'Contact'];
    var styles = answers.style || [];
    var content = A('content');
    var L = [];

    L.push('Build a complete, production-ready website for the business described below.');
    L.push('');
    L.push('## The business');
    L.push('');
    L.push('- Name: ' + (A('name') || 'the business'));
    L.push('- What it does: ' + A('business'));
    L.push('- Area served: ' + A('area'));
    L.push('- Contact details to show on every page: ' + A('contact'));
    L.push('- Customers: ' + A('audience'));
    L.push('');
    L.push('## What the site is for');
    L.push('');
    var goals = answers.goal || [];
    if (goals.length > 1) {
      L.push('The website has to do these things, in order of importance:');
      L.push('');
      goals.forEach(function (g, i) {
        L.push((i + 1) + '. ' + (GOAL_PHRASING[g] || g.toLowerCase()).replace(/^./, function (c) { return c.toUpperCase(); }) + '.');
      });
      L.push('');
      L.push('Build the design around the first one. Where two of them compete for the');
      L.push('same space on a page, the earlier one wins. A page that tries to do all of');
      L.push('them equally well does none of them.');
    } else {
      L.push('The single job of this website is to '
        + (GOAL_PHRASING[goals[0]] || (goals[0] || '').toLowerCase() || 'bring in enquiries') + '.');
    }
    L.push('');
    L.push('The one thing a visitor must be able to do, from any page, is '
      + (ACTION_PHRASING[A('action')] || A('action').toLowerCase()) + '.');
    L.push('Make that action the most prominent element on the page. Put it in the header of');
    L.push('every page, once in the first screen of the homepage, and again at the foot of');
    L.push('every page. Do not bury it on a contact page.');
    L.push('');
    L.push('## Pages to build');
    L.push('');
    pages.forEach(function (pg) {
      L.push('- **' + pg + '**: ' + (PAGE_BRIEFS[pg] || 'as the name suggests'));
    });
    L.push('');
    L.push('Build each of these as its own HTML file, not as one page with tabs. Separate');
    L.push('pages can each rank in search for their own subject; a single page cannot.');
    L.push('');
    L.push('## Look and feel');
    L.push('');
    if (styles.length) {
      styles.forEach(function (st) {
        L.push('- ' + st + ': ' + (STYLE_NOTES[st] || ''));
      });
    } else {
      L.push('- Clean and simple, with one accent colour and plenty of white space.');
    }
    L.push('');
    L.push('Choose a palette that fits, and check every text colour against its background');
    L.push('for a contrast ratio of at least 4.5 to 1. Check button labels against the button');
    L.push('fill, which is where brand colours usually fail.');
    L.push('');
    L.push('## Content rules, which matter more than the design');
    L.push('');
    L.push('- **Invent nothing about this business.** No made-up reviews, star ratings,');
    L.push('  review counts, years in business, certifications, licence numbers, team members');
    L.push('  or award badges. Fabricated reviews are illegal in many countries and are the');
    L.push('  fastest way to destroy trust in a small business.');
    L.push('- Where you need a fact that was not supplied, write a clearly marked placeholder');
    L.push('  such as [ADD: opening hours] and list every one of them at the end.');

    if (/Neither yet/i.test(content)) {
      L.push('- No photographs or page text exist yet, so use clearly marked placeholder');
      L.push('  blocks for both. Do not use stock photography of other people\'s work and');
      L.push('  present it as this business. For a local business, real photographs are the');
      L.push('  single strongest trust signal there is.');
    } else if (/some of it/i.test(content)) {
      L.push('- Some photographs and page text exist. Leave clearly marked slots for the real');
      L.push('  ones and never fill a gap with stock imagery presented as this business.');
    } else {
      L.push('- Real photographs and page text exist. Structure the pages so they can be dropped');
      L.push('  in, and size every image slot sensibly.');
    }

    L.push('');
    L.push('## Technical requirements');
    L.push('');
    L.push('- Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies.');
    L.push('  It must run by opening the file, and still work in five years.');
    L.push('- Mobile first, and genuinely responsive at three sizes: phone, tablet and');
    L.push('  desktop. A hamburger menu on a laptop means the breakpoint is wrong.');
    L.push('- A unique <title> and <meta name="description"> on every page. Never repeat one.');
    L.push('- Open Graph and Twitter card tags on every page, so links preview properly.');
    L.push('- A canonical link on every page pointing at its real URL.');
    L.push('- JSON-LD structured data: LocalBusiness on the homepage with the name, area');
    L.push('  served and contact details above, and FAQPage anywhere questions are answered.');
    L.push('- Real alt text on every image, describing the actual scene. Decorative images');
    L.push('  take alt="" deliberately.');
    L.push('- A sitemap.xml and a robots.txt that points at it.');
    L.push('- A custom 404 page that offers the main sections rather than a dead end.');
    L.push('- Semantic HTML: one h1 per page, headings in order, real <nav>, <main> and');
    L.push('  <footer>, and a skip link.');
    L.push('- Keyboard accessible throughout, with a visible focus state.');
    L.push('- Respect prefers-reduced-motion: no animation for anyone who has asked for none.');
    L.push('- Keep total CSS under 100KB and JavaScript under 150KB.');
    L.push('- The phone number must be a tel: link, and the email a mailto: link.');

    if (/message|price|book it/i.test(A('action'))) {
      L.push('- Any form needs validation in the browser AND on the server, a honeypot field');
      L.push('  and a timing check for spam, and it must show the phone number if it fails.');
      L.push('  A form that dead-ends loses the customer.');
    }

    if (A('extras')) {
      L.push('');
      L.push('## Also worth knowing');
      L.push('');
      L.push(A('extras'));
    }

    L.push('');
    L.push('## How to deliver it');
    L.push('');
    L.push('Give me every file in full, ready to upload, with nothing left as "..." or');
    L.push('"rest of the code here". Finish with a list of every placeholder you left and');
    L.push('what I need to supply for each one.');
    L.push('');
    L.push('---');
    L.push('Prompt built free at kova-scaling.com/prompt-generator');
    return L.join('\n');
  }

  /* The server file that makes /about work instead of /about.html. Tested
     against a real Apache rather than assumed: each page is served as its
     own file, which is what keeps them individually rankable. */
  function htaccessText() {
    return [
      '# Clean URLs, HTTPS and a custom 404.',
      '',
      'Options -Indexes',
      'DirectoryIndex index.html',
      '',
      '<IfModule mod_rewrite.c>',
      'RewriteEngine On',
      '',
      '# Force HTTPS. X-Forwarded-Proto is checked as well, because behind a',
      '# proxy %{HTTPS} reads as off and the rule would redirect to itself.',
      'RewriteCond %{HTTPS} !=on',
      'RewriteCond %{HTTP:X-Forwarded-Proto} !=https',
      'RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]',
      '',
      '# One hostname. Drop the www so link credit is not split in two.',
      'RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]',
      'RewriteRule ^ https://%1%{REQUEST_URI} [R=301,L]',
      '',
      '# Drop a trailing slash on anything that is not a real folder.',
      'RewriteCond %{REQUEST_FILENAME} !-d',
      'RewriteRule ^(.+)/$ /$1 [R=301,L]',
      '',
      '# /about serves about.html. Each page stays its own file, so each one',
      '# can rank on its own. Do not route everything to index.html.',
      'RewriteCond %{REQUEST_FILENAME} !-f',
      'RewriteCond %{REQUEST_FILENAME} !-d',
      'RewriteCond %{REQUEST_FILENAME}.html -f',
      'RewriteRule ^(.+?)/?$ $1.html [L]',
      '',
      '# Send the .html version to the clean one, so a page is never reachable',
      '# at two URLs.',
      'RewriteCond %{THE_REQUEST} \\s/+(.+?)\\.html[\\s?] [NC]',
      'RewriteRule ^ /%1 [R=301,L]',
      '</IfModule>',
      '',
      'ErrorDocument 404 /404.html',
      '',
      '<IfModule mod_headers.c>',
      '  Header always set X-Content-Type-Options "nosniff"',
      '  Header always set Referrer-Policy "strict-origin-when-cross-origin"',
      '  Header always set X-Frame-Options "SAMEORIGIN"',
      '</IfModule>',
      '',
      '<IfModule mod_deflate.c>',
      '  AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml \\',
      '    application/javascript application/json image/svg+xml',
      '</IfModule>',
      '',
      '<IfModule mod_expires.c>',
      '  ExpiresActive On',
      '  ExpiresByType text/css "access plus 1 year"',
      '  ExpiresByType application/javascript "access plus 1 year"',
      '  ExpiresByType image/jpeg "access plus 1 year"',
      '  ExpiresByType image/png "access plus 1 year"',
      '  ExpiresByType image/svg+xml "access plus 1 year"',
      '  # HTML must revalidate, or a correction takes a year to reach anyone.',
      '  ExpiresByType text/html "access plus 0 seconds"',
      '</IfModule>',
      '',
      'AddDefaultCharset UTF-8',
    ].join('\n');
  }

  function buildPreview() {
    var host = document.getElementById('preview');
    if (!host) return;

    var styles = answers.style || [];
    var pal = PALETTES[styles[0]] || PALETTES['Clean and minimal'];
    var pages = (answers.pages || []).slice(0, 5);
    if (!pages.length) pages = ['Home', 'Services', 'Contact'];

    var name = siteName(A('name') || A('business'));
    var headline = HEADLINES[(answers.goal || [])[0]] || 'A site that brings in work.';
    var cta = ACTIONS[A('action')] || 'Get in touch';

    host.innerHTML = '';
    Object.keys(pal).forEach(function (k) { host.style.setProperty('--p-' + k, pal[k]); });

    var chrome = el('div', 'pv-chrome');
    var bar = el('div', 'pv-bar');
    bar.appendChild(el('span', 'pv-dots'));
    var addr = el('span', 'pv-url', name.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.com');
    bar.appendChild(addr);
    chrome.appendChild(bar);

    var page = el('div', 'pv-page');

    /* Header: the mark, the pages they chose, the one action. */
    var head = el('div', 'pv-head');
    var brand = el('div', 'pv-brand');
    brand.appendChild(el('span', 'pv-mark', initials(A('name') || A('business'))));
    brand.appendChild(el('span', 'pv-name', name));
    head.appendChild(brand);
    var nav = el('nav', 'pv-nav');
    pages.forEach(function (pg) { nav.appendChild(el('span', null, pg)); });
    head.appendChild(nav);
    head.appendChild(el('span', 'pv-btn', cta));
    page.appendChild(head);

    /* Hero. */
    var hero = el('div', 'pv-hero');
    hero.appendChild(el('h4', null, headline));
    hero.appendChild(el('p', null, A('business') || 'What the business does, in one line.'));
    var row = el('div', 'pv-row');
    row.appendChild(el('span', 'pv-btn', cta));
    row.appendChild(el('span', 'pv-btn ghost', 'Learn more'));
    hero.appendChild(row);
    page.appendChild(hero);

    /* Three cards standing in for whatever the site sells. */
    var cards = el('div', 'pv-cards');
    pages.filter(function (pg) { return pg !== 'Home'; }).slice(0, 3).forEach(function (pg) {
      var c = el('div', 'pv-card');
      c.appendChild(el('span', 'pv-card-t', pg));
      c.appendChild(el('span', 'pv-line'));
      c.appendChild(el('span', 'pv-line short'));
      cards.appendChild(c);
    });
    while (cards.children.length < 3) {
      var c2 = el('div', 'pv-card');
      c2.appendChild(el('span', 'pv-card-t', 'Section'));
      c2.appendChild(el('span', 'pv-line'));
      c2.appendChild(el('span', 'pv-line short'));
      cards.appendChild(c2);
    }
    page.appendChild(cards);

    /* The conversion strip, which is the whole point of the build. */
    var band = el('div', 'pv-band');
    band.appendChild(el('span', 'pv-band-t', headline.replace(/\.$/, '') + '?'));
    band.appendChild(el('span', 'pv-btn', cta));
    page.appendChild(band);

    chrome.appendChild(page);
    host.appendChild(chrome);
  }

  function finish() {
    buildPreview();

    var out = document.getElementById('prompt-out');
    if (out) out.textContent = promptText();

    var ht = document.getElementById('htaccess-out');
    if (ht) ht.textContent = htaccessText();

    /* Anything the visitor still has to supply, pulled out of the prompt so
       it is visible here rather than only discovered later. */
    var todo = document.getElementById('todo-out');
    if (todo) {
      todo.innerHTML = '';
      var gaps = [];
      if (/Neither yet/i.test(A('content'))) gaps.push('Photos of your own work, and the text for each page. This is what decides whether the site looks real.');
      if (/some of it/i.test(A('content'))) gaps.push('The photos and page text you do not have yet.');
      if (!A('contact')) gaps.push('A phone number or email for the site to show.');
      gaps.push('Opening hours, if customers need them.');
      gaps.push('A domain name, and hosting to put the files on.');
      gaps.forEach(function (g) { todo.appendChild(el('li', null, g)); });
    }

    flow.hidden = true;
    result.hidden = false;
    barFill.style.width = '100%';

    /* Move focus to the heading so a screen reader announces the result
       instead of leaving the user on a button that no longer exists. */
    var head = document.getElementById('gen-result-head');
    head.setAttribute('tabindex', '-1');
    head.focus();

    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* -------------------------------------------------------- copy / save */

  /* navigator.clipboard needs a secure context and can be refused outright,
     so there is always the textarea fallback behind it. A copy button that
     silently does nothing is worse than no copy button. */
  function copyText(text, btn) {
    var was = btn.textContent;
    var done = function () {
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(function () { btn.textContent = was; btn.classList.remove('copied'); }, 1800);
    };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { btn.textContent = 'Press Ctrl+C'; }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  function on(id, fn) {
    var n = document.getElementById(id);
    if (n) n.addEventListener('click', fn);
  }

  on('gen-copy', function () { copyText(promptText(), this); });
  on('copy-htaccess', function () { copyText(htaccessText(), this); });

  on('gen-download', function () {
    var blob = new Blob([promptText()], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'website-prompt.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  /* Desktop and phone are the two views that matter, and the difference is
     the width the preview is drawn at plus a few layout rules in the CSS. */
  var devices = document.querySelectorAll('[data-device]');
  Array.prototype.forEach.call(devices, function (b) {
    b.addEventListener('click', function () {
      var host = document.getElementById('preview');
      if (!host) return;
      Array.prototype.forEach.call(devices, function (o) {
        var isThis = o === b;
        o.classList.toggle('on', isThis);
        o.setAttribute('aria-pressed', String(isThis));
      });
      host.classList.toggle('phone', b.getAttribute('data-device') === 'phone');
    });
  });

  on('gen-restart', function () {
    answers = {};
    at = 0;
    result.hidden = true;
    intro.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
