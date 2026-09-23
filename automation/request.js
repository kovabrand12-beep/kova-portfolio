// Create a PENDING appointment from a public site submission.
// Emails Kova an internal heads-up and sends the client a soft acknowledgement.
// A Zoom link is attached later via confirm.js.
//
// Inputs come from the repository_dispatch payload (client_payload.*), passed in
// as APT_* env vars by the workflow.

import { DateTime } from "luxon";
import { readInput } from "./args.js";
import { assertEmailConfigured, EMAIL, BRAND } from "./config.js";
import { loadAppointments, saveAppointments } from "./store.js";
import { createAppointment } from "./appointment.js";
import { sendMail } from "./email.js";
import { internalRequestEmail } from "./templates.js";

async function main() {
  assertEmailConfigured();

  const input = {
    name: readInput("name", { required: true }),
    email: readInput("email", { required: true }),
    start: readInput("start", { required: true }),
    timezone: readInput("timezone"),
    notes: readInput("notes"),
    status: "pending",
    source: "site",
  };

  const appt = createAppointment(input, DateTime.now());

  const appointments = await loadAppointments();
  if (appointments.some((a) => a.id === appt.id && a.status !== "cancelled")) {
    console.log(`Duplicate request for ${appt.id} — ignoring.`);
    return;
  }
  appointments.push(appt);
  await saveAppointments(appointments);

  // Heads-up to Kova.
  const internal = internalRequestEmail(appt);
  await sendMail({
    to: EMAIL.internalNotify,
    subject: internal.subject,
    html: internal.html,
    text: internal.text,
  });

  // Soft acknowledgement to the client.
  await sendMail({
    to: appt.email,
    subject: `We got your request — ${BRAND.name}`,
    text:
      `Hi ${appt.name.split(/\s+/)[0]},\n\n` +
      `Thanks for reaching out. We've received your request for ${DateTime.fromISO(appt.startISO, { setZone: true }).toFormat("cccc, LLLL d 'at' h:mm a ZZZZ")} ` +
      `and will confirm shortly with a Zoom link.\n\n${BRAND.signature}`,
    html:
      `<p>Hi ${appt.name.split(/\s+/)[0]},</p>` +
      `<p>Thanks for reaching out. We've received your request for ` +
      `<strong>${DateTime.fromISO(appt.startISO, { setZone: true }).toFormat("cccc, LLLL d 'at' h:mm a ZZZZ")}</strong> ` +
      `and will confirm shortly with a Zoom link.</p><p>${BRAND.signature}</p>`,
  });

  console.log(`\n📥 Pending request saved: ${appt.id}`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
