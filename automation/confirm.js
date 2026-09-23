// Confirm a PENDING appointment by attaching a Zoom link.
// Sends the client the confirmation email and arms the reminders.
//
// Usage:
//   node automation/confirm.js --id apt_20260912T150000_jane-doe \
//     --zoom "https://zoom.us/j/123456789"
//   node automation/confirm.js --email jane@x.com --zoom "https://zoom.us/j/123"
//
// You may also override --start / --timezone here if the client asked for a
// different time than they originally requested.

import { DateTime } from "luxon";
import { readInput } from "./args.js";
import { assertEmailConfigured, REMINDER_SCHEDULE } from "./config.js";
import { loadAppointments, saveAppointments } from "./store.js";
import { parseStart } from "./appointment.js";
import { sendMail } from "./email.js";
import { confirmationEmail } from "./templates.js";

async function main() {
  assertEmailConfigured();

  const id = readInput("id");
  const email = readInput("email");
  const zoomLink = readInput("zoom", { required: true });
  const newStart = readInput("start");
  const newTz = readInput("timezone");
  if (!id && !email) throw new Error("provide --id or --email to identify the appointment");

  const appointments = await loadAppointments();
  const now = DateTime.now();

  const matches = appointments.filter((a) => {
    if (a.status === "cancelled") return false;
    if (id) return a.id === id;
    return a.email.toLowerCase() === email.toLowerCase() && a.status === "pending";
  });
  if (matches.length === 0) throw new Error("no matching pending appointment found");
  if (matches.length > 1) {
    throw new Error(
      `multiple matches — pass --id. Candidates:\n` + matches.map((a) => `  ${a.id}`).join("\n")
    );
  }

  const appt = matches[0];

  if (newStart) {
    const start = parseStart(newStart, newTz || appt.timezone);
    if (start <= now) throw new Error("new start time is in the past");
    appt.startISO = start.toISO();
    if (newTz) appt.timezone = newTz;
  }

  appt.zoomLink = zoomLink;
  appt.status = "confirmed";
  appt.confirmedAt = now.toISO();
  appt.reminders.confirmation = now.toISO();

  // (Re)arm reminders whose trigger is still in the future; mark the rest "n/a".
  const start = DateTime.fromISO(appt.startISO, { setZone: true });
  for (const r of REMINDER_SCHEDULE) {
    if (appt.reminders[r.key] && appt.reminders[r.key] !== "n/a") continue; // already sent
    const trigger = start.minus({ minutes: r.minutesBefore });
    appt.reminders[r.key] = trigger <= now ? "n/a" : null;
  }

  const msg = confirmationEmail(appt);
  await sendMail({ to: appt.email, subject: msg.subject, html: msg.html, text: msg.text });

  await saveAppointments(appointments);
  console.log(`\n✅ Confirmed ${appt.id} — confirmation sent to ${appt.email}`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
