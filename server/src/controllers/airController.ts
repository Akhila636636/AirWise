import type { Request, Response, NextFunction } from 'express';
import { AirRequestSchema } from '@airwise/shared';
import { getAirQuality } from '../services/airQuality.js';

export async function airHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const validated = AirRequestSchema.parse({ lat, lon });

    const summary = await getAirQuality(validated.lat, validated.lon);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}
