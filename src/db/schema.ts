/**
 * Drizzle ORM schema for ijustus.
 * AI legal coaching platform — organizations, simulators, call sessions.
 */
import {
  pgTable,
  text,
  uuid,
  integer,
  boolean,
  doublePrecision,
  jsonb,
  timestamp,
  timestamp,
} from 'drizzle-orm/pg-core';

/** Law firms / legal-aid orgs that access the platform. */
export const organizations = pgTable('organizations', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),
  plan:      text('plan').notNull().default('starter'),  // starter | pro | enterprise
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** AI moot-court opponent / debt-collector simulator configurations. */
export const simulators = pgTable('simulators', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name:         text('name').notNull(),
  persona:      text('persona').notNull(),  // e.g. "aggressive debt collector" | "opposing counsel"
  systemPrompt: text('system_prompt').notNull(),
  voiceId:      text('voice_id'),           // ElevenLabs voice
  active:       boolean('active').notNull().default(true),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** A live or replayed practice call session. */
export const callSessions = pgTable('call_sessions', {
  id:          uuid('id').primaryKey().defaultRandom(),
  simulatorId: uuid('simulator_id').notNull().references(() => simulators.id),
  userId:      text('user_id').notNull(),      // JWT sub — the practising attorney / student
  transcript:  jsonb('transcript'),            // array of { role, content, timestamp }
  score:       doublePrecision('score'),       // 0–100 coach score computed post-session
  feedback:    text('feedback'),               // AI-generated coaching feedback
  durationSecs: integer('duration_secs'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
