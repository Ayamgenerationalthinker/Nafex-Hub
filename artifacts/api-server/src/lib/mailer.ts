import nodemailer from "nodemailer";
import { logger } from "../shared/logger";

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
  const to = process.env.EMAIL_USER || "princefiebor10@gmail.com";
  if (process.env.RESEND_API_KEY) {
    const fromAddress = process.env.EMAIL_FROM || "onboarding@resend.dev";
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `Nafex Hub <${fromAddress}>`,
          to,
          subject: `[Nafex Hub] ${subject}`,
          text,
        }),
      });
      const data = await res.json() as any;
      if (!res.ok) {
        logger.error({ data, subject }, "Resend API returned error for admin email");
      } else {
        logger.info({ id: data.id, subject }, "Admin notification email sent via Resend API");
      }
    } catch (err) {
      logger.error({ err, subject }, "Failed to send admin email via Resend API");
    }
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
  code?: string;
}): Promise<boolean> {
  // 1. EmailJS API Support (Server-side)
  const emailjsService = process.env.EMAILJS_SERVICE_ID || "service_79bcxpk";
  const emailjsTemplate = process.env.EMAILJS_TEMPLATE_ID || "template_gv1jz99";
  const emailjsPublic = process.env.EMAILJS_PUBLIC_KEY || process.env.EMAILJS_USER_ID || "RI_Vy2fQxvrMk-hAs";

  if (emailjsService && emailjsTemplate && emailjsPublic) {
    // EmailJS REST API requires a private accessToken for server-side use.
    // Only attempt if private key is configured; otherwise skip to avoid hangs.
    const emailjsPrivateKey = process.env.EMAILJS_PRIVATE_KEY;
    if (emailjsPrivateKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const payload: any = {
          service_id: emailjsService,
          template_id: emailjsTemplate,
          user_id: emailjsPublic,
          accessToken: emailjsPrivateKey,
          template_params: {
            to_email: opts.to,
            to_name: opts.to.split("@")[0],
            subject: opts.subject,
            verification_code: opts.code || "",
            code: opts.code || "",
            message: opts.text,
            html_content: opts.html || "",
          },
        };
        const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          logger.info({ to: opts.to, subject: opts.subject }, "User email sent via EmailJS API");
          return true;
        }
        const errText = await res.text();
        logger.error({ errText, to: opts.to, subject: opts.subject }, "EmailJS API returned error");
      } catch (err: any) {
        if (err?.name === "AbortError") {
          logger.warn({ to: opts.to }, "EmailJS API timed out after 3s — falling through to next provider");
        } else {
          logger.error({ err, to: opts.to, subject: opts.subject }, "Failed to send user email via EmailJS API");
        }
      }
    } else {
      // No private key — skip server-side EmailJS (browser SDK handles it on the frontend)
      logger.info({ to: opts.to }, "EMAILJS_PRIVATE_KEY not set — skipping server-side EmailJS send (frontend SDK will handle it)");
    }
  }

  // 2. Resend API Support
  if (process.env.RESEND_API_KEY) {
    const fromAddress = process.env.EMAIL_FROM || "onboarding@resend.dev";
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `Nafex Hub <${fromAddress}>`,
          to: opts.to,
          subject: `[Nafex Hub] ${opts.subject}`,
          text: opts.text,
          html: opts.html,
        }),
      });
      const data = await res.json() as any;
      if (!res.ok) {
        logger.error({ data, to: opts.to, subject: opts.subject }, "Resend API returned error");
        return false;
      }
      logger.info({ id: data.id, to: opts.to, subject: opts.subject }, "User email sent via Resend API");
      return true;
    } catch (err) {
      logger.error({ err, to: opts.to, subject: opts.subject }, "Failed to send user email via Resend API");
      return false;
    }
  }

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
  const text = `Hi ${name},\n\nWelcome to Nafex Hub! Please verify your email by entering this 6-digit code:\n\n   ${code}\n\nThis code expires in 3 minutes. If you didn't sign up, you can safely ignore this email.\n\n— The Nafex Hub Team`;

  const html = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Verify your Nafex Hub Email</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style type="text/css">
    html, body { margin: 0 !important; padding: 0 !important; height: 100% !important; width: 100% !important; background-color: #F8FAFC; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 12px 8px !important; }
      .email-card { width: 100% !important; max-width: 100% !important; border-radius: 16px !important; }
      .header-padding { padding: 24px 18px !important; }
      .body-padding { padding: 24px 18px !important; }
      .logo-img { width: 150px !important; }
      .greeting-title { font-size: 19px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-wrapper" style="background-color: #F8FAFC; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-card" style="max-width: 540px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 10px 25px -5px rgba(106, 27, 154, 0.06), 0 8px 10px -6px rgba(0,0,0,0.01);">

          <!-- Purple Gradient Header -->
          <tr>
            <td class="header-padding" style="background: linear-gradient(135deg, #5B1687 0%, #3B0764 100%); padding: 34px 28px; text-align: center;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom: 14px;">
                    <img src="https://nafex-hub-launchpad.vercel.app/nafex-logo.png" alt="Nafex Hub" class="logo-img" width="180" style="width: 180px; max-width: 80%; height: auto; border: 0; display: block; margin: 0 auto;" />
                  </td>
                </tr>
              </table>
              <div style="display: inline-block; background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); padding: 5px 14px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.18);">
                <span style="font-size: 11px; font-weight: 700; color: #F59E0B; text-transform: uppercase; letter-spacing: 1.5px;">🔐 EMAIL VERIFICATION</span>
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td class="body-padding" style="padding: 32px 28px;">
              <h2 class="greeting-title" style="margin: 0 0 10px 0; font-size: 20px; font-weight: 800; color: #0F172A; letter-spacing: -0.3px;">
                Hi ${name}, confirm your account 👋
              </h2>
              <p style="margin: 0 0 22px 0; font-size: 13.5px; line-height: 1.65; color: #475569; font-weight: 400;">
                Thanks for joining Nafex Hub! Enter the 6-digit code below on the verification page to activate your account.
              </p>

              <!-- OTP Code Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF5FF; border: 1px solid #E9D5FF; border-radius: 14px; margin-bottom: 26px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <div style="font-size: 10.5px; font-weight: 700; color: #7E22CE; text-transform: uppercase; letter-spacing: 1.8px; margin-bottom: 10px;">
                      VERIFICATION CODE
                    </div>
                    <div style="font-size: 40px; letter-spacing: 14px; font-weight: 800; color: #3B0764; font-family: 'Courier New', monospace; padding: 10px 0;">
                      ${code}
                    </div>
                    <div style="font-size: 11.5px; color: #7E22CE; margin-top: 8px; font-weight: 500;">
                      ⏱ Expires in <strong>3 minutes</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 12px;">
                <tr>
                  <td width="44" valign="middle" style="padding: 12px 0 12px 14px;">
                    <div style="width: 32px; height: 32px; background-color: #FDE68A; border-radius: 10px; text-align: center; line-height: 32px; font-size: 15px;">🛡️</div>
                  </td>
                  <td valign="middle" style="padding: 12px 14px 12px 10px;">
                    <strong style="font-size: 13px; font-weight: 700; color: #92400E; display: block;">Security Reminder</strong>
                    <span style="font-size: 12px; color: #78350F; line-height: 1.4; display: block; margin-top: 2px;">Never share this code with anyone. Nafex Hub will never ask for your OTP.</span>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
                If you didn't create a Nafex Hub account, you can safely ignore this email — no action is needed.
              </p>

              <!-- Sign-off -->
              <div style="margin-top: 26px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 13px; color: #334155;">
                <strong style="font-weight: 600;">Warm regards,</strong><br>
                <span style="color: #5B1687; font-weight: 800; font-size: 14px; display: inline-block; margin-top: 2px;">The Nafex Hub Team</span><br>
                <span style="font-size: 11.5px; color: #94A3B8; font-weight: 500;">Ghana's Premier Hybrid Marketplace</span>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 22px 28px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 11.5px; color: #94A3B8; line-height: 1.6;">
              Need help? Email <a href="mailto:nafexgroupltd@gmail.com" style="color: #5B1687; font-weight: 700; text-decoration: underline;">nafexgroupltd@gmail.com</a><br>
              © 2026 Nafex Hub Ghana. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendUserEmail({ to, subject: "Verify your Nafex Hub email", text, html, code });
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
