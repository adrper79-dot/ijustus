import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { createDb } from '@adrper79-dot/neon';
import { NotFoundError, ValidationError } from '@adrper79-dot/errors';
import { callSessions, simulators } from '../db/schema.js';
import type { Env } from '../env.js';

const router = new Hono<{ Bindings: Env }>();

/** POST /api/sessions — start a practice call session. */
router.post('/', async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get('user') as { sub: string };
  const body = await c.req.json<{ simulatorId?: string }>();

  if (!body.simulatorId?.trim()) throw new ValidationError('simulatorId is required');

  const [simulator] = await db
    .select({ id: simulators.id, active: simulators.active })
    .from(simulators)
    .where(eq(simulators.id, body.simulatorId.trim()));

  if (!simulator) throw new NotFoundError('Simulator not found');
  if (!simulator.active) throw new ValidationError('Simulator is not active');

  const [session] = await db
    .insert(callSessions)
    .values({ simulatorId: simulator.id, userId: user.sub })
    .returning();

  return c.json({ data: session, error: null }, 201);
});

/** GET /api/sessions — list sessions for the authenticated user. */
router.get('/', async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get('user') as { sub: string };

  const rows = await db
    .select()
    .from(callSessions)
    .where(eq(callSessions.userId, user.sub));

  return c.json({ data: rows, error: null });
});

/** GET /api/sessions/:id — get a single session. */
router.get('/:id', async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get('user') as { sub: string };

  const [session] = await db
    .select()
    .from(callSessions)
    .where(and(eq(callSessions.id, c.req.param('id')), eq(callSessions.userId, user.sub)));

  if (!session) throw new NotFoundError('Session not found');

  return c.json({ data: session, error: null });
});

/** PATCH /api/sessions/:id/complete — save transcript, score, and AI feedback. */
router.patch('/:id/complete', async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get('user') as { sub: string };
  const body = await c.req.json<{
    transcript?: unknown[];
    score?: number;
    feedback?: string;
    durationSecs?: number;
  }>();

  const [session] = await db
    .select({ id: callSessions.id })
    .from(callSessions)
    .where(and(eq(callSessions.id, c.req.param('id')), eq(callSessions.userId, user.sub)));

  if (!session) throw new NotFoundError('Session not found');

  if (body.score !== undefined && (body.score < 0 || body.score > 100)) {
    throw new ValidationError('score must be between 0 and 100');
  }

  const [updated] = await db
    .update(callSessions)
    .set({
      transcript: body.transcript ?? null,
      score: body.score ?? null,
      feedback: body.feedback ?? null,
      durationSecs: body.durationSecs ?? null,
      completedAt: new Date(),
    })
    .where(eq(callSessions.id, session.id))
    .returning();

  return c.json({ data: updated, error: null });
});

export { router as sessionsRouter };