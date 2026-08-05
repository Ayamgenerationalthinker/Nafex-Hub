import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { logger } from "../logger";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof AppError) {
    logger.warn({ err: err.message, code: err.code, status: err.statusCode, path: req.path }, "Operational error handled");
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Handle generic / unknown errors
  logger.error({ err, stack: err.stack, path: req.path, method: req.method }, "Unhandled error");
  res.status(500).json({
    success: false,
    message: err.message || "An unexpected error occurred",
    error: {
      code: "INTERNAL_ERROR",
      message: err.message || "An unexpected error occurred",
    },
  });
};
