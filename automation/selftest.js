// Offline sanity checks for the appointment logic. Sends no email.
// Run: node automation/selftest.js

import { DateTime } from "luxon";
import { createAppointment, dueReminders, parseStart } from "./appointment.js";
import { confirmationEmail, reminderEmail } from "./templates.js";

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
}

const now = DateTime.fromISO("2026-09-08T09:00:00", { zone: "America/New_York" });

// --- parseStart -----------------------------------------------------------
const p = parseStart("2026-09-12 15:00", "America/New_York");
ok("parseStart reads 24h format", p.hour === 15 && p.day === 12);
ok("parseStart applies zone offset", p.toISO().includes("-04:00"));

// --- createAppointment: far-future booking arms all 3 reminders ----------
const far = createAppointment(
  { name: "Jane Doe", email: "jane@example.com", start: "2026-09-12 15:00",
    timezone: "America/New_York", zoomLink: "https://zoom.us/j/123", status: "confirmed" },
  now
);
ok("id is derived", far.id === "apt_20260912T150000_jane-doe");
ok("confirmed stamps confirmation", typeof far.reminders.confirmation === "string");
ok("24h/3h/1h all armed (null)", far.reminders["24h"] === null && far.reminders["3h"] === null && far.reminders["1h"] === null);

// --- createAppointment: booking 2h out -> 24h & 3h are n/a, 1h armed ----
const soon = createAppointment(
  { name: "Sam", email: "sam@example.com", start: now.plus({ hours: 2 }).toFormat("yyyy-MM-dd HH:mm"),
    timezone: "America/New_York", zoomLink: "https://zoom.us/j/9", status: "confirmed" },
  now
);
ok("24h reminder marked n/a when booked late", soon.reminders["24h"] === "n/a");
ok("3h reminder marked n/a when booked late", soon.reminders["3h"] === "n/a");
ok("1h reminder still armed", soon.reminders["1h"] === null);

// --- dueReminders -------------------------------------------------------
ok("nothing due 3 days out", dueReminders(far, now).length === 0);
const t24 = DateTime.fromISO(far.startISO, { setZone: true }).minus({ minutes: 23 * 60 });
ok("24h reminder due inside its window", dueReminders(far, t24).map(r => r.key).join() === "24h");
const t2 = DateTime.fromISO(far.startISO, { setZone: true }).minus({ minutes: 130 });
ok("only 3h due mid-3h-segment (2h10m out)", dueReminders(far, t2).map(r => r.key).join() === "3h");
const t40 = DateTime.fromISO(far.startISO, { setZone: true }).minus({ minutes: 40 });
ok("only 1h due mid-1h-segment (40m out)", dueReminders(far, t40).map(r => r.key).join() === "1h");
// A reminder whose segment was entirely missed is not sent late.
const missedWindow = DateTime.fromISO(far.startISO, { setZone: true }).minus({ minutes: 90 });
ok("missed 24h reminder not sent 90m before start", dueReminders(far, missedWindow).map(r => r.key).join() === "3h");
const afterStart = DateTime.fromISO(far.startISO, { setZone: true }).plus({ minutes: 5 });
ok("nothing due after start", dueReminders(far, afterStart).length === 0);

const sentFar = structuredClone(far);
sentFar.reminders["24h"] = now.toISO();
ok("already-sent reminder not re-returned", dueReminders(sentFar, t24).length === 0);

// --- pending appointment never triggers reminders ----------------------
const pending = createAppointment(
  { name: "Pat", email: "pat@example.com", start: "2026-09-12 15:00", timezone: "America/New_York", status: "pending" },
  now
);
ok("pending has no zoom link", pending.zoomLink === "");
ok("pending yields no due reminders", dueReminders(pending, t24).length === 0);

// --- templates render without throwing --------------------------------
const c = confirmationEmail(far);
ok("confirmation email has subject + html + text", !!c.subject && c.html.includes("Zoom") && c.text.includes("zoom.us"));
const r = reminderEmail(far, "1 hour");
ok("reminder email mentions the interval", r.subject.toLowerCase().includes("soon") && r.html.includes("hour"));

// --- validation --------------------------------------------------------
let threw = false;
try { createAppointment({ name: "X", email: "not-an-email", start: "2026-09-12 15:00" }, now); } catch { threw = true; }
ok("rejects bad email", threw);
threw = false;
try { createAppointment({ name: "X", email: "x@y.com", start: "2020-01-01 10:00" }, now); } catch { threw = true; }
ok("rejects past start", threw);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
