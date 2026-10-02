import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

export const mailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transport: Transporter | undefined;
const transporter = () =>
  (transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  }));

// Sends an email. Without SMTP settings (local development) it logs the message instead and returns false.
export async function sendMail(msg: { to: string; subject: string; text: string; html: string }) {
  if (!mailConfigured()) {
    console.info(`\n[mail not configured] To: ${msg.to}\nSubject: ${msg.subject}\n${msg.text}\n`);
    return false;
  }
  await transporter().sendMail({ from: process.env.MAIL_FROM || `Smart CRM <${process.env.SMTP_USER}>`, ...msg });
  return true;
}
