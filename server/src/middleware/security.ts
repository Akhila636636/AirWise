import type { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import express from 'express';
import crypto from 'node:crypto';
import type { Env } from '../env.js';

/** Augment Express Request with requestId */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Configure all security middleware for the Express app.
 * Sets up helmet, CORS, rate limiting, compression, body parsing, and request IDs.
 */
export function setupSecurity(app: Express, env: Env): void {
  // Disable x-powered-by
  app.disable('x-powered-by');

  // Compression
  app.use(compression());

  // Helmet with strict CSP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS from env CORS_ORIGINS (split by comma)
  const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  app.use(
    cors({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400,
    }),
  );

  // General rate limiter: 100 requests per 15 minutes
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
      },
    }),
  );

  // Body size limit 10kb
  app.use(express.json({ limit: '10kb' }));

  // Request ID middleware
  app.use(requestIdMiddleware);
}

/** Plan-specific rate limiter: 10 requests per minute */
export const planLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many plan requests. Please wait a minute.',
    },
  },
});

/** Chat-specific rate limiter: 15 requests per minute */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many chat messages. Please wait a minute.',
    },
  },
});

/**
 * Attach a unique request ID to each incoming request.
 */
function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.requestId = crypto.randomUUID();
  next();
}
