import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { logger } from "../logger";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof AppError) {
    logger.warn({ err: err.message, code: err.code, status: err.statusCode }, "Operational error handled");
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Handle generic / unknown errors
  logger.error({ err, path: req.path }, "Unhandled error");
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
};
