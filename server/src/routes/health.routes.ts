import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const healthRouter = Router();

// Liveness: confirms that the API process is running.
healthRouter.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'cartpilot-api',
    timestamp: new Date().toISOString(),
  });
});

// Readiness: confirms that the API can reach its database.
healthRouter.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'not_ready', database: 'disconnected' });
  }
});
