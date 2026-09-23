// Send any reminder emails that are now due. Runs on a schedule (every ~10 min).
// Idempotent: each reminder is stamped once sent, so re-runs never double-send.

import { DateTime } from "luxon";
import { loadAppointments, saveAppointments } from "./store.js";
import { dueReminders, isPast } from "./appointment.js";
import { REMINDER_SCHEDULE } from "./config.js";
import { sendMail } from "./email.js";
import { reminderEmail } from "./templates.js";

async function main() {
  const appointments = await loadAppointments();
  // APT_NOW lets tests pin "now" to an ISO timestamp. Unset in production.
  const now = process.env.APT_NOW ? DateTime.fromISO(process.env.APT_NOW) : DateTime.now();
  if (process.env.APT_NOW) console.log(`(using APT_NOW = ${now.toISO()})`);
  let changed = false;
  let sent = 0;

  for (const appt of appointments) {
    if (appt.status !== "confirmed") continue;

    // Meeting has passed: close out any reminders that never fired.
    if (isPast(appt, now)) {
      for (const r of REMINDER_SCHEDULE) {
        if (appt.reminders[r.key] === null) {
          appt.reminders[r.key] = "missed";
          changed = true;
        }
      }
      if (appt.status === "confirmed" && !appt.completedAt) {
        appt.completedAt = now.toISO();
        changed = true;
      }
      continue;
    }

    for (const r of dueReminders(appt, now)) {
      const msg = reminderEmail(appt, r.label);
      try {
        await sendMail({ to: appt.email, subject: msg.subject, html: msg.html, text: msg.text });
        appt.reminders[r.key] = now.toISO();
        changed = true;
        sent++;
      } catch (err) {
        console.error(`  ⚠ failed to send ${r.key} reminder for ${appt.id}: ${err.message}`);
        // leave it unsent — next run retries
      }
    }
  }

  if (changed) await saveAppointments(appointments);
  console.log(`Done. ${sent} reminder(s) sent, ${changed ? "store updated" : "no changes"}.`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
