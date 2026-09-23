// Create a CONFIRMED appointment and email the client right away.
// This is the manual / admin path — you already have a Zoom link.
//
// Usage:
//   node automation/book.js --name "Jane Doe" --email jane@x.com \
//     --start "2026-09-12 15:00" --timezone "America/New_York" \
//     --zoom "https://zoom.us/j/123456789" --notes "Kickoff call"

import { DateTime } from "luxon";
import { readInput } from "./args.js";
import { assertEmailConfigured } from "./config.js";
import { loadAppointments, saveAppointments } from "./store.js";
import { createAppointment } from "./appointment.js";
import { sendMail } from "./email.js";
import { confirmationEmail } from "./templates.js";

async function main() {
  assertEmailConfigured();

  const input = {
    name: readInput("name", { required: true }),
    email: readInput("email", { required: true }),
    start: readInput("start", { required: true }),
    timezone: readInput("timezone"),
    zoomLink: readInput("zoom", { required: true }),
    notes: readInput("notes"),
    status: "confirmed",
    source: readInput("source", { fallback: "manual" }),
  };

  const now = DateTime.now();
  const appt = createAppointment(input, now);

  const appointments = await loadAppointments();
  if (appointments.some((a) => a.id === appt.id && a.status !== "cancelled")) {
    throw new Error(`An appointment with id ${appt.id} already exists.`);
  }

  const msg = confirmationEmail(appt);
  await sendMail({ to: appt.email, subject: msg.subject, html: msg.html, text: msg.text });

  appointments.push(appt);
  await saveAppointments(appointments);

  console.log(`\n✅ Booked ${appt.id}`);
  console.log(`   ${appt.name} <${appt.email}>  ${appt.startISO}  (${appt.timezone})`);
  console.log(`   Reminders queued: ${Object.entries(appt.reminders)
    .filter(([k, v]) => k !== "confirmation" && v === null)
    .map(([k]) => k)
    .join(", ") || "none (booked too close to start time)"}`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
