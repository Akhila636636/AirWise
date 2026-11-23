import type { Request, Response, NextFunction } from 'express';
import { GeocodeRequestSchema } from '@airwise/shared';
import { searchCities } from '../services/geocoding.js';

export async function geocodeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { q } = GeocodeRequestSchema.parse(req.query);
    const results = await searchCities(q);
    res.json({ results });
  } catch (err) {
    next(err);
  }
}
