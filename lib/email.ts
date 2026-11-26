/**
 * Sends email through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email).
 * Without RESEND_API_KEY nothing is sent and a line is logged instead, so the
 * store works the same while you build it. Email problems never break an order.
 */
export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export async function sendEmail(email: Email): Promise<boolean> {
  if (!emailEnabled()) {
    console.info(`[email not sent: RESEND_API_KEY is not set] to=${email.to} subject="${email.subject}"`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Rumm <onboarding@resend.dev>",
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    if (!res.ok) {
      console.error(`Resend ${res.status}: ${await res.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Email failed to send", err);
    return false;
  }
}
