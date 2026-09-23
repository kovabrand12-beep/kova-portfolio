# Deploying to Hostinger

The site is static files plus one PHP script. There is no build server, no
Node runtime on the host and nothing to install — you upload a folder.

Target: **kova-scaling.com**, on Hostinger shared hosting.

---

## Two ways to deploy

**The first time**, upload by hand. Once, to get the files onto the server
and prove it all works. Steps 1 to 8 below.

**After that**, push to GitHub and it deploys itself. Set that up once and a
content change becomes: edit, commit, push. No zipping, no File Manager. See
[Automatic deploys](#automatic-deploys) at the end.

```bash
npm run checklist     # builds and audits. Must pass before anything ships.
```

---

## Before the first deploy

Everything that blocked launch is done: the booking link, the phone number,
the About page and both legal pages. The site is ready to upload as it
stands.

[CONTENT-TODO.md](CONTENT-TODO.md) lists what is left, none of which stops
you going live. Item 1, the analytics token, is the only thing still failing
the pre-launch audit.

---

## 1. Build

```bash
npm run images        # only when the brand or the social card changes
npm run checklist
```

`npm run checklist` refuses to pass on a broken link, a missing meta
description, a colour contrast failure or an unprotected folder. **Do not
upload a build that fails it.** The output looks like this:

```
  PASS  16 No broken links      every internal link and anchor resolves
  20/20 passing
```

The built site lands in `UPLOAD-TO-HOSTINGER/`. That folder is generated —
never edit anything inside it, because the next build wipes it.

---

## 2. Point the domain at the hosting

You bought the domain and the hosting from Hostinger, so this is an
assignment, not a DNS change.

1. hPanel → **Websites** → your plan → **Dashboard**
2. If the plan was created against a temporary domain, use **Website** →
   **Change Domain** and set it to `kova-scaling.com`
3. hPanel → **Domains** → **DNS / Nameservers** — confirm the nameservers are
   Hostinger's own (`ns1.dns-parking.com` / `ns2.dns-parking.com`, unless you
   have deliberately moved DNS elsewhere)

Propagation is usually minutes on a domain bought from the same provider, but
allow up to 24 hours before assuming something is wrong.

---

## 3. Upload

**File Manager** (easiest): hPanel → **Files** → **File Manager** →
`public_html`. Delete Hostinger's `default.php` placeholder if present, then
upload. Upload the **contents** of `UPLOAD-TO-HOSTINGER/`, not the folder
itself — `index.html` must sit directly in `public_html/`.

Zip the folder first and use File Manager's **Extract**; uploading 40+ files
individually through a browser is slow and drops files silently.

**FTP** (better for repeat deploys): hPanel → **Files** → **FTP Accounts**.

```
Host:      ftp.kova-scaling.com
User:      (from the FTP Accounts page)
Remote:    /public_html
Local:     UPLOAD-TO-HOSTINGER/
```

Make sure your FTP client uploads **hidden files** — `.htaccess` starts with a
dot and most clients skip it by default. Without it every clean URL 404s and
the private folders become public. This is the single most common way this
deploy goes wrong.

---

## 4. Turn on HTTPS

hPanel → **Security** → **SSL** → install the free Let's Encrypt certificate
for `kova-scaling.com`.

Wait for it to issue **before** you visit the site. `.htaccess` forces HTTPS,
so loading the site over http before the certificate exists gives a browser
warning, and the browser will then remember the HSTS header for two years.

If you hit that anyway, clear it at `chrome://net-internals/#hsts` (Delete
domain security policies).

---

## 5. Turn on online booking

`content/site.cjs` -> `scheduler.url`. Create a 30-minute event in Cal.com,
Google Calendar or Calendly, paste the public link, rebuild and re-upload.
Until you do, the booking page shows a notice and falls back to the message
form. See CONTENT-TODO item 1.

This is the "backend" for scheduling: it lives in that tool, synced to your
real calendar, so the site never has to know whether you are free.

---

## 6. Make the message form actually send

The form stores every enquiry to disk first, so nothing is ever lost. Getting
the **email** out is the part that needs setting up, and it fails silently if
you skip it: `mail()` returns success and nothing arrives.

### Step one: create the mailbox

hPanel -> **Emails** -> **Email Accounts** -> create
`no-reply@kova-scaling.com`.

This is not optional. Hostinger rejects mail claiming to be from a domain it
hosts when the mailbox does not exist, and it rejects it quietly. If you only
do one thing on this page, do this one.

### Step two: check the PHP version

hPanel -> **Advanced** -> **PHP Configuration** -> set **8.1 or newer**.

