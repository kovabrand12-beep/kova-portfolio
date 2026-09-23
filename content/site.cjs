/**
 * Every piece of editable text on the Kova site lives here.
 *
 * You do not need to know HTML to change the site. Edit the values below
 * (the parts inside quotes), save, then run `npm run build`.
 *
 * Nothing here has to change before the site goes live. Anything still
 * written as "[TODO: ...]" is optional: the build leaves it out rather than
 * publishing the placeholder. CONTENT-TODO.md says what each one buys you.
 */

/* The live domain. Used for canonical URLs and the sitemap, so it must be
   exactly right. A canonical pointing at the wrong host can keep the whole
   site out of Google. No trailing slash. */
const origin = 'https://kova-scaling.com';

const contact = {
  email: 'kova.brand12@gmail.com',

  /* Shown as a tappable link at the top of every page, and in the structured
     data that tells Google how to reach the business. `phone` is how it
     reads on screen; `phoneHref` is the same number, digits only, with the
     country code, which is what a phone actually dials. */
  phone: '(289) 455-9324',
  phoneHref: '+12894559324',

  /* OPTIONAL. Fill these in and your town and province are added to the
     structured data Google reads, which is what makes a business show up for
     "web designer near me" rather than only for its own name. Left as they
     are, no address is published at all, which is correct but gives up that
     advantage. Nothing breaks either way. */
  city: '[TODO: city]',
  region: '[TODO: province or state]',
  country: 'CA',
};

const brand = {
  name: 'Kova',
  founder: 'Mawana Chidovi',
  /* OPTIONAL. Both are added to the structured data when filled in, and
     ignored while they look like this. */
  legalName: '[TODO: registered business name, if different from Kova]',
  tagline: 'Growth Engineered.',
  founded: '[TODO: year Kova started, as a year: 2024]',
  blurb: 'Kova builds websites for small businesses that are judged on one thing: whether they bring in more work.',
};

/* The main navigation, in order. Every entry must point at a real page. */
const nav = [
  { href: '/work-with-us', label: 'Work with us' },
  { href: '/prompt-generator', label: 'Free prompt' },
  { href: '/about', label: 'About' },
  { href: '/#work', label: 'Work' },
  { href: '/book', label: 'Book a call' },
];

/* Cookieless analytics. No cookie is set, so the site ships no consent
   banner (checklist point 5). Paste the token from your Cloudflare dashboard:
   Cloudflare → Analytics & Logs → Web Analytics → Add a site → copy the token.
   Leave it blank and the script is simply left out of the build. */
const analytics = {
  provider: 'cloudflare',
  token: 'f5dc4f9f5fbb415e82b17a6615726e81',
};

/* ------------------------------------------------------------------ pages */
/* Title and description for every page. Both must be unique across the whole
   site. Google treats duplicates as a sign of a thin, auto-generated site.
   Descriptions read best at roughly 140–160 characters. */

