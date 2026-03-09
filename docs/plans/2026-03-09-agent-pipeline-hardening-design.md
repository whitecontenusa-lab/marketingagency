# Agent Pipeline Hardening — Design Doc
**Date:** 2026-03-09
**Status:** Approved
**Scope:** Option B — Surgical fixes + pipeline wiring

---

## Problem

The agent activation pipeline has 10 confirmed blind spots across two categories:

1. **Security / correctness** — issues that break the system or create vulnerabilities with a real client
2. **Pipeline wiring** — gaps where team has to manually trigger things that should be automatic

---

## Blind Spots & Fixes

### P0 — Must fix before first client

#### B1 · Double-trigger race condition
**Problem:** `onboarding/complete` pushes `interview.json` to GitHub automatically when the client finishes the form. `analyze` also pushes it when the team clicks "Generar Estrategia". The GitHub Action fires on every push to `clientes/**/interview.json` — so two parallel Claude processes run for the same client simultaneously.

**Fix:** Remove the GitHub push from `onboarding/complete`. That route only marks `status = 'client_done'` in the DB. Strategy generation is triggered exclusively by the team via the `analyze` route.

---

#### B2 · Blueprint regeneration permanently broken
**Problem:** The blueprint route checks the DB first and returns immediately if any blueprint exists. Once a blueprint is saved, re-generating (bad strategy, wrong funnel) never works — the portal always returns the stale DB version.

**Fix:** When `analyze` is called on a session that already has a blueprint, delete it from the DB before pushing `interview.json` to GitHub. This clears the cache so the blueprint route re-polls GitHub on the next load.

---

#### B3 · Unauthenticated AI routes
**Problem:** `/sessions/[id]/market-research`, `/sessions/[id]/content/generate`, `/sessions/[id]/validate-content`, and `/sessions/[id]/health` have no `getSession()` check. Anyone with a session ID can trigger expensive Claude subprocesses on the host machine.

**Fix:** Add `getSession()` guard at the top of all four routes.

---

### P1 — Pipeline quality

#### B4 · `runClaude()` copy-pasted in 3 files with hardcoded machine path
**Problem:** `market-research`, `content/generate`, and `validate-content` each contain their own copy of `runClaude()` with `C:\\Users\\geren` hardcoded. Bug fixes and improvements must be applied in 3 places.

**Fix:** Extract to `lib/claude.ts` — a single exported `runClaudeSubprocess(prompt, timeoutMs?)` function. The hardcoded path becomes `process.env.CLAUDE_HOME ?? 'C:\\Users\\geren'`.

---

#### B5 · No session status tracking for generation state
**Problem:** Session status jumps from `client_done` → `complete` with nothing in between. The team can't tell if generation is running. Two team members can trigger simultaneous generations.

**Fix:** Add `generating` as a valid status value. Set it in `analyze` before pushing to GitHub. Clear it (back to `client_done`) when the blueprint route successfully saves the result. This also feeds the review queue with accurate state.

---

#### B6 · Market research not auto-run before strategy generation
**Problem:** Market intelligence enriches the strategy prompt, but only if it already exists in the DB. The team has to manually run it in the Inteligencia tab — and often forgets. Most strategies are generated without market context.

**Fix:** Inside `analyze`, before pushing `interview.json`, check if `MarketIntelligence` exists for this session. If not, run market research first (await), then include the result in the enriched `interview.json`. Market research always precedes strategy generation automatically.

---

#### B7 · No auto-checklist on approval
**Problem:** Every new client starts with an empty checklist. The team manually creates all checklist items for every client.

**Fix:** On approval (`approve/route.ts`), if the session's checklist is empty, auto-seed it with 7 standard operational items. This gives the team an immediate working checklist without manual setup.

Default checklist items:
1. Logo y variantes entregados
2. Accesos a redes sociales configurados
3. Credenciales del portal enviadas al cliente
4. Guía de marca compartida con el equipo
5. Banco de fotografías recibido
6. Revisión de copy aprobada
7. Calendario editorial del primer mes listo

---

### P2 — Data integrity

#### B8 · Learning duplication
**Problem:** `approve/route.ts` inserts 3 `AgencyLearning` records. `/api/intelligence` POST does the same. Calling both creates 6 entries — duplicates that pollute future strategy enrichment.

**Fix:** In `approve/route.ts`, remove the inline learning extraction entirely. The `/api/intelligence` POST endpoint is the single source for this. Add a uniqueness guard on `(sourceId, insight)` via Prisma upsert to prevent any duplicate insertions.

---

