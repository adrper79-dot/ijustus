# iJustus — Standing Orders

> Canonical reference for all agents, engineers, and AI tools working in this repository.

## Mission

iJustus is a civic and justice platform built on Factory Core. It manages organizations,
facilitates sessions, and provides simulation tools for legal and community practice
scenarios. The platform supports civic institutions, advocacy organizations, and justice
education through structured session management and interactive simulators.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers only |
| Router | Hono |
| Database | Neon Postgres via Hyperdrive binding (`env.DB`) |
| Auth | JWT self-managed via `@latimer-woods-tech/auth` |
| Errors | Sentry via `@latimer-woods-tech/monitoring` |
| Analytics | PostHog + `factory_events` via `@latimer-woods-tech/analytics` |
| Build | tsup (ESM only) |
| Tests | Vitest + `@cloudflare/vitest-pool-workers` |

## Routes

- `/api/organizations` — organization management
- `/api/sessions` — session scheduling and facilitation
- `/api/simulators` — simulation tool management

## Hard Constraints

- No `process.env` — use `c.env.VAR` (Hono) or `env.VAR` (Worker) only
- No Node.js built-ins (`fs`, `path`, `crypto`) — use Web APIs
- No CommonJS `require()` — ESM `import`/`export` only
- No `Buffer` — use `Uint8Array`, `TextEncoder`, `TextDecoder`
- No raw `fetch` without error handling
- No secrets in source code or `wrangler.jsonc` `vars` — use `wrangler secret put`
- TypeScript strict — zero `any` in public APIs

## Surfaces

| Surface | URL |
|---------|-----|
| Worker | https://ijustus.adrper79.workers.dev |
| Health | `curl https://ijustus.adrper79.workers.dev/health` |

A fix is done when `curl https://ijustus.adrper79.workers.dev/health` returns `200`.

## Commands

```bash
npm run typecheck       # Zero errors required
npm test                # Vitest suite
npm run build           # tsup ESM build
npm run deploy          # wrangler deploy
```

## Session Start Checklist

1. Read `src/index.ts` — middleware wiring and route mounts
2. Run `npm run typecheck` — note existing errors
3. Run `npm test` — note coverage baseline
4. Check `git log --oneline -10`
5. Confirm Hyperdrive binding ID in `wrangler.jsonc`

## Commit Format

`type(ijustus): description`

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
