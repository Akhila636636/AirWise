import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/** Structured application error with HTTP status and error code. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Central error handler middleware.
 * Returns consistent { error: { code, message } } format.
 * Never exposes stack traces or internal details to the client.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId ?? 'unknown';

  // Zod validation errors
  if (err instanceof ZodError) {
    const fieldErrors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    console.error(`[${requestId}] Validation error:`, JSON.stringify(fieldErrors));
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Invalid request data: ${fieldErrors.map((f) => `${f.path}: ${f.message}`).join('; ')}`,
      },
    });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    console.error(`[${requestId}] AppError [${err.code}]: ${err.message}`);
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // SyntaxError from body parser (invalid JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    console.error(`[${requestId}] JSON parse error`);
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body contains invalid JSON.',
      },
    });
    return;
  }

  // Entity too large
  if (err instanceof Error && 'type' in err && (err as Record<string, unknown>).type === 'entity.too.large') {
    console.error(`[${requestId}] Payload too large`);
    res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body exceeds the 10KB limit.',
      },
    });
    return;
  }

  // Unknown errors - never expose internals
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
  console.error(`[${requestId}] Unhandled error:`, errorMessage);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    },
  });
}
