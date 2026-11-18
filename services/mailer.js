/**
 * Email bhejna (SMTP). Kaam karta hai jab SMTP_HOST set ho:
 *   SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS, MAIL_FROM ("Urbino Help <no-reply@...>")
 * Gmail / Zoho / Brevo / Amazon SES - koi bhi SMTP chalega.
 *
 * Development mein MAIL_DEBUG=true: email bhejte nahi, sirf console par likhte hain
 * (aur reset API test ke liye code lauta deti hai). Production mein MAIL_DEBUG kabhi nahi chalta.
 */
const nodemailer = require("nodemailer");

const IS_PROD = process.env.NODE_ENV === "production";
const DEBUG = !IS_PROD && process.env.MAIL_DEBUG === "true";
const FROM = process.env.MAIL_FROM || "Urbino Help <no-reply@urbinohelp.in>";

let transport = null;
if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
    });
}

/** Email channel chalu hai? (asli SMTP ya dev debug) */
function mailEnabled() {
    return Boolean(transport) || DEBUG;
}

function isDebug() {
    return DEBUG && !transport;
}

async function sendMail({ to, subject, text, html }) {
    if (transport) {
        await transport.sendMail({ from: FROM, to, subject, text, html });
        return { sent: true };
    }
    if (DEBUG) {
        console.log(`[mail:debug] to=${to} subject="${subject}"\n${text}`);
        return { sent: false, debug: true };
    }
    throw new Error("Email is not configured");
}

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Password reset code wala email (saaf, mobile par padhne layak) */
function resetCodeEmail(name, code, minutes) {
    const text = `Hi ${name},\n\nYour Urbino Help password reset code is ${code}. It expires in ${minutes} minutes.\n\nIf you did not ask for this, ignore this email; your password stays the same.\nUrbino Help will never ask for this code on a call.`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#111">
  <h2 style="margin:0 0 4px">Urbino <span style="color:#f97316">Help</span></h2>
  <p>Hi ${escape(name)},</p>
  <p>Your password reset code is:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0">${code}</p>
  <p style="color:#555">It expires in ${minutes} minutes. If you did not ask for this, ignore this email.</p>
  <p style="color:#555;font-size:13px">Urbino Help will never ask for this code on a call.</p>
</div>`;
    return { subject: `${code} is your Urbino Help reset code`, text, html };
}

module.exports = { mailEnabled, isDebug, sendMail, resetCodeEmail };
