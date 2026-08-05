import { db, usersTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getIO } from "./socket";

/**
 * Insert a notification for every admin user.
 * Used to keep the platform admin (customer service) in the loop on
 * order placement, payment, and delivery events so they can track and
 * intervene as needed.
 *
 * Errors are swallowed because notifications are best-effort and must
 * never block the request that triggered them.
 */
export async function notifyAllAdmins(payload: {
  type: "message" | "order_update" | "review";
  title: string;
  body: string;
  relatedId?: number | null;
}): Promise<void> {
  try {
    const admins = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "admin"));
    if (admins.length === 0) return;
    const inserted = await db.insert(notificationsTable).values(
      admins.map((a) => ({
        userId: a.id,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        relatedId: payload.relatedId ?? null,
        isRead: false,
      }))
    ).returning();

    const io = getIO();
    if (io) {
      inserted.forEach((notif) => {
        io.to(`user_${notif.userId}`).emit("new_notification", notif);
      });
      io.to("admin_support").emit("new_notification", inserted[0]);
    }
  } catch {
    // best-effort
  }
}
