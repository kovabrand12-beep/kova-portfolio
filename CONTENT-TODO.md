# Content to finish before launch

Everything on this list is a placeholder or an unverified claim currently in
the build. Ordered by what it costs if it ships wrong, worst first.

Run `npm run checklist` after each change. Items 1-3 must be cleared before
kova-scaling.com goes live.

---

## 1. Cloudflare Web Analytics token, the only failing check

**Where:** `content/site.cjs` → `analytics.token`.

1. Cloudflare dashboard → **Analytics & Logs** → **Web Analytics**
2. **Add a site** → enter `kova-scaling.com`
3. Copy the token out of the snippet it gives you (the long hex string)
4. Paste it into `analytics.token` and run `npm run build`

It is cookieless, so no consent banner is needed and none is shipped. Leave
the token blank and the script is simply left out of the build — the site
works, but pre-launch check 19 fails and you have no way to tell a client
whether the site is working.

---

## 2. Email address on your own domain

**Where:** `content/site.cjs` → `contact.email`, currently
`kova.brand12@gmail.com`.

A Gmail address on a business website reads as less established than the work
here deserves, and it is the address shown on the booking form, in the footer,
and in the failure message when a form submission does not go through.

Hostinger includes mailboxes on your plan: set up `hello@kova-scaling.com`
(or similar) and change the one line. Note that `submit.php` already sends
**From:** `no-reply@kova-scaling.com` — that mailbox needs to exist, or the
host may refuse to send the notification at all.

---

## 3. Search Console and the sitemap

Not a placeholder, but nothing is indexed until it is done. After the domain
is pointed and HTTPS is live:

1. Add `kova-scaling.com` at [search.google.com/search-console](https://search.google.com/search-console)
2. Verify by DNS TXT record through Hostinger's DNS panel
3. Submit `https://kova-scaling.com/sitemap.xml`
4. Request indexing for the homepage

The sitemap is generated on every build and already lists all 43 pages with
the demo builds at a lower priority so they cannot outrank the studio itself.

---

## 4. Real photography, later

There is no photography of Kova anywhere on the site; the design carries it on
type and colour instead, which works. The demo builds use Unsplash stock, which
is fine for invented businesses.

Worth having eventually: a real photo of whoever runs Kova on the About page.
For a small studio, a face is a strong trust signal and there is currently
none. Flagging it rather than papering over it with stock.

---

## Resolved, no longer a blocker

- **The About page.** Written, with Mawana Chidovi named as the founder and
  the positioning stated plainly: a site is judged on whether it brings the
  owner more work than it cost. The name is also in the homepage structured
  data and in llms.txt, so an assistant asked who runs Kova has an answer.
- **Privacy policy and terms.** Completed. Ontario governing law, payment in
  full up front with refund terms, 24-month retention, and a disclosure in
  both about how AI is used in the work and what that means for a client's
  material. Still worth a lawyer's eye before you rely on them in a dispute,
  and the code comments at the top of both files say so.

- **Booking.** Connected to Cal.com at `cal.com/kova-icu0vr/15min`, a
  15-minute event. The embed themes itself dark with a gold accent to match
  the site. Availability is set inside Cal.com, not in this repo, so it stays
  in sync with the real calendar.
- **Phone number.** Set to (289) 455-9324. It now appears in the header of
  every page as a tappable link, in the demo-site bar, on the booking form
  and in the structured data. Pre-launch check 20 passes.

- **Packages and the custom calendar.** Both removed. The three package tiers
  are gone from the site and from the structured data, and booking is handled
  by an external scheduler rather than a calendar we maintain. Delivery is
  stated as three to five days throughout.

- **Pricing.** The three package tiers on Work With Us no longer quote any
  figure. They describe scope only, and a "why there are no prices on this
  page" block explains the four things that actually move the number. Nothing
  invented is published, so this is closed rather than deferred. If you later
  decide to publish real prices, add them there.

## Verified, not a placeholder

- **Baptiste Plumbing** on the homepage is a real, live client site. Its
  description (service areas, review count, the 24/7 line) was taken from
  baptisteplumbing.com on 13 September 2026. Re-check before launch in case
  the review count has moved — it is quoted as "60+".
- The nine demo builds are self-initiated. The footer and `terms.html` §3 both
  say plainly that those businesses are invented, which is what keeps the
  fictional prices, hours and reviews in them honest.
