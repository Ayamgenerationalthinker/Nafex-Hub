import emailjs from "@emailjs/browser";

export interface SendVerificationParams {
  email: string;
  name?: string;
  code: string;
  serviceId?: string;
  templateId?: string;
  publicKey?: string;
}

export async function sendEmailJSVerificationCode(params: SendVerificationParams): Promise<boolean> {
  const serviceId = params.serviceId || (import.meta.env.VITE_EMAILJS_SERVICE_ID as string) || "service_nafex";
  const templateId = params.templateId || (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string) || "template_verification";
  const publicKey = params.publicKey || (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string);

  if (!publicKey) {
    console.warn("[EmailJS] VITE_EMAILJS_PUBLIC_KEY is not configured.");
    return false;
  }

  try {
    const result = await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: params.email,
        to_name: params.name || params.email.split("@")[0],
        verification_code: params.code,
        code: params.code,
        message: `Your Nafex Hub verification code is: ${params.code}`,
      },
      publicKey
    );
    console.log("[EmailJS] Verification code email sent successfully!", result.status, result.text);
    return true;
  } catch (error) {
    console.error("[EmailJS] Failed to send verification code email:", error);
    return false;
  }
}
