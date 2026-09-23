// Central configuration for the appointment automation.
// Values come from environment variables (GitHub Actions secrets / repo variables)
// so nothing sensitive lives in the repo.

export const BRAND = {
  name: "Kova",
  // Shown in email signatures and the "from" name.
  signature: "The Kova Team",
  // Public site URL — used for links in emails. Override with SITE_URL if needed.
  siteUrl: process.env.SITE_URL || "https://kovabrand12-beep.github.io/kova-portfolio",
};

export const EMAIL = {
  // Gmail / Google Workspace address that sends the mail.
  user: process.env.GMAIL_USER || "",
  // Google "App Password" (16 chars, no spaces). NOT the normal account password.
  appPassword: (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, ""),
  // Optional: where replies should go, and where internal notifications land.
  // Defaults to the sending address.
  get replyTo() {
    return process.env.REPLY_TO || this.user;
  },
  get internalNotify() {
    return process.env.INTERNAL_NOTIFY || this.user;
  },
};

// Default IANA timezone used when a booking doesn't specify one.
export const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || "America/New_York";

// Reminders to send before an appointment, in minutes before the start time.
// key is stored on the appointment record; label is shown to the client.
export const REMINDER_SCHEDULE = [
  { key: "24h", minutesBefore: 24 * 60, label: "24 hours" },
  { key: "3h", minutesBefore: 3 * 60, label: "3 hours" },
  { key: "1h", minutesBefore: 60, label: "1 hour" },
];

// Path to the JSON datastore, relative to the repo root.
export const STORE_PATH = "automation/appointments.json";

// Grace window (minutes): a reminder whose trigger time was missed is still sent
// if we're within this many minutes past the trigger AND before the start time.
export const REMINDER_GRACE_MINUTES = 24 * 60;

export function assertEmailConfigured() {
  if (process.env.EMAIL_DRYRUN === "1" || process.env.EMAIL_DRYRUN === "true") return;
  const missing = [];
  if (!EMAIL.user) missing.push("GMAIL_USER");
  if (!EMAIL.appPassword) missing.push("GMAIL_APP_PASSWORD");
  if (missing.length) {
    throw new Error(
      `Missing required env var(s): ${missing.join(", ")}. ` +
        `Set them as GitHub Actions secrets (Settings → Secrets and variables → Actions).`
    );
  }
}
