import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db/mongo';

const router = Router();

router.get('/db-ping', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getDb().command({ ping: 1 });
    res.json({ data: { ok: 1, result } });
  } catch (e) {
    next(e);
  }
});

export { router };

