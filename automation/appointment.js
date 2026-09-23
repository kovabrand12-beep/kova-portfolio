// Pure helpers for building appointment records and figuring out which
// reminders are due. No I/O here.

import { DateTime } from "luxon";
import { REMINDER_SCHEDULE, DEFAULT_TIMEZONE } from "./config.js";
import { makeId } from "./store.js";

/**
 * Parse a start time. Accepts:
 *   - "2026-09-12 15:00"  (interpreted in `timezone`)
 *   - "2026-09-12T15:00"  (interpreted in `timezone`)
 *   - a full ISO string with offset (e.g. "2026-09-12T15:00:00-04:00")
 */
export function parseStart(input, timezone) {
  const zone = timezone || DEFAULT_TIMEZONE;
  const raw = String(input).trim();

  let dt = DateTime.fromISO(raw, { zone, setZone: /[zZ]|[+-]\d\d:?\d\d$/.test(raw) });
  if (!dt.isValid) {
    dt = DateTime.fromFormat(raw, "yyyy-MM-dd HH:mm", { zone });
  }
  if (!dt.isValid) {
    dt = DateTime.fromFormat(raw, "yyyy-MM-dd h:mm a", { zone });
  }
  if (!dt.isValid) {
    throw new Error(
      `Could not parse start time "${input}". Use "YYYY-MM-DD HH:MM" (24h), e.g. "2026-09-12 15:00".`
    );
  }
  return dt.setZone(zone);
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

/**
 * Build a fresh appointment record.
 * @param {object} o
 * @param {string} o.name
 * @param {string} o.email
 * @param {string} o.start        raw start input
 * @param {string} [o.timezone]   IANA zone
 * @param {string} [o.zoomLink]
 * @param {string} [o.notes]
 * @param {"pending"|"confirmed"} [o.status]
 * @param {string} [o.source]     "manual" | "site"
 * @param {DateTime} [now]
 */
export function createAppointment(o, now = DateTime.now()) {
  if (!o.name || !String(o.name).trim()) throw new Error("name is required");
  if (!isEmail(o.email)) throw new Error(`invalid email: "${o.email}"`);

  const zone = o.timezone || DEFAULT_TIMEZONE;
  const start = parseStart(o.start, zone);
  if (start <= now) throw new Error("start time is in the past");

  const status = o.status === "confirmed" ? "confirmed" : "pending";
  const zoomLink = String(o.zoomLink || "").trim();
  if (status === "confirmed" && !zoomLink) {
    throw new Error("a confirmed appointment needs a zoomLink");
  }

  const startISO = start.toISO();
  const reminders = {};
  for (const r of REMINDER_SCHEDULE) {
    // If the reminder's trigger time has already passed, mark it "n/a" so we
    // never send a stale reminder for a booking made close to the start time.
    const trigger = start.minus({ minutes: r.minutesBefore });
    reminders[r.key] = trigger <= now ? "n/a" : null;
  }

  return {
    id: makeId(startISO, o.name),
    name: String(o.name).trim(),
    email: String(o.email).trim(),
    startISO,
    timezone: zone,
    zoomLink,
    notes: String(o.notes || "").trim(),
    status,
    source: o.source || "manual",
    createdAt: now.toISO(),
    confirmedAt: status === "confirmed" ? now.toISO() : null,
    cancelledAt: null,
    reminders: { confirmation: status === "confirmed" ? now.toISO() : null, ...reminders },
  };
}

/**
 * Which reminders should be sent for this appointment right now?
 * Returns [{ key, label, minutesBefore }] — possibly empty.
 *
 * Each reminder only fires within its own segment: from its trigger time up to
 * the next (closer) reminder's trigger, or the start time for the last one.
 * A reminder whose whole segment was missed (e.g. the scheduler was down) is
 * left unsent here and closed out as "missed" once the meeting starts — we
 * don't send a "24 hours" email when the call is 2 hours away.
 */
export function dueReminders(apt, now = DateTime.now()) {
  if (apt.status !== "confirmed" || !apt.zoomLink) return [];
  const start = DateTime.fromISO(apt.startISO, { setZone: true });
  if (now >= start) return []; // meeting already started — nothing to remind about

  // Ordered furthest-out first (24h, 3h, 1h).
  const ordered = [...REMINDER_SCHEDULE].sort((a, b) => b.minutesBefore - a.minutesBefore);
  const out = [];
  for (let i = 0; i < ordered.length; i++) {
    const r = ordered[i];
    if (apt.reminders?.[r.key]) continue; // already sent, or "n/a"
    const trigger = start.minus({ minutes: r.minutesBefore });
    const segmentEnd = i + 1 < ordered.length
      ? start.minus({ minutes: ordered[i + 1].minutesBefore })
      : start;
    if (now >= trigger && now < segmentEnd) out.push(r);
  }
  return out;
}

/** True once the appointment start time has passed. */
export function isPast(apt, now = DateTime.now()) {
  return now >= DateTime.fromISO(apt.startISO, { setZone: true });
}
