import { Router } from "express";
import { z } from "zod";
import { logger } from "../shared/logger";

const router = Router();

const ADMIN_NOTIFICATION_EMAIL = "nafexgroupltd@gmail.com";

// In-memory store for newsletter subscriptions
const newsletterEmails = new Set<string>();
const newsletterSubmissions: Array<{
  email: string;
  name?: string;
  submittedAt: string;
}> = [];

const subscribeSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  name: z.string().optional(),
  source: z.string().optional(),
});

// POST /api/newsletter/subscribe
router.post("/newsletter/subscribe", async (req, res) => {
  try {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid email" });
    }

    const { email, name, source } = parsed.data;
    const normalised = email.toLowerCase().trim();

    const submissionData = {
      email: normalised,
      name: name?.trim(),
      source: source || "newsletter_form",
      submittedAt: new Date().toISOString(),
    };

    if (newsletterEmails.has(normalised)) {
      return res.status(400).json({ error: "This email address is already subscribed to our newsletter." });
    }

    newsletterEmails.add(normalised);
    newsletterSubmissions.push(submissionData);

    logger.info(
      { 
        subscriberEmail: normalised,
        subscriberName: name,
        totalSubscribers: newsletterEmails.size 
      }, 
      `Newsletter subscription created for ${normalised}`
    );

    return res.status(200).json({ 
      message: `Thank you for subscribing to the Nafex Hub newsletter!`,
      subscriberEmail: normalised,
    });
  } catch (err) {
    logger.error({ err }, "Newsletter subscription error");
    return res.status(500).json({ error: "Failed to subscribe to newsletter. Please try again." });
  }
});

// GET /api/newsletter/submissions (Admin view)
router.get("/newsletter/submissions", async (_req, res) => {
  return res.status(200).json({
    targetAdminEmail: ADMIN_NOTIFICATION_EMAIL,
    total: newsletterSubmissions.length,
    submissions: newsletterSubmissions,
  });
});

export default router;
