// src/lib/validation.ts
import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/**
 * Middleware factory that validates the request body against a Zod schema.
 * If validation fails, responds with 400 and the first error message.
 */
export function validateBody(schema: ZodSchema<any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const message = issue?.message ?? "Invalid request body";
      _res.status(400).json({ error: message });
      return;
    }
    // Attach the parsed data to req for downstream handlers (optional)
    (req as any).validatedBody = result.data;
    next();
  };
}

/**
 * Middleware factory that validates query parameters against a Zod schema.
 */
export function validateQuery(schema: ZodSchema<any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issue = result.error.issues[0];
      const message = issue?.message ?? "Invalid query parameters";
      _res.status(400).json({ error: message });
      return;
    }
    (req as any).validatedQuery = result.data;
    next();
  };
}
