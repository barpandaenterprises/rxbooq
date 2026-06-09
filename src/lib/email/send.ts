/**
 * Transactional email sender (SMTP via nodemailer).
 *
 * Mirrors the shape of src/lib/sms/provider.ts so callers get a uniform
 * { ok } | { ok:false, error } result. Used for onboarding email OTP today;
 * reusable for any future transactional email.
 *
 * Required env (set in prod):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * In dev, when SMTP_HOST is unset, the email is logged to the server console
 * instead of sent — so the onboarding flow stays testable without a mail
 * provider (paired with the MOCK_DATA devCode surface in the OTP action).
 */

import nodemailer from "nodemailer";

export type SendEmailArgs = {
  to:       string;
  subject:  string;
  text:     string;
  html?:    string;
};

export type SendEmailResult = { ok: true } | { ok: false; error: string };

let cachedTransport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter | null {
  if (cachedTransport) return cachedTransport;
  const host = process.env.SMTP_HOST;
  if (!host) return null; // dev / unconfigured → caller logs instead.

  const port   = Number(process.env.SMTP_PORT ?? 587);
  const user   = process.env.SMTP_USER;
  const pass   = process.env.SMTP_PASS;
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // implicit TLS on 465; STARTTLS otherwise
    auth: user && pass ? { user, pass } : undefined,
  });
  return cachedTransport;
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const transport = getTransport();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "no-reply@rxbooq.com";

  if (!transport) {
    console.log(`[email:dev] -> ${args.to}\n  Subject: ${args.subject}\n  ${args.text}`);
    return { ok: true };
  }

  try {
    await transport.sendMail({
      from,
      to:      args.to,
      subject: args.subject,
      text:    args.text,
      html:    args.html,
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown email error";
    console.error("[email] send failed:", msg);
    return { ok: false, error: msg };
  }
}
