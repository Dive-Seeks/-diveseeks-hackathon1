import express from 'express';
import type { HermesContainerManager } from './manager';

export function buildApp(manager: HermesContainerManager): express.Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use((req, res, next) => {
    const expected = process.env.SUPERVISOR_API_KEY;
    // Fail closed: an unset key must never mean an open Docker-socket service.
    if (!expected || req.headers['x-supervisor-key'] !== expected) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    next();
  });

  const tenantRe = /^[0-9a-f-]{36}$/i;
  app.param('tenantId', (req, res, next, value) => {
    if (!tenantRe.test(value)) {
      return res.status(400).json({ error: 'invalid tenant id' });
    }
    next();
  });

  app.post('/hermes/:tenantId/start', async (req, res) => {
    try {
      await manager.start(req.params.tenantId, {
        apiServerKey: String(req.body?.apiServerKey ?? ''),
        llm: req.body?.llm ?? null,
      });
      res.json({ status: 'running' });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/hermes/:tenantId/stop', async (req, res) => {
    try {
      await manager.stop(req.params.tenantId);
      res.json({ status: 'stopped' });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/hermes/:tenantId/status', async (req, res) => {
    try {
      res.json({ status: await manager.status(req.params.tenantId) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return app;
}
