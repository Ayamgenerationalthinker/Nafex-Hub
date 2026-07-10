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

/**
 * Send an arbitrary email to a single recipient. Used for transactional
 * messages like signup verification codes and delivery OTPs.
 * Silently no-ops when EMAIL_USER / EMAIL_PASS are not configured.
 */
export async function sendUserEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const from = process.env.EMAIL_USER;
  if (!from) {
    logger.warn({ to: opts.to, subject: opts.subject }, "EMAIL_USER not configured — skipping user email");
    return false;
  }
  const transport = createTransport();
  if (!transport) {
    logger.warn({ to: opts.to, subject: opts.subject }, "Email credentials not configured — skipping user email");
    return false;
  }
  try {
    await transport.sendMail({
      from: `"Nafex Hub" <${from}>`,
      to: opts.to,
      subject: `[Nafex Hub] ${opts.subject}`,
      text: opts.text,
      html: opts.html,
    });
    logger.info({ to: opts.to, subject: opts.subject }, "User email sent");
    return true;
  } catch (err) {
    logger.error({ err, to: opts.to, subject: opts.subject }, "Failed to send user email");
    return false;
  }
}

function box(title: string, bodyHtml: string, accent = "#D4A537"): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f6f4;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #ececec">
    <div style="padding:18px 24px;background:#0a0a0a;color:#fff">
      <div style="font-size:18px;font-weight:700">Nafex <span style="color:${accent}">Hub</span></div>
    </div>
    <div style="padding:28px 28px 32px">
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1a1a1a">${title}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:14px 24px;background:#fafafa;color:#888;font-size:11px;text-align:center;border-top:1px solid #efefef">
      © ${new Date().getFullYear()} Nafex Hub Ghana · Empowering African commerce
    </div>
  </div></body></html>`;
}

export async function sendVerificationEmail(to: string, name: string, code: string): Promise<boolean> {
  const text = `Hi ${name},\n\nWelcome to Nafex Hub! Please verify your email by entering this 6-digit code on the verification page:\n\n   ${code}\n\nThis code expires in 3 minutes.\n\nIf you didn't sign up, you can ignore this email.\n\n— The Nafex Hub team`;
  const html = box(
    "Verify your email",
    `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#444">Hi <strong>${name}</strong>, thanks for joining Nafex Hub. Use the code below to confirm your email address.</p>
     <div style="margin:22px 0;padding:18px;background:#fff7e0;border:1px dashed #D4A537;border-radius:10px;text-align:center">
       <div style="font-size:11px;letter-spacing:2px;color:#8a6d12;font-weight:700;margin-bottom:6px">VERIFICATION CODE</div>
       <div style="font-size:34px;letter-spacing:10px;font-weight:800;color:#1a1a1a;font-family:'Courier New',monospace">${code}</div>
     </div>
     <p style="margin:0;font-size:12px;color:#888">This code expires in 3 minutes. If you didn't sign up, ignore this email.</p>`
  );
  return sendUserEmail({ to, subject: "Verify your email", text, html });
}

export async function sendDeliveryOtpEmail(to: string, name: string, orderId: number, otp: string): Promise<boolean> {
  const text = `Hi ${name},\n\nYour Nafex Hub order #${orderId} is out for delivery.\n\nDELIVERY OTP: ${otp}\n\nShare this code with your delivery person at handover so the seller can confirm receipt and release escrow.\n\nDo NOT share this code with anyone else.\n\n— The Nafex Hub team`;
  const html = box(
    `Order #${orderId} is out for delivery`,
    `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#444">Hi <strong>${name}</strong>, your order is on its way. Share the OTP below with your delivery person at handover to confirm receipt.</p>
     <div style="margin:22px 0;padding:18px;background:#e7f5ec;border:1px dashed #1b8a4e;border-radius:10px;text-align:center">
       <div style="font-size:11px;letter-spacing:2px;color:#155f37;font-weight:700;margin-bottom:6px">DELIVERY OTP</div>
       <div style="font-size:34px;letter-spacing:10px;font-weight:800;color:#0a0a0a;font-family:'Courier New',monospace">${otp}</div>
     </div>
     <p style="margin:0;font-size:12px;color:#a33">Never share this code over phone or chat. Only hand it to the delivery person in person.</p>`,
    "#1b8a4e"
  );
  return sendUserEmail({ to, subject: `Delivery OTP for Order #${orderId}`, text, html });
}
