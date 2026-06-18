import { Request, Response, NextFunction } from 'express';

/**
 * Central error handling middleware.
 * It captures any error thrown in async route handlers and formats a consistent JSON response.
 * The middleware should be placed after all route registrations.
 */
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // If response already sent, delegate to default Express handler
  if (res.headersSent) {
    return _next(err);
  }

  // Log the error – using console for simplicity; replace with a logger like pino if needed.
  console.error('Unhandled error:', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({ error: message });
}
