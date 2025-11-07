import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { router as appointmentsRouter } from './routes/appointments';
import { router as systemRouter } from './routes/system';
import { router as authRouter } from './routes/auth';
import { router as securityRouter } from './routes/security';
import { router as profileRouter } from './routes/profile';
import { errorHandler, notFound } from './middleware/error';
import { apiLimiter } from './middleware/rateLimit';
import { connectMongo } from './db/mongo';
import { logInfo } from './lib/logger';

const app = express();

// Core middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Apply general rate limiting to all API routes
app.use('/v1/', apiLimiter);

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// API routes
const API_PREFIX = '/v1';
app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/profile`, profileRouter);
app.use(`${API_PREFIX}/appointments`, appointmentsRouter);
app.use(`${API_PREFIX}/system`, systemRouter);
app.use(`${API_PREFIX}/security`, securityRouter);

// 404 and errors
app.use(notFound);
app.use(errorHandler);

// Startup
async function start() {
  const port = Number(process.env.PORT || 4000);
  await connectMongo();
  logInfo('MongoDB connected successfully');

  app.listen(port, () => {
    logInfo(`API listening on http://localhost:${port}`);
    logInfo('Security monitoring and audit logging active');
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err);
  process.exit(1);
});
