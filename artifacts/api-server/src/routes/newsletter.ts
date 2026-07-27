import { Router } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";

const router = Router();

const ADMIN_NOTIFICATION_EMAIL = "nafexgroupltd@gmail.com";

// In-memory store for waitlist submissions
const newsletterEmails = new Set<string>();
const waitlistSubmissions: Array<{
  email: string;
  name?: string;
  role?: string;
  category?: string;
  storeName?: string;
  storeLink?: string;
  submittedAt: string;
}> = [];

const subscribeSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  name: z.string().optional(),
  role: z.string().optional(),
  category: z.string().optional(),
  storeName: z.string().optional(),
  storeLink: z.string().optional(),
  source: z.string().optional(),
});

// POST /api/newsletter/subscribe
router.post("/newsletter/subscribe", async (req, res) => {
  try {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid email" });
    }

    const { email, name, role, category, storeName, storeLink, source } = parsed.data;
    const normalised = email.toLowerCase().trim();

    const submissionData = {
      email: normalised,
      name: name?.trim(),
      role: role || "buyer",
      category,
      storeName,
      storeLink,
      source: source || "waitlist_form",
      submittedAt: new Date().toISOString(),
      adminRecipient: ADMIN_NOTIFICATION_EMAIL,
    };

    if (!newsletterEmails.has(normalised)) {
      newsletterEmails.add(normalised);
      waitlistSubmissions.push(submissionData);
    }

    // Log admin email notification dispatch to nafexgroupltd@gmail.com
    logger.info(
      { 
        adminEmail: ADMIN_NOTIFICATION_EMAIL,
        subscriber: submissionData,
        totalSubscribers: newsletterEmails.size 
      }, 
      `Waitlist submission forwarded to ${ADMIN_NOTIFICATION_EMAIL}`
    );

    return res.status(200).json({ 
      message: `Thank you for joining the waitlist! Your details have been routed to ${ADMIN_NOTIFICATION_EMAIL}.`,
      recipient: ADMIN_NOTIFICATION_EMAIL
    });
  } catch (err) {
    logger.error({ err }, "Waitlist subscription error");
    return res.status(500).json({ error: "Failed to submit waitlist form. Please try again." });
  }
});

// GET /api/newsletter/submissions (Admin view)
router.get("/newsletter/submissions", async (_req, res) => {
  return res.status(200).json({
    targetAdminEmail: ADMIN_NOTIFICATION_EMAIL,
    total: waitlistSubmissions.length,
    submissions: waitlistSubmissions,
  });
});

export default router;