const pages = {
  'index.html': {
    title: 'Kova | Websites That Bring In Customers',
    description:
      'Kova builds fast, search-ready websites for small businesses and gets them live in three to five days. See the work, then book a call.',
  },
  'about.html': {
    title: 'About Kova | Who Builds Your Site and How',
    description:
      'Kova is a small studio building websites that load fast, rank well and turn visitors into booked work. Here is who we are and how we work.',
  },
  'work-with-us.html': {
    title: 'Work With Kova | Live In Three To Five Days',
    description:
      'How a Kova site gets built and launched inside a week: the four-stage process, what we need from you, and answers to the questions we get asked every time.',
  },
  'book.html': {
    title: 'Book a Call With Kova | Pick a Time That Suits You',
    description:
      'Pick a fifteen-minute slot and leave the call with a fixed price and a launch date. No commitment and no sales script, or send a message instead.',
  },
  'privacy.html': {
    title: 'Privacy Policy | Kova',
    description:
      'How Kova collects, uses and stores the personal information you send through this website, and how to ask for a copy or its deletion.',
  },
  'terms.html': {
    title: 'Terms of Service | Kova',
    description:
      'The terms that apply to using the Kova website and to work commissioned from Kova, including scope, payment and ownership of the finished site.',
  },
  'prompt-generator.html': {
    title: 'Free Website Prompt Generator | Kova',
    description:
      'Answer eleven plain questions and get a ready-to-paste AI prompt that builds your website, a preview of the design, and the server file for clean URLs. Free, no email.',
  },
  '404.html': {
    title: 'Page Not Found | Kova',
    description:
      'That page does not exist, has moved, or the link was mistyped. Here are the main sections of the Kova site instead.',
  },

  /* ---- Demo builds. These are self-initiated work, not paid client sites. */

  'demos/bloom-cafe/index.html': {
    title: 'Bloom Café | Kova',
    description:
      'Demo build: a neighbourhood café site with a real table-reservation flow, so an enquiry never has to become an email thread.',
  },
  'demos/bloom-cafe/menu.html': {
    title: 'Bloom Café Menu | Kova',
    description:
      'Demo build: a café menu laid out so prices and dietary notes stay readable on a phone held one-handed at the counter.',
  },
  'demos/bloom-cafe/reserve.html': {
    title: 'Bloom Café Reserve | Kova',
    description:
      'Demo build: a table-booking form that confirms on the page, rather than dumping the visitor into their email client.',
  },
  'demos/bloom-cafe/visit.html': {
    title: 'Bloom Café Visit | Kova',
    description:
      'Demo build: opening hours, location and parking for a café, structured the way Google prefers to read them.',
  },

  'demos/pulseops/index.html': {
    title: 'PulseOps | Kova',
    description:
      'Demo build: a B2B SaaS landing page with a product tour and a working demo scheduler instead of the usual dead contact form.',
  },
  'demos/pulseops/features.html': {
    title: 'PulseOps Features | Kova',
    description:
      'Demo build: a feature breakdown for a SaaS product, written so a buyer can tell what it does without booking a call first.',
  },
  'demos/pulseops/pricing.html': {
    title: 'PulseOps Pricing | Kova',
    description:
      'Demo build: tiered SaaS pricing laid out for quick comparison, with the plan most buyers pick marked clearly.',
  },
  'demos/pulseops/contact.html': {
    title: 'PulseOps Book a Demo | Kova',
    description:
      'Demo build: a working demo scheduler for a software product, the step most B2B sites replace with a plain enquiry form.',
  },

  'demos/verde-goods/index.html': {
    title: 'Verde Goods | Kova',
    description:
      'Demo build: a plant shop storefront with a live catalogue and add-to-cart, showing a small shop can sell without a full platform.',
  },
  'demos/verde-goods/shop.html': {
    title: 'Verde Goods Shop | Kova',
    description:
      'Demo build: a product grid with working add-to-cart, built in plain JavaScript with no e-commerce platform behind it.',
  },
  'demos/verde-goods/about.html': {
    title: 'Verde Goods About | Kova',
    description:
      'Demo build: the story page of a small plant shop, written to build trust before a first order rather than to fill space.',
  },
  'demos/verde-goods/contact.html': {
    title: 'Verde Goods Contact | Kova',
    description:
      'Demo build: a shop contact page that answers the common questions on the page instead of inviting an email for each one.',
  },

  'demos/atelier-noor/index.html': {
    title: 'Atelier Noor | Kova',
    description:
      'Demo build: a dark-mode photography portfolio built so the gallery carries the site and the images load fast at full width.',
  },
  'demos/atelier-noor/work.html': {
    title: 'Atelier Noor Work | Kova',
    description:
      'Demo build: a photographer’s gallery laid out to keep large images sharp without making the page slow to open.',
  },
  'demos/atelier-noor/about.html': {
    title: 'Atelier Noor About | Kova',
    description:
      'Demo build: a photographer’s about page, written to answer what a client actually wants to know before enquiring.',
  },
  'demos/atelier-noor/contact.html': {
    title: 'Atelier Noor Book a Session | Kova',
    description:
      'Demo build: a session-booking form for a photographer, capturing shoot type and date up front rather than in a reply.',
  },

  'demos/summit-fitness/index.html': {
    title: 'Summit Fitness | Kova',
    description:
      'Demo build: a high-contrast gym site with a live weekly class timetable, built for a business whose schedule changes constantly.',
  },
  'demos/summit-fitness/schedule.html': {
    title: 'Summit Fitness Schedule | Kova',
    description:
      'Demo build: an interactive weekly class timetable a gym owner can change without paying a developer each week.',
  },
  'demos/summit-fitness/membership.html': {
    title: 'Summit Fitness Membership | Kova',
    description:
      'Demo build: gym membership tiers presented so the difference between them is obvious at a glance on a phone.',
  },
  'demos/summit-fitness/contact.html': {
    title: 'Summit Fitness Contact | Kova',
    description:
      'Demo build: a gym contact page with location, staffed hours and a trial-class request in one place.',
  },

  'demos/northbeam-realty/index.html': {
    title: 'Northbeam Realty | Kova',
    description:
      'Demo build: an estate agency site with a working property filter and showings booked against a specific listing.',
  },
  'demos/northbeam-realty/listings.html': {
    title: 'Northbeam Realty Listings | Kova',
    description:
      'Demo build: a property listings grid with a live type filter, so a buyer narrows results without a page reload.',
  },
  'demos/northbeam-realty/about.html': {
    title: 'Northbeam Realty About | Kova',
    description:
      'Demo build: an estate agency about page built around the agents, since that is what a seller is really choosing.',
  },
  'demos/northbeam-realty/contact.html': {
    title: 'Northbeam Realty Schedule a Showing | Kova',
    description:
      'Demo build: a showing request tied to a specific property, rather than a generic form that loses which house it was about.',
  },

  'demos/ember-oak/index.html': {
    title: 'Ember & Oak | Kova',
    description:
      'Demo build: a steakhouse site with a real reservation-availability checker that answers instead of promising to follow up.',
  },
  'demos/ember-oak/menu.html': {
    title: 'Ember & Oak Menu | Kova',
    description:
      'Demo build: a restaurant menu typeset for the room it belongs to, and still legible on a phone in low light.',
  },
  'demos/ember-oak/reserve.html': {
    title: 'Ember & Oak Reserve | Kova',
    description:
      'Demo build: pick a date, time and party size and get a real answer on the page, which is the step most restaurant sites skip.',
  },
  'demos/ember-oak/visit.html': {
    title: 'Ember & Oak Visit | Kova',
    description:
      'Demo build: location, hours, parking and dress code for a restaurant, answered before anyone has to ring up.',
  },

  'demos/anchor-home-services/index.html': {
    title: 'Anchor Home Services | Kova',
    description:
      'Demo build: a home services site with a live instant-quote calculator that gives a price range before anyone picks up the phone.',
  },
  'demos/anchor-home-services/services.html': {
    title: 'Anchor Home Services Services | Kova',
    description:
      'Demo build: a trade services list written so a homeowner can tell which one their problem actually is.',
  },
  'demos/anchor-home-services/quote.html': {
    title: 'Anchor Home Services Get a Quote | Kova',
    description:
      'Demo build: an instant-quote calculator estimating a real price range from job type, urgency and postcode.',
  },
  'demos/anchor-home-services/contact.html': {
    title: 'Anchor Home Services Contact | Kova',
    description:
      'Demo build: a trade contact page leading with the emergency line, because that is why most visitors are there.',
  },

  'demos/lumina-medspa/index.html': {
    title: 'Lumina Medspa | Kova',
    description:
      'Demo build: a medical aesthetics site with a full treatment menu and real online booking, where booking is the whole conversion.',
  },
  'demos/lumina-medspa/services.html': {
    title: 'Lumina Medspa Services | Kova',
    description:
      'Demo build: a treatment menu with duration and price per service, so a client can plan a visit without ringing ahead.',
  },
  'demos/lumina-medspa/book.html': {
    title: 'Lumina Medspa Book Now | Kova',
    description:
      'Demo build: an appointment booking page that takes treatment, practitioner and time in a single pass.',
  },
  'demos/lumina-medspa/about.html': {
    title: 'Lumina Medspa About | Kova',
    description:
      'Demo build: a clinic about page built to establish credentials early, which is what an aesthetics client screens for.',
  },
};

