import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { createDb } from '@adrper79-dot/neon';
import { NotFoundError, ValidationError } from '@adrper79-dot/errors';
import { simulators, organizations } from '../db/schema.js';
import type { Env } from '../env.js';

const router = new Hono<{ Bindings: Env }>();

async function resolveTenant(db: ReturnType<typeof createDb>, tenantId: string | undefined): Promise<string> {
  if (!tenantId) throw new ValidationError('X-Tenant-Id header is required');
  const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, tenantId));
  if (!org) throw new NotFoundError('Organization not found');
  return org.id;
}

/** POST /api/simulators — create an AI simulator for the org. */
router.post('/', async (c) => {
  const db = createDb(c.env.DB);
  const tenantId = await resolveTenant(db, c.req.header('X-Tenant-Id'));
  const body = await c.req.json<{
    name?: string;
    persona?: string;
    systemPrompt?: string;
    voiceId?: string;
  }>();

  if (!body.name?.trim()) throw new ValidationError('name is required');
  if (!body.persona?.trim()) throw new ValidationError('persona is required');
  if (!body.systemPrompt?.trim()) throw new ValidationError('systemPrompt is required');

  const [simulator] = await db
    .insert(simulators)
    .values({
      tenantId,
      name: body.name.trim(),
      persona: body.persona.trim(),
      systemPrompt: body.systemPrompt.trim(),
      voiceId: body.voiceId ?? null,
    })
    .returning();

  return c.json({ data: simulator, error: null }, 201);
});

/** GET /api/simulators — list active simulators for the org. */
router.get('/', async (c) => {
  const db = createDb(c.env.DB);
  const tenantId = await resolveTenant(db, c.req.header('X-Tenant-Id'));

  const rows = await db
    .select()
    .from(simulators)
    .where(and(eq(simulators.tenantId, tenantId), eq(simulators.active, true)));

  return c.json({ data: rows, error: null });
});

/** GET /api/simulators/:id — get a single simulator. */
router.get('/:id', async (c) => {
  const db = createDb(c.env.DB);
  const tenantId = await resolveTenant(db, c.req.header('X-Tenant-Id'));

  const [simulator] = await db
    .select()
    .from(simulators)
    .where(and(eq(simulators.id, c.req.param('id')), eq(simulators.tenantId, tenantId)));

  if (!simulator) throw new NotFoundError('Simulator not found');

  return c.json({ data: simulator, error: null });
});

/** PATCH /api/simulators/:id — toggle active or update simulator config. */
router.patch('/:id', async (c) => {
  const db = createDb(c.env.DB);
  const tenantId = await resolveTenant(db, c.req.header('X-Tenant-Id'));
  const body = await c.req.json<{ active?: boolean; name?: string; persona?: string; systemPrompt?: string; voiceId?: string }>();

  const [existing] = await db
    .select({ id: simulators.id })
    .from(simulators)
    .where(and(eq(simulators.id, c.req.param('id')), eq(simulators.tenantId, tenantId)));
  if (!existing) throw new NotFoundError('Simulator not found');

  const set: {
    active?: boolean;
    name?: string;
    persona?: string;
    systemPrompt?: string;
    voiceId?: string;
  } = {};

  if (body.active !== undefined) set.active = body.active;
  if (body.name?.trim()) set.name = body.name.trim();
  if (body.persona?.trim()) set.persona = body.persona.trim();
  if (body.systemPrompt?.trim()) set.systemPrompt = body.systemPrompt.trim();
  if (body.voiceId !== undefined) set.voiceId = body.voiceId;

  if (Object.keys(set).length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  const [updated] = await db
    .update(simulators)
    .set(set)
    .where(eq(simulators.id, existing.id))
    .returning();

  return c.json({ data: updated, error: null });
});

export { router as simulatorsRouter };