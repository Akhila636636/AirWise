import type { Request, Response, NextFunction } from 'express';
import { ChatRequestSchema } from '@airwise/shared';
import { handleChatMessage } from '../services/chatService.js';
import type { Env } from '../env.js';

export function createChatController(env: Env) {
  return async function chatHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { messages, profile, airSummary, planSummary } = ChatRequestSchema.parse(req.body);

      const response = await handleChatMessage(
        messages,
        profile,
        airSummary,
        planSummary,
        env.GROQ_API_KEY,
        env.GROQ_MODEL,
      );

      res.json(response);
    } catch (err) {
      next(err);
    }
  };
}
