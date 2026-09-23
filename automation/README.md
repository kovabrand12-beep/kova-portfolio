# Kova appointment email automation

Confirmation + 24h / 3h / 1h reminder emails for booked calls, running entirely
on GitHub Actions. No server.

```
client books ──► appointment record ──► confirmation email (with Zoom link)
                        │
                        └──► scheduled job every 10 min ──► 24h / 3h / 1h reminders
```

## How it fits together

| Piece | What it does |
|---|---|
| `automation/appointments.json` | The datastore. A plain JSON array, committed to the repo. |
| `automation/book.js` | Create a **confirmed** appointment + send the confirmation now. |
| `automation/request.js` | Record a **pending** request from the public page + notify Kova. |
| `automation/confirm.js` | Attach a Zoom link to a pending request → confirmation goes out. |
| `automation/run-reminders.js` | Send any reminders that are due. Runs on a schedule. |
| `automation/cancel.js` | Cancel an appointment + email the client. |
| `.github/workflows/appointment-*.yml` | The buttons + the cron that run the above. |
| `book.html` | Public booking page on the Kova site. |
| `automation/cloudflare-worker.js` | Optional proxy so `book.html` can submit without exposing a token. |

## One-time setup

### 1. Add the Gmail credentials as repo secrets

Google account → **Manage your account → Security → 2-Step Verification → App passwords**.
Create one called "Kova automation" and copy the 16-character password.

In the repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|---|---|
| `GMAIL_USER` | the Workspace/Gmail address that sends the mail (e.g. `kova.brand12@gmail.com`) |
| `GMAIL_APP_PASSWORD` | the 16-char app password (spaces are stripped automatically) |
| `INTERNAL_NOTIFY` | *(optional)* where "new request" notices go. Defaults to `GMAIL_USER`. |
| `REPLY_TO` | *(optional)* Reply-To address. Defaults to `GMAIL_USER`. |

### 2. Add repo variables (Settings → Secrets and variables → Actions → Variables)

| Variable | Value |
|---|---|
| `DEFAULT_TIMEZONE` | IANA zone used when a booking omits one, e.g. `America/New_York` |
| `SITE_URL` | *(optional)* your live site URL, used in email footers |

### 3. Let workflows commit back

**Settings → Actions → General → Workflow permissions → Read and write permissions.**
(The workflows commit the updated `appointments.json` after every change.)

### 4. (Optional) the public booking page

`book.html` works out of the box in **email-fallback mode**: submitting opens the
visitor's mail app with a pre-filled message to `kova.brand12@gmail.com`.

For a seamless submit, deploy `automation/cloudflare-worker.js` (instructions are
in that file — free, ~3 min) and paste its URL into `BOOKING_ENDPOINT` near the
top of `book.html`.

## Day-to-day use

### You arranged a call yourself
Actions tab → **Appointment — book** → Run workflow → fill in name, email,
start (`2026-09-12 15:00`, 24-hour), timezone, Zoom link, notes → Run.
The client gets the confirmation immediately; reminders are armed automatically.

### A client used the booking page
1. You get a "New booking request" email with an appointment **id**.
2. Actions tab → **Appointment — confirm / add Zoom link** → Run workflow →
   paste the id and the Zoom link (optionally a new time) → Run.
3. Confirmation goes out; reminders are armed.

### Cancel
Actions tab → **Appointment — cancel** → id (or email) → Run. Tick *silent* to
skip the client email.

## Notes & limits

- **Reminder timing:** the cron runs every 10 minutes and GitHub can delay
  scheduled runs under load, so a reminder may arrive a few (occasionally 10–20)
  minutes after its exact mark. Each reminder only fires inside its own window
  (24h→3h, 3h→1h, 1h→start); one whose whole window was missed is skipped, not
  sent late with the wrong wording.
- **Booked close to the start time:** any reminder whose moment has already
  passed at booking time is marked `n/a`. Book <1h out and only the confirmation
  goes out.
- **Idempotent:** each reminder is stamped once sent, so re-runs never
  double-send.
- **Gmail limits:** ~500 recipients/day on consumer Gmail, 2,000 on Workspace —
  far above this use case.

## Local testing (no email sent)

```bash
npm install
npm test                                   # offline logic checks

EMAIL_DRYRUN=1 node automation/book.js \
  --name "Jane Doe" --email jane@example.com \
  --start "2026-12-01 15:00" --timezone America/New_York \
  --zoom "https://zoom.us/j/123"

EMAIL_DRYRUN=1 APT_NOW="2026-11-30T15:05:00-05:00" node automation/run-reminders.js
```

`EMAIL_DRYRUN=1` logs emails instead of sending. `APT_NOW` pins "now" for testing
reminder timing.