#### B9 · Runner pushes unapproved strategy to Gitea
**Problem:** `generate-strategy.mjs` pushes PERFIL, FUNNEL, CONTENIDO, ITR, PLAN_90_DIAS, CLAUDE.md to Gitea immediately after generation — before the team reviews or approves. Gitea is the source of truth for *approved* strategy.

**Fix:** Remove the Gitea push loop from `generate-strategy.mjs`. The runner only pushes `blueprint.json` back to GitHub (so the portal can detect completion). The `approve/route.ts` already handles the correct Gitea push post-approval — that path is correct and stays unchanged.

---

### P3 — Minor fixes

#### B10 · Content doc truncated at 3000 chars
**Problem:** `content/generate` slices: `contenidoDoc.slice(0, 3000)`. A CONTENIDO_MADRE document is 600–1000 words; at 3000 chars it cuts mid-sentence, losing content pillars and voice guidelines.

**Fix:** Increase to `slice(0, 8000)` — enough for any realistic strategy document.

---

## Architecture: Shared `lib/claude.ts`

```typescript
// lib/claude.ts
export async function runClaudeSubprocess(prompt: string, timeoutMs = 120_000): Promise<string>
```

Used by: `market-research/route.ts`, `content/generate/route.ts`, `validate-content/route.ts`
The HOME path reads from `process.env.CLAUDE_HOME` with fallback to `C:\\Users\\geren`.

---

## Session Status Flow (after fix)

```
pending          ← session created by team
client_done      ← client completed onboarding form
generating       ← team clicked "Generar" → interview.json pushed to GitHub
client_done      ← blueprint saved to DB (clears generating state)
complete         ← team approved the blueprint
```

Note: status returns to `client_done` (not a new state) after blueprint is saved — this keeps backward compatibility with existing dashboard logic that keys on `client_done`.

---

## Auto-Activation Chain (after fix)

```
Client submits form
  → status = client_done (DB only, no GitHub push)
  → Team reviews in dashboard

Team clicks "Generar Estrategia"
  → Delete existing blueprint from DB (if any)
  → status = generating
  → Check MarketIntelligence — if missing, run it now (auto)
  → Push enriched interview.json → GitHub Action fires
  → Runner generates → blueprint.json committed to GitHub

Portal polls blueprint route (every 5s while generating)
  → blueprint.json found → save to DB → create ApprovalItem
  → status = client_done (cleared)

Team approves blueprint
  → Mark blueprint as approved
  → Push approved docs to Gitea (ONLY now)
  → Create ClientUser + send credentials email
  → Auto-seed checklist (7 items) if empty
  → Extract learnings via /api/intelligence (single source, deduped)
  → status = complete
```

---

## Schema Change

One migration needed:

```sql
-- No structural changes — status field is already String
-- B8 fix: add unique constraint to prevent duplicate learnings
ALTER TABLE "AgencyLearning" ADD CONSTRAINT unique_source_insight UNIQUE ("sourceId", "insight");
```

Prisma schema: add `@@unique([sourceId, insight])` to `AgencyLearning` model.

---

## Files Changed

| File | Change |
|------|--------|
| `lib/claude.ts` | NEW — shared `runClaudeSubprocess()` |
| `app/api/sessions/[id]/analyze/route.ts` | Delete existing blueprint, set `generating` status, auto-run market research |
| `app/api/sessions/[id]/blueprint/route.ts` | Clear `generating` status when blueprint saved |
| `app/api/sessions/[id]/market-research/route.ts` | Add auth, use `lib/claude.ts` |
| `app/api/sessions/[id]/content/generate/route.ts` | Add auth, use `lib/claude.ts`, fix 3000→8000 slice |
| `app/api/sessions/[id]/validate-content/route.ts` | Add auth, use `lib/claude.ts` |
| `app/api/sessions/[id]/health/route.ts` | Add auth |
| `app/api/sessions/[id]/approve/route.ts` | Remove inline learning extraction, auto-seed checklist |
| `app/api/onboarding/[token]/complete/route.ts` | Remove GitHub push |
| `scripts/generate-strategy.mjs` | Remove Gitea push loop |
| `prisma/schema.prisma` | Add `@@unique([sourceId, insight])` to AgencyLearning |

---

## What Does NOT Change

- The GitHub Action workflow (`.github/workflows/generate-strategy.yml`) — untouched
- The `approve/route.ts` Gitea push logic — already correct, stays as-is
- The `blueprint/route.ts` GitHub polling logic — stays, just adds status clear
- All tab components (TabCampanas, TabChecklist, etc.) — untouched
- The portal client login flow — untouched
- The strategy prompt in `generate-strategy.mjs` — untouched
