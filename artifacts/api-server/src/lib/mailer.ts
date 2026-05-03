import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransport() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendAdminEmail(subject: string, text: string): Promise<void> {
  const to = process.env.EMAIL_USER;
  if (!to) {
    logger.warn("EMAIL_USER not configured — skipping admin notification");
    return;
  }
  const transport = createTransport();
  if (!transport) {
    logger.warn("Email credentials not configured — skipping admin notification");
    return;
  }
  try {
    await transport.sendMail({
      from: `"Nafex Hub" <${to}>`,
      to,
      subject: `[Nafex Hub] ${subject}`,
      text,
    });
    logger.info({ subject }, "Admin notification email sent");
  } catch (err) {
    logger.error({ err, subject }, "Failed to send admin notification email");
  }
}
