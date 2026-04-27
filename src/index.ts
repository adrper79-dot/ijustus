import { Hono } from 'hono';
import { FactoryBaseError, withErrorBoundary, toErrorResponse } from '@adrper79-dot/errors';
import { jwtMiddleware } from '@adrper79-dot/auth';
import { organizationsRouter } from './routes/organizations.js';
import { simulatorsRouter } from './routes/simulators.js';
import { sessionsRouter } from './routes/sessions.js';
import type { Env } from './env.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', withErrorBoundary());

app.get('/health', (c) =>
  c.json({ status: 'ok', worker: c.env.WORKER_NAME, env: c.env.ENVIRONMENT }),
);

app.use('/auth/*', async (c, next) => {
  const { success } = await c.env.AUTH_RATE_LIMITER.limit({ key: c.req.header('CF-Connecting-IP') ?? 'unknown' });
  if (!success) return c.json({ error: 'Too many requests', data: null }, 429);
  return next();
});

app.use('/api/*', (c, next) => jwtMiddleware(c.env.JWT_SECRET)(c, next));

app.route('/api/organizations', organizationsRouter);
app.route('/api/simulators', simulatorsRouter);
app.route('/api/sessions', sessionsRouter);

app.onError((err, c) => {
  if (err instanceof FactoryBaseError) {
    return c.json(
      { error: { code: err.code, message: err.message }, data: null },
      err.status as 400 | 401 | 403 | 404 | 422 | 500,
    );
  }
  console.error('[unhandled]', err);
  return c.json(toErrorResponse(err), 500);
});

export default app;