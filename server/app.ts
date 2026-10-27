import express from 'express';
import { apiRouter } from './api';

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api', apiRouter);
  return app;
}