/* ------------------------------------------------------------------- faq */
/* Asked and answered once, here. The build renders these into the visible
   page AND into the FAQPage structured data, so the two can never drift
   apart. That matters more than usual now: the answer an AI assistant reads
   out is taken from the structured data, and if it disagrees with the page
   you have published two different versions of your own terms.

   Write answers as complete, self-contained statements. An assistant quoting
   one sentence out of context should still be quoting something true. */

const faq = [
  {
    q: 'How long does a website take to build?',
    a: 'Three to five days from the first call to launch. Speed is the point of working this way: one person builds the whole site in one pass, so there is no handover between a designer, a developer and a project manager to wait on. The only thing that pushes a build past a week is waiting on photographs or final wording from your end.',
  },
  {
    q: 'Do I own the website when it is finished?',
    a: 'Yes. You own the domain, the hosting account and the source code. Kova builds in plain HTML, CSS and JavaScript, so any developer can pick the site up. There is no platform lock-in and no licence to keep paying.',
  },
  {
    q: 'Will my site show up on Google?',
    a: 'Every Kova site ships with unique page titles and descriptions, a sitemap, structured data, real alt text and a page weight small enough not to be penalised. That is the technical groundwork and it is the part we control. Ranking for competitive search terms also depends on reviews, local listings and time, so anyone promising a number-one position by a fixed date is guessing.',
  },
  {
    q: 'What happens if something breaks after launch?',
    a: 'Anything broken that Kova built is fixed at no charge. Because the sites are static files with no database and no plugins, there is very little that can break on its own.',
  },
  {
    q: 'Can you work with my existing website?',
    a: 'Sometimes. If it sits on a platform that is costing you speed or money, Kova will usually recommend rebuilding rather than patching, and will say so on the first call rather than selling the bigger job by default.',
  },
  {
    q: 'How much does a website from Kova cost?',
    a: 'Kova prices each project as a fixed number agreed on the first call, with no hourly billing. The figure depends on how many pages the site needs, whether it needs a working booking or quote flow, how ready your content is, and what it has to connect to. There are no published price lists because a number set in advance would be a guess.',
  },
  {
    q: 'Do you offer hosting and maintenance?',
    a: 'Yes. Kova offers hosting and ongoing maintenance as an optional arrangement after launch, covering updates, content changes, backups and keeping the site online. It is optional in the real sense: you own the domain, the hosting account and the source code either way, so you can take the site elsewhere at any time without asking us or paying to be released. Sites that stay with us simply have someone looking after them.',
  },
  {
    q: 'Where is Kova based and who does it work with?',
    a: 'Kova is a small studio working with small businesses and independent operators, most often local trades, clinics, restaurants and studios that need a website to book work rather than simply exist.',
  },
];

