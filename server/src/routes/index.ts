import { Router } from 'express';
import { getHealth } from '../controllers/healthController.js';
import { geocodeHandler } from '../controllers/geocodeController.js';
import { airHandler } from '../controllers/airController.js';
import { createPlanController } from '../controllers/planController.js';
import { createChatController } from '../controllers/chatController.js';
import { planLimiter, chatLimiter } from '../middleware/security.js';
import type { Env } from '../env.js';

export function createRouter(env: Env): Router {
  const router = Router();

  router.get('/health', getHealth);
  router.get('/geocode', geocodeHandler);
  router.get('/air', airHandler);
  router.post('/plan', planLimiter, createPlanController(env));
  router.post('/chat', chatLimiter, createChatController(env));

  return router;
}
