// Cancel an appointment and notify the client.
//
// Usage:
//   node automation/cancel.js --id apt_20260912T150000_jane-doe
//   node automation/cancel.js --email jane@x.com          (cancels their next upcoming one)
//   node automation/cancel.js --id ... --silent           (no email to the client)

import { DateTime } from "luxon";
import { readInput } from "./args.js";
import { assertEmailConfigured } from "./config.js";
import { loadAppointments, saveAppointments } from "./store.js";
import { isPast } from "./appointment.js";
import { sendMail } from "./email.js";
import { cancellationEmail } from "./templates.js";

async function main() {
  const id = readInput("id");
  const email = readInput("email");
  const silent = process.argv.includes("--silent") || process.env.APT_SILENT === "true";
  if (!id && !email) throw new Error("provide --id or --email");
  if (!silent) assertEmailConfigured();

  const appointments = await loadAppointments();
  const now = DateTime.now();

  let appt;
  if (id) {
    appt = appointments.find((a) => a.id === id);
  } else {
    appt = appointments
      .filter((a) => a.email.toLowerCase() === email.toLowerCase() && a.status !== "cancelled" && !isPast(a, now))
      .sort((a, b) => a.startISO.localeCompare(b.startISO))[0];
  }
  if (!appt) throw new Error("no matching appointment found");
  if (appt.status === "cancelled") {
    console.log(`${appt.id} is already cancelled.`);
    return;
  }

  appt.status = "cancelled";
  appt.cancelledAt = now.toISO();

  if (!silent) {
    const msg = cancellationEmail(appt);
    await sendMail({ to: appt.email, subject: msg.subject, html: msg.html, text: msg.text });
  }

  await saveAppointments(appointments);
  console.log(`\n🗑  Cancelled ${appt.id}${silent ? " (no email sent)" : ` — notice sent to ${appt.email}`}`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
