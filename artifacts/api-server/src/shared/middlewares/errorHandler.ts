import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { logger } from "../logger";

function sanitizeError(err: any): string {
  const msg = err.message || "";
  
  // 1. Zod Validation Errors
  if (err.name === "ZodError" || (msg.includes("Invalid input") && err.issues)) {
    try {
      const issues = err.issues || JSON.parse(msg);
      if (Array.isArray(issues) && issues[0]?.message) {
        return issues[0].message; // return the first friendly validation message
      }
    } catch {}
    return "Please check your input and try again.";
  }

  // 2. Database/SQL Errors (Postgres)
  if (err.name === "PostgresError" || msg.toLowerCase().includes("failed query") || msg.toLowerCase().includes("syntax error") || err.code?.length === 5) {
    // Unique constraint violation
    if (err.code === "23505" || msg.includes("duplicate key")) {
      return "This record already exists. Please use a different value.";
    }
    // Foreign key violation
    if (err.code === "23503" || msg.includes("violates foreign key constraint")) {
      return "This action cannot be completed because it references a record that doesn't exist.";
    }
    // Not null violation
    if (err.code === "23502" || msg.includes("null value in column")) {
      return "Please fill in all required fields.";
    }
    // Generic catch-all for SQL queries leaking to frontend
    return "A database error occurred while processing your request. Please try again later.";
  }

  // 3. Fallback for other messy internal errors
  if (msg.includes("Cannot read properties of undefined") || msg.includes("ECONNREFUSED")) {
    return "An unexpected system error occurred. Our team has been notified.";
  }

  // Return the original message if it seems safe (short and doesn't contain code/sql)
  if (msg.length > 100 || msg.includes("select ") || msg.includes("SELECT ") || msg.includes("INSERT ")) {
    return "An internal server error occurred.";
  }

  return msg || "An unexpected error occurred";
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  // If it's a designated AppError, trust its message
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

  // For unexpected errors, log the FULL raw error internally
  logger.error({ err, stack: err.stack, path: req.path, method: req.method }, "Unhandled error");
  
  // But send a sanitized, friendly message to the user
  const friendlyMessage = sanitizeError(err);
  
  // Use 400 for validation errors, otherwise 500
  const statusCode = err.name === "ZodError" ? 400 : 500;

  res.status(statusCode).json({
    success: false,
    message: friendlyMessage,
    error: {
      code: err.name === "ZodError" ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
      message: friendlyMessage,
    },
  });
};
