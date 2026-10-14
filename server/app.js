import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middleware/auth.js';
import auth from './routes/auth.js';
import employees from './routes/employees.js';
import sprints from './routes/sprints.js';
import attendance from './routes/attendance.js';
import settings from './routes/settings.js';
import dashboard from './routes/dashboard.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.frontendUrl, credentials: false }));
  app.use(express.json({ limit: '200kb' }));
  app.use(rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
  // NOTE: uploads/ is deliberately NOT served statically. Images go through an authorized route only.
  app.get('/api/health', (_q, r) => r.json({ ok: true }));
  app.use('/api/auth', auth);
  app.use('/api/employees', employees);
  app.use('/api/sprints', sprints);
  app.use('/api/attendance', attendance);
  app.use('/api/settings', settings);
  app.use('/api/dashboard', dashboard);
  app.use((_q, _r, next) => next(Object.assign(new Error('Not found'), { status: 404 })));
  app.use(errorHandler);
  return app;
}