`submit.php` is written to run on 7.4 and up, so this is belt and braces
rather than a hard requirement, but older versions have their own mail
quirks and there is no reason to stay on one.

### Step three: if email still does not arrive, use SMTP

Shared `mail()` is unreliable and gets filtered as spam more often than not.
SMTP authenticates properly and lands in the inbox. Create a file called
`mail-config.php` **on the server**, next to `submit.php`:

```php
<?php return [
  'from' => 'no-reply@kova-scaling.com',
  'smtp' => 'smtp.hostinger.com',
  'port' => 465,
  'user' => 'no-reply@kova-scaling.com',
  'pass' => 'the mailbox password you just set',
];
```

`submit.php` picks it up automatically and switches from `mail()` to
authenticated SMTP. No other change needed.

**Create this file through hPanel's File Manager, not in the repository.**
It holds a password, `.gitignore` excludes it, and it must never be
committed. It is also the reason `.htaccess` denies `.php` config files from
being fetched over HTTP.

### Checking whether it worked

Every failed send is logged. Look in the leads folder for
`mail-failures.log`:

```
2026-09-23T00:48:19+00:00    someone@example.com    mail() returned false
2026-09-23T01:02:11+00:00    other@example.com      auth: 535 Authentication failed
```

An empty or missing file means every message has gone out. The line tells you
what the mail server actually said, which is the difference between "it is
broken" and "the password is wrong".

---

## 7. Where the enquiries actually arrive

Two places, on purpose. Email is the one you will use day to day; the files
are the safety net for when email fails, which it does quietly and more often
than people expect.

### 1. Email, as they come in

Every enquiry is emailed to the address in `NOTIFY_TO` at the top of
`submit.php`, currently `kova.brand12@gmail.com`. Reply-To is set to the
person who wrote in, so hitting reply in Gmail goes straight back to them.

This only works once step 6 is done. If the mailbox does not exist, nothing
arrives and nothing tells you.

### 2. Files on the server, as a permanent record

Written **before** the email is attempted, so an enquiry is never lost to a
mail problem.

**There is no leads folder in the upload, and that is correct.** `submit.php`
creates its own storage the first time somebody submits the form. Nothing
appears until then, so do not go looking for it before your first test
message and conclude the upload failed.

It creates `kova-leads/` **one level above `public_html`**. In hPanel go to
**Files** -> **File Manager** and click up out of `public_html`:

```
kova-leads/                      <- created on the first submission
  enquiries-2026-09.csv          <- open this one
  enquiries-2026-09.jsonl        <- the full record, one line per enquiry
  mail-failures.log              <- only exists if an email failed to send
```

That location is deliberate. It is outside the web root, so the files are
unreachable over HTTP even if `.htaccess` fails to upload, and they hold
names, email addresses and IP addresses.

If your plan will not let PHP write above `public_html`, it falls back to
`public_html/leads/`, creates that instead, and writes its own deny file in
there. Either way you do not have to create anything by hand.

**The .csv is the one to open.** Download it and it opens straight into
Excel, Numbers or Google Sheets: one row per enquiry with the date, name,
email and message. A new file starts each month.

The `.jsonl` alongside it holds the same enquiries plus the IP address and
browser, which is what you would need if you ever had to prove where a
submission came from. It is not meant to be read by eye.

### If an enquiry does not arrive

1. Open `kova-leads/` and look for the enquiry. If the folder does not exist
   at all, no submission has ever reached the server. If it is there, the
   form worked and the problem is only email.
2. Open `mail-failures.log`. It records what the mail server actually said,
   for example `auth: 535 Authentication failed`, which means the password in
   `mail-config.php` is wrong.
3. If there is no log and no file, the submission never reached the server.
   Check the browser console on the booking page for an error.

---

## 8. Verify the live site

```bash
# clean URLs and HTTPS
curl -sI https://kova-scaling.com/about | head -1          # 200
curl -sI http://kova-scaling.com/about | head -2           # 301 -> https
curl -sI https://www.kova-scaling.com/ | head -2           # 301 -> non-www
curl -sI https://kova-scaling.com/about.html | head -2     # 301 -> /about

# the private things must not be public
curl -sI https://kova-scaling.com/leads/ | head -1         # 404
curl -sI https://kova-scaling.com/package.json | head -1   # 404
curl -sI https://kova-scaling.com/.htaccess | head -1      # 404

# these must be public
curl -sI https://kova-scaling.com/robots.txt | head -1     # 200
curl -sI https://kova-scaling.com/sitemap.xml | head -1    # 200
curl -sI https://kova-scaling.com/llms.txt | head -1       # 200


# custom 404
curl -sI https://kova-scaling.com/nope | head -1           # 404
```

