const nodemailer = require("nodemailer");

let transporterPromise = null;
let usingEthereal = false;

async function buildTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  // Fallback: auto-generated Ethereal test account (nothing is really delivered)
  const account = await nodemailer.createTestAccount();
  usingEthereal = true;
  console.log(`[mailer] No SMTP_HOST set. Using Ethereal test account ${account.user}`);
  return nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass },
  });
}

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = buildTransporter().catch((err) => {
      transporterPromise = null; // allow retry on next request
      throw err;
    });
  }
  return transporterPromise;
}

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Sends one email to one recipient (each recipient gets their own message,
 * so addresses are never exposed to each other).
 */
async function sendOne({ to, subject, body }) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@example.com",
    to,
    subject,
    text: body,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5">${escapeHtml(body).replace(/\n/g, "<br>")}</div>`,
  });
  const preview = usingEthereal ? nodemailer.getTestMessageUrl(info) || "" : "";
  return { messageId: info.messageId, preview };
}

module.exports = { sendOne };
