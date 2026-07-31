import { Queue, Worker, type Job } from "bullmq";
import { redisClient } from "./redis";
import { logger } from "../shared/logger";
import { db, notificationsTable } from "@workspace/db";
import { InferInsertModel } from "drizzle-orm";

type NotificationJob = InferInsertModel<typeof notificationsTable>;

const QUEUE_NAME = "notifications-queue";

// We only initialize BullMQ if Redis is configured. Otherwise, fallback to in-memory processing.
export const notificationQueue = redisClient
  ? new Queue(QUEUE_NAME, { connection: redisClient as any })
  : null;

let worker: Worker | null = null;

export function initWorker() {
  if (!redisClient) return;

  worker = new Worker(
    QUEUE_NAME,
    async (job: Job<NotificationJob>) => {
      const data = job.data;
      logger.info({ jobId: job.id, type: data.type }, "Processing notification job");
      await db.insert(notificationsTable).values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        relatedId: data.relatedId,
      });
    },
    {
      connection: redisClient as any,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Notification job completed successfully");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Notification job failed");
  });
}

export async function closeWorker() {
  if (worker) {
    await worker.close();
    logger.info("BullMQ worker closed");
  }
}
