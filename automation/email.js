// Thin wrapper around nodemailer using a Gmail / Google Workspace app password.

import nodemailer from "nodemailer";
import { EMAIL, BRAND, assertEmailConfigured } from "./config.js";

// Set EMAIL_DRYRUN=1 to log emails instead of sending them (local testing).
const DRYRUN = process.env.EMAIL_DRYRUN === "1" || process.env.EMAIL_DRYRUN === "true";

let transporter;

function getTransporter() {
  if (!transporter) {
    assertEmailConfigured();
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: EMAIL.user, pass: EMAIL.appPassword },
    });
  }
  return transporter;
}

/**
 * @param {{to: string, subject: string, html: string, text: string, cc?: string}} msg
 */
export async function sendMail({ to, subject, html, text, cc }) {
  if (DRYRUN) {
    console.log(`  ✉  [DRYRUN] would send "${subject}" → ${to}${cc ? ` (cc ${cc})` : ""}`);
    return { messageId: "dryrun", dryrun: true };
  }
  const info = await getTransporter().sendMail({
    from: `"${BRAND.name}" <${EMAIL.user}>`,
    replyTo: EMAIL.replyTo,
    to,
    cc,
    subject,
    text,
    html,
  });
  console.log(`  ✉  sent "${subject}" → ${to} (${info.messageId})`);
  return info;
}

export async function verifyConnection() {
  await getTransporter().verify();
  console.log("SMTP connection OK");
}