Then by hand:

- Book a slot through the scheduler and confirm it lands in your real calendar.
- Send a message through the form with a real address. You should get the
  email, **and** a new line should appear in `enquiries-YYYY-MM.jsonl`. Check
  both: the point of storing them is that email is the part that fails quietly.
- Open the site on a phone. Check the menu opens, the phone number is tappable
  and nothing scrolls sideways.
- Paste the URL into Slack, iMessage or WhatsApp and confirm the gold social
  card appears.

---

## 9. Tell Google it exists

Nothing is indexed until you do this. See CONTENT-TODO item 3: add the
property in Search Console, verify by DNS TXT, submit
`https://kova-scaling.com/sitemap.xml`.

Worth checking the structured data while you are there. Paste the homepage
and `/work-with-us` into
[search.google.com/test/rich-results](https://search.google.com/test/rich-results).
The homepage should report a ProfessionalService and a WebSite; Work With Us
should report an FAQPage with seven questions.

Assistants and answer engines get their own summary at
`https://kova-scaling.com/llms.txt`, generated from `content/site.cjs` on
every build. Check it reads correctly after any content change:

```bash
curl -s https://kova-scaling.com/llms.txt | head -20
```

---

## Testing the .htaccess before you upload

```bash
npm run htaccess
```

Serves the built site through a **real Apache** with the real `.htaccess` and
asserts every route, redirect and protected path.

Use it whenever you touch `.htaccess`. `npm run serve` uses PHP's built-in
server, which ignores `.htaccess` completely and will happily report a broken
rewrite rule as working — that is exactly how a broken redirect reaches a live
site.

---

## When something is wrong

| What you see | Almost always |
|---|---|
| Every page but the homepage 404s | `.htaccess` did not upload — it is a hidden file |
| Redirect loop, or "too many redirects" | SSL not issued yet, or a proxy in front of the host |
| Site loads with no styling | Uploaded the folder instead of its contents; check `assets/` sits next to `index.html` |
| Form says it sent, no email arrives | The mailbox in step 6 does not exist, or `mail()` is being filtered. Check `mail-failures.log`; the enquiry itself is safe on disk either way |
| `mail-failures.log` says "auth: 535" | Wrong password in `mail-config.php` |
| Form returns a 500 | PHP older than 7.4, or the leads folder is not writable |
| Booking stored but no email, repeatedly | Hostinger's `mail()` quota, or the notification address filtering it as spam |
| Old page still showing | HTML is served with no cache, but Cloudflare or the browser may hold it — hard-refresh first |

---

## Rolling back

There is no build server and no database, so a rollback is just re-uploading
the previous build:

```bash
git log --oneline          # find the last good commit
git checkout <sha>
npm run checklist
# upload UPLOAD-TO-HOSTINGER/ again
git checkout main
```

Keep the last zip you uploaded until the new one is verified, and a rollback
is a two-minute File Manager job.


---

## Automatic deploys

Set this up once and you stop touching File Manager.

`.github/workflows/deploy.yml` builds the site, refuses to ship if anything
is broken, and uploads only the files that changed. A typical content edit
moves one or two files rather than all seventy-nine.

### One-time setup

**1. Get your FTP details.** hPanel -> **Files** -> **FTP Accounts**. You
need the hostname, the username and the password.

**2. Put them in GitHub as secrets**, not in any file. In your repository:
**Settings** -> **Secrets and variables** -> **Actions** -> **New repository
secret**. Add three:

| Name | Value |
|---|---|
| `FTP_SERVER` | `ftp.kova-scaling.com` |
| `FTP_USERNAME` | from the FTP Accounts page |
| `FTP_PASSWORD` | the password for that account |

Secrets are write-only. Nobody can read them back out, including you, and
they never appear in the build log. That is why this is safer than keeping
credentials in a file on your machine.

**3. Push.**

```bash
git add -A
git commit -m "Update the About page"
git push
```

Watch it run under the **Actions** tab. First deploy uploads everything and
takes a couple of minutes; after that it uploads only what changed and takes
seconds.

### What it will not touch

Two things live on the server and are not in this repository. The deploy is
told to leave them alone:

- `mail-config.php`, which holds your SMTP password
- `leads/`, the fallback enquiry store

Without those exclusions a deploy would delete both, breaking the contact
form and losing enquiries.

### When it refuses to deploy

That is the point of it. The audit runs before the upload, so a broken link
or a duplicate meta description stops the deploy instead of reaching the
live site. The Actions log tells you which check failed.

The audit passes 20/20 as things stand, so a failure means something you
just changed broke it. Read the log, fix it, push again.
