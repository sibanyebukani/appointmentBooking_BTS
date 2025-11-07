import { NextFunction, Request, Response } from 'express';

export function notFound(req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = typeof err?.status === 'number' ? err.status : 500;
  const message = typeof err?.message === 'string' ? err.message : 'Internal Server Error';
  res.status(status).json({ error: message });
}

