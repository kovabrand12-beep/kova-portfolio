// Email content (subject + HTML + plain text) for each message type.

import { DateTime } from "luxon";
import { BRAND } from "./config.js";

function fmt(startISO, timezone) {
  const dt = DateTime.fromISO(startISO, { setZone: true }).setZone(timezone || "local");
  return {
    long: dt.toFormat("cccc, LLLL d, yyyy 'at' h:mm a ZZZZ"), // Friday, September 12, 2026 at 3:00 PM EDT
    short: dt.toFormat("LLL d 'at' h:mm a ZZZZ"),
    dayTime: dt.toFormat("cccc h:mm a ZZZZ"),
  };
}

function shell(bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;padding:24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4e4e7;">
      <tr><td style="background:#111111;padding:22px 28px;">
        <span style="font-size:18px;font-weight:700;letter-spacing:2px;color:#e3c581;">KOVA</span>
      </td></tr>
      <tr><td style="padding:28px;font-size:15px;line-height:1.6;">
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;">
        ${BRAND.signature} · <a href="${BRAND.siteUrl}" style="color:#71717a;">${BRAND.siteUrl.replace(/^https?:\/\//, "")}</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function button(href, label) {
  return `<a href="${href}" style="display:inline-block;background:#111111;color:#e3c581;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:9px;">${label}</a>`;
}

/** Sent as soon as an appointment is confirmed (has a Zoom link). */
export function confirmationEmail(apt) {
  const t = fmt(apt.startISO, apt.timezone);
  const firstName = (apt.name || "there").split(/\s+/)[0];
  const notesHtml = apt.notes
    ? `<p style="margin:16px 0 0;padding:12px 14px;background:#fafafa;border:1px solid #eee;border-radius:8px;"><strong>Notes:</strong> ${escapeHtml(apt.notes)}</p>`
    : "";

  return {
    subject: `Confirmed: your call with ${BRAND.name} — ${t.short}`,
    text: [
      `Hi ${firstName},`,
      ``,
      `Your call with ${BRAND.name} is confirmed for ${t.long}.`,
      ``,
      `Join with Zoom: ${apt.zoomLink}`,
      ``,
      apt.notes ? `Notes: ${apt.notes}\n` : ``,
      `We'll send reminders 24 hours, 3 hours, and 1 hour before we meet.`,
      ``,
      `See you then,`,
      BRAND.signature,
    ].join("\n"),
    html: shell(`
      <p style="margin:0 0 12px;">Hi ${escapeHtml(firstName)},</p>
      <p style="margin:0 0 16px;">Your call with ${BRAND.name} is confirmed.</p>
      <p style="margin:0 0 6px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:1px;">When</p>
      <p style="margin:0 0 18px;font-size:16px;font-weight:600;">${t.long}</p>
      <p style="margin:0 0 20px;">${button(apt.zoomLink, "Join the Zoom call")}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#71717a;">Or paste this link: <br><a href="${apt.zoomLink}" style="color:#111;">${escapeHtml(apt.zoomLink)}</a></p>
      ${notesHtml}
      <p style="margin:18px 0 0;font-size:13px;color:#71717a;">We'll remind you 24 hours, 3 hours, and 1 hour before we meet.</p>
    `),
  };
}

/** Sent at each reminder interval. `label` is e.g. "24 hours". */
export function reminderEmail(apt, label) {
  const t = fmt(apt.startISO, apt.timezone);
  const firstName = (apt.name || "there").split(/\s+/)[0];
  const soon = label === "1 hour" ? "starts in about an hour" : `is in ${label}`;

  return {
    subject: `Reminder: your ${BRAND.name} call ${label === "1 hour" ? "starts soon" : `is in ${label}`} — ${t.dayTime}`,
    text: [
      `Hi ${firstName},`,
      ``,
      `A quick reminder that your call with ${BRAND.name} ${soon}.`,
      ``,
      `When: ${t.long}`,
      `Join with Zoom: ${apt.zoomLink}`,
      ``,
      `See you soon,`,
      BRAND.signature,
    ].join("\n"),
    html: shell(`
      <p style="margin:0 0 12px;">Hi ${escapeHtml(firstName)},</p>
      <p style="margin:0 0 16px;">A quick reminder — your call with ${BRAND.name} ${soon}.</p>
      <p style="margin:0 0 6px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:1px;">When</p>
      <p style="margin:0 0 18px;font-size:16px;font-weight:600;">${t.long}</p>
      <p style="margin:0 0 8px;">${button(apt.zoomLink, "Join the Zoom call")}</p>
      <p style="margin:0;font-size:13px;color:#71717a;"><a href="${apt.zoomLink}" style="color:#111;">${escapeHtml(apt.zoomLink)}</a></p>
    `),
  };
}

/** Sent to the client when a booking is cancelled. */
export function cancellationEmail(apt) {
  const t = fmt(apt.startISO, apt.timezone);
  const firstName = (apt.name || "there").split(/\s+/)[0];
  return {
    subject: `Cancelled: your ${BRAND.name} call — ${t.short}`,
    text: [
      `Hi ${firstName},`,
      ``,
      `Your call with ${BRAND.name} scheduled for ${t.long} has been cancelled.`,
      `If this was a mistake, just reply to this email and we'll get it back on the calendar.`,
      ``,
      BRAND.signature,
    ].join("\n"),
    html: shell(`
      <p style="margin:0 0 12px;">Hi ${escapeHtml(firstName)},</p>
      <p style="margin:0 0 16px;">Your call with ${BRAND.name} scheduled for <strong>${t.long}</strong> has been cancelled.</p>
      <p style="margin:0;font-size:13px;color:#71717a;">If this was a mistake, reply to this email and we'll put it back on the calendar.</p>
    `),
  };
}

/** Internal heads-up to Kova when a client requests a time via the public page. */
export function internalRequestEmail(apt) {
  const t = fmt(apt.startISO, apt.timezone);
  return {
    subject: `New booking request: ${apt.name} — ${t.short}`,
    text: [
      `New appointment request from the Kova site.`,
      ``,
      `Name:  ${apt.name}`,
      `Email: ${apt.email}`,
      `When:  ${t.long}`,
      apt.notes ? `Notes: ${apt.notes}` : ``,
      ``,
      `It's saved as PENDING (id: ${apt.id}).`,
      `Confirm it by running the "Appointment — confirm / add Zoom link" workflow with this id and a Zoom link.`,
    ].join("\n"),
    html: shell(`
      <p style="margin:0 0 16px;font-weight:600;">New appointment request from the Kova site.</p>
      <p style="margin:0 0 4px;"><strong>Name:</strong> ${escapeHtml(apt.name)}</p>
      <p style="margin:0 0 4px;"><strong>Email:</strong> ${escapeHtml(apt.email)}</p>
      <p style="margin:0 0 4px;"><strong>When:</strong> ${t.long}</p>
      ${apt.notes ? `<p style="margin:0 0 4px;"><strong>Notes:</strong> ${escapeHtml(apt.notes)}</p>` : ""}
      <p style="margin:16px 0 0;font-size:13px;color:#71717a;">Saved as <strong>PENDING</strong> · id <code>${apt.id}</code>.<br>
      Run the <em>Appointment — confirm / add Zoom link</em> workflow with this id and a Zoom link to send the confirmation.</p>
    `),
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
