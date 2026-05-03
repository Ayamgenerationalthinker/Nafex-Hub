import { db, adminActivityTable } from "@workspace/db";

export async function logAdminAction(opts: {
  adminId: number;
  adminName: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(adminActivityTable).values({
    adminId: opts.adminId,
    adminName: opts.adminName,
    action: opts.action,
    targetType: opts.targetType,
    targetId: opts.targetId ?? null,
    details: opts.details ?? null,
  });
}
