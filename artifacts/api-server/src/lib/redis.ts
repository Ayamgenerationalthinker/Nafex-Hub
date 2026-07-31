import Redis from "ioredis";
import { logger } from "../shared/logger";

const redisUrl = process.env.REDIS_URL || "";

// Only initialize if REDIS_URL is provided, otherwise export an empty object/null
// to allow apicache to fallback to memory
export const redisClient = redisUrl ? new Redis(redisUrl, { lazyConnect: true }) : null;

// Pub/Sub clients for Socket.io adapter
export const pubClient = redisClient ? redisClient.duplicate() : null;
export const subClient = redisClient ? redisClient.duplicate() : null;

if (redisClient) {
  redisClient.on("error", (err) => {
    logger.error({ err }, "Redis Client Error");
  });

  redisClient.on("connect", () => {
    logger.info("Connected to Redis");
  });
}

export async function connectRedis() {
  if (redisClient) {
    try {
      await redisClient.connect();
    } catch (err) {
      logger.error({ err }, "Failed to connect to Redis");
    }
  }
}
