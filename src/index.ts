import { Hono } from 'hono';
import { FactoryBaseError, withErrorBoundary, toErrorResponse } from '@latimer-woods-tech/errors';
import { sentryMiddleware } from '@latimer-woods-tech/monitoring';
import { initAnalytics } from '@latimer-woods-tech/analytics';
import { jwtMiddleware } from '@latimer-woods-tech/auth';
import { organizationsRouter } from './routes/organizations.js';
import { simulatorsRouter } from './routes/simulators.js';
import { sessionsRouter } from './routes/sessions.js';
import type { Env } from './env.js';
import type { Analytics } from '@latimer-woods-tech/analytics';

declare module 'hono' {
  interface ContextVariableMap {
    analytics: Analytics;
  }
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', withErrorBoundary());
app.use('*', (c, next) =>
  sentryMiddleware({
    dsn: c.env.SENTRY_DSN,
    environment: (c.env.ENVIRONMENT as 'development' | 'staging' | 'production') || 'development',
    workerName: 'ijustus',
  })(c, next),
);
app.use('*', async (c, next) => {
  const analytics = initAnalytics({
    postHogKey: c.env.POSTHOG_KEY,
    db: c.env.DB,
    appId: 'ijustus',
  });
  c.set('analytics', analytics);
  await analytics.page(c.req.path, { method: c.req.method, userAgent: c.req.header('user-agent') || 'unknown' });
  return next();
});

app.get('/health', (c) =>
  c.json({ status: 'ok', worker: c.env.WORKER_NAME, env: c.env.ENVIRONMENT }),
);

app.use('/auth/*', async (c, next) => {
  const { success } = await c.env.AUTH_RATE_LIMITER.limit({ key: c.req.header('CF-Connecting-IP') ?? 'unknown' });
  if (!success) {
    const analytics = c.get('analytics');
    await analytics.track('auth.rate_limit_exceeded', { ip: c.req.header('CF-Connecting-IP') ?? 'unknown' });
    return c.json({ error: 'Too many requests', data: null }, 429);
  }
  return next();
});

app.use('/api/*', (c, next) => jwtMiddleware(c.env.JWT_SECRET)(c, next));

app.use('/api/*', async (c, next) => {
  const user = c.get('user');
  if (user) {
    const analytics = c.get('analytics');
    await analytics.identify(user.sub, { tenantId: user.tenantId, role: user.role });
  }
  return next();
});

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