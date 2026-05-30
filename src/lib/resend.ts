import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn("Resend not configured, skipping email to", to);
    return null;
  }
  return resend.emails.send({
    from: "SoloCRM <crm@solo-crm.com>",
    to,
    subject,
    html,
  });
}