/* ---------------------------------------------------------- scheduling */
/* Booking is handled by an external scheduler rather than something we
   maintain. It syncs with your real calendar, so it can never offer a slot
   you are already busy for, and it sends its own confirmations and
   reminders. That is a lot of moving parts to own for free.

   [TODO: create the account and paste your booking link below.]

   Recommended, all free at the level this needs:

     Cal.com          cal.com           open source, embeds cleanly,
                                        free forever for one person
     Google Calendar  calendar.google   "Appointment schedule", free with the
                      .com             Gmail account you already have
     Calendly         calendly.com      free tier allows one event type

   `url` is the public booking page. `embed` true drops it into the page in
   an iframe; false shows a button that opens it in a new tab. If the URL is
   left blank the page falls back to the message form alone, so the page is
   never broken, just reduced. */

const scheduler = {
  provider: 'cal.com',
  url: 'https://cal.com/kova-icu0vr/15min',
  embed: true,
  duration: '15 minutes',

  /* true  = every "Book a call" button opens the Cal page directly, in a new
             tab. One click from anywhere to a bookable slot.
     false = they go to /book first, which shows the same calendar embedded
             plus a message form underneath.

     Direct is fewer clicks and converts better. The /book page stays live
     either way, linked from the footer as "Send a message", because someone
     who cannot find a slot still needs a way to reach you. */
  direct: false,
};

