import nodemailer from 'nodemailer';

// Two ways to send, both optional:
//  - BREVO_API_KEY: Brevo's HTTPS API (port 443). Works on hosts that block SMTP ports (Render free plan).
//  - SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS: any SMTP server.
export const emailConfigured = () => !!(process.env.BREVO_API_KEY || process.env.SMTP_HOST);

const FROM = () => process.env.EMAIL_FROM || 'Meskan <no-reply@dzhotels.dz>';

// "Meskan <contact@site.dz>" → { name: 'Meskan', email: 'contact@site.dz' }
const parseFrom = (from) => {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(from);
  return m ? { name: m[1] || 'Meskan', email: m[2].trim() } : { name: 'Meskan', email: from.trim() };
};

const sendWithBrevo = async ({ to, subject, html, text }) => {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: parseFrom(FROM()),
      to: [{ email: to }],
      subject,
      ...(html ? { htmlContent: html } : {}),
      ...(text ? { textContent: text } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 200)}`);
};

/**
 * Send an email. If nothing is configured, logs to console
 * instead of throwing so flows (e.g. booking notifications) don't break in dev.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (process.env.BREVO_API_KEY) return sendWithBrevo({ to, subject, html, text });
  if (!process.env.SMTP_HOST) {
    console.log(`[email skipped — no email service configured] To: ${to} | ${subject}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({ from: FROM(), to, subject, text, html });
};

export default sendEmail;
