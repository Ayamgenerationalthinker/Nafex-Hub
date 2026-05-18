import { createServer } from "http";
import app from "./app";
import { initSocketIO } from "./lib/socket";
import { logger } from "./lib/logger";

const port = Number(process.env["PORT"] ?? 5000);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);
}

const httpServer = createServer(app);
initSocketIO(httpServer);

// Bind to 0.0.0.0 so Cloud Run / Docker health checks can reach the server
httpServer.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");
});