/* ------------------------------------------------ website brief generator */
/* The questions asked one at a time on /prompt-generator. Edit the wording,
   add or remove questions, reorder them. The page rebuilds itself from this
   list and needs no code changes.

   type: 'text'    one line
         'longtext' a paragraph box
         'choice'  pick one
         'multi'   pick any number
   Every question except those marked optional:true must be answered before
   the visitor can move on. */

const promptGenerator = {
  intro: {
    eyebrow: 'Free tool',
    heading: 'Get a prompt that builds your website.',
    lead: 'Answer eleven plain questions, one at a time. You get a finished prompt to paste into Claude or ChatGPT, a preview of how your site could look, and the server file that makes the links work. Free, no email, nothing stored.',
    start: 'Start',
    note: 'Everything happens in your browser. Nothing is sent anywhere unless you choose to send it.',
  },

  questions: [
    {
      id: 'name',
      type: 'text',
      question: 'What is your business called?',
      help: 'Write it exactly as you want it to appear on the site.',
    },
    {
      id: 'business',
      type: 'text',
      question: 'What does your business do?',
      help: 'Say it the way you would say it to a neighbour. No need to make it sound clever.',
    },
    {
      id: 'area',
      type: 'text',
      question: 'Where do you work?',
      help: 'List the towns or areas you cover, or your shop address if customers come to you. This is what gets a local business found.',
    },
    {
      id: 'contact',
      type: 'text',
      question: 'How should customers reach you?',
      help: 'A phone number, an email address, or both. Whatever you put here goes on every page of the site.',
    },
    {
      id: 'goal',
      type: 'multi',
      max: 3,
      question: 'What do you most want the website to do for you?',
      help: 'Tick everything that applies. Put the most important one first, because that is the one the design will be built around.',
      options: [
        'Get my phone ringing',
        'Let people book me online',
        'Get people asking for prices',
        'Sell my products',
        'Make us look professional',
      ],
    },
    {
      id: 'audience',
      type: 'text',
      question: 'Who are your customers?',
      help: 'Describe the customers you actually want, rather than everyone who might visit.',
    },
    {
      id: 'action',
      type: 'choice',
      question: 'When someone lands on your site, what should they be able to do?',
      help: 'This is the button. Most websites get this wrong and just say "contact us".',
      options: [
        'Ring me in one tap',
        'Pick a time and book it',
        'Ask me for a price',
        'Buy something',
        'Send me a message',
      ],
    },
    {
      id: 'pages',
      type: 'multi',
      question: 'Which pages do you want?',
      help: 'Tick the ones you would actually use. Five good pages beat fifteen empty ones, and you can add more later.',
      options: ['Home', 'About us', 'What we do', 'Photos of our work', 'Reviews',
        'Areas we cover', 'Contact', 'Book online', 'Shop', 'News'],
    },
    {
      id: 'content',
      type: 'choice',
      question: 'Do you have your own photos, and have you written what the pages will say?',
      help: 'Photos of your actual work or premises, and the text for each page. Be honest. If you say you have them, the prompt asks for a site built around real content. If you do not, it asks for clearly marked gaps instead of made-up filler.',
      options: [
        'Yes, I have photos and the text',
        'I have some of it',
        'Neither yet',
      ],
    },
    {
      id: 'style',
      type: 'multi',
      question: 'What should it look like?',
      help: 'Pick up to three.',
      options: ['Clean and simple', 'Bold and loud', 'Warm and friendly',
        'Smart and understated', 'Modern and techy', 'Classic and trustworthy'],
      max: 3,
    },
    {
      id: 'extras',
      type: 'longtext',
      question: 'Anything else we should know?',
      help: 'Opening hours, the services you want listed, something you hated about your last website. All of it goes into the prompt.',
      placeholder: 'Optional. Leave it blank if nothing comes to mind.',
      optional: true,
    },
  ],
};

module.exports = { origin, brand, contact, nav, analytics, pages, faq, scheduler, promptGenerator };
