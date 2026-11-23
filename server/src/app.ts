import express, { type Express } from 'express';
import { setupSecurity } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createRouter } from './routes/index.js';
import type { Env } from './env.js';

export function createApp(env: Env): Express {
  const app = express();

  // Setup security middleware
  setupSecurity(app, env);

  // Mount API routes
  app.use('/api', createRouter(env));

  // Central error handling
  app.use(errorHandler);

  return app;
}
