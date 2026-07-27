import { Router } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";

const router = Router();

// In-memory store for newsletter emails (persists until server restart)
// In production this would be stored in a database table or forwarded to an email service
const newsletterEmails = new Set<string>();

const subscribeSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
});

// POST /api/newsletter/subscribe
router.post("/newsletter/subscribe", async (req, res) => {
  try {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid email" });
    }

    const { email } = parsed.data;
    const normalised = email.toLowerCase().trim();

    if (newsletterEmails.has(normalised)) {
      return res.status(200).json({ message: "You are already subscribed!" });
    }

    newsletterEmails.add(normalised);
    logger.info({ email: normalised, total: newsletterEmails.size }, "Newsletter subscription");

    return res.status(200).json({ message: "Thank you for subscribing!" });
  } catch (err) {
    logger.error({ err }, "Newsletter subscription error");
    return res.status(500).json({ error: "Failed to subscribe. Please try again." });
  }
});

export default router;
