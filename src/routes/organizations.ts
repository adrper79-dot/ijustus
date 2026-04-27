import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDb } from '@adrper79-dot/neon';
import { NotFoundError, ValidationError } from '@adrper79-dot/errors';
import { organizations } from '../db/schema.js';
import type { Env } from '../env.js';

const router = new Hono<{ Bindings: Env }>();

const VALID_PLANS = ['starter', 'pro', 'enterprise'] as const;

/** POST /api/organizations — create a law firm or legal-aid org. */
router.post('/', async (c) => {
  const db = createDb(c.env.DB);
  const body = await c.req.json<{ name?: string; plan?: string }>();

  if (!body.name?.trim()) throw new ValidationError('name is required');

  const plan = body.plan ?? 'starter';
  if (!(VALID_PLANS as readonly string[]).includes(plan)) {
    throw new ValidationError('plan must be one of: starter, pro, enterprise');
  }

  const [org] = await db
    .insert(organizations)
    .values({ name: body.name.trim(), plan })
    .returning();

  return c.json({ data: org, error: null }, 201);
});

/** GET /api/organizations/:id — get org details. */
router.get('/:id', async (c) => {
  const db = createDb(c.env.DB);

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, c.req.param('id')));

  if (!org) throw new NotFoundError('Organization not found');

  return c.json({ data: org, error: null });
});

export { router as organizationsRouter };