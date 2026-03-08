# Autonomous Strategy Pipeline — Design
Date: 2026-03-01

## Problem
Strategy generation required a human to click "Analyze" in the dashboard
and the portal needed an ANTHROPIC_API_KEY in .env. The agency vision is
fully autonomous — no human input between client interview and strategy delivery.

## Solution
Use Claude Code CLI (authenticated via Max subscription) as a subprocess
inside a self-hosted GitHub Actions runner and Gitea Actions runner, both
running on the agency's Windows machine.

## Architecture

```
Client finishes onboarding step 6 (Visión)
              ↓
Portal auto-pushes clientes/{slug}/interview.json → GitHub repo
              ↓
GitHub Actions fires (on: push → clientes/**/interview.json)
Runs on: self-hosted Windows runner (Max subscription authenticated)
              ↓
scripts/generate-strategy.mjs
  • reads interview.json
  • builds full prompt (SYSTEM_PROMPT + client data)
  • writes prompt to temp file
  • spawns: claude --print < prompt.txt
  • parses JSON output
  • writes PERFIL.md, FUNNEL.md, CONTENIDO_MADRE.md, ITR.md,
    PLAN_90_DIAS.md, CLAUDE.md, blueprint.json to clientes/{slug}/
  • commits to GitHub repo
  • pushes same files to Gitea via REST API
              ↓
Portal polls GitHub API every 5s for blueprint.json
              ↓
Detected → saves Blueprint to SQLite → Dashboard shows "Ready"
              ↓
Owner reviews → one-click Approve (files already in both repos)
```

## Gitea as AI Agent
Each client folder in Gitea contains CLAUDE.md — a permanent context file
that turns Claude Code into the dedicated strategy agent for that client.
Gitea Actions (act_runner, self-hosted) mirrors GitHub Actions: any push to
clientes/**/interview.json also triggers generation from Gitea side.

When the agency opens a client folder with Claude Code, CLAUDE.md activates
automatically, giving Claude full client context without any prompt needed.

## Files Created
- `.gitignore`
- `lib/github.ts` — GitHub REST API helpers
- `scripts/generate-strategy.mjs` — standalone Node.js, no Next.js deps
- `.github/workflows/generate-strategy.yml` — GitHub Actions workflow
- `.gitea/workflows/generate-strategy.yml` — Gitea Actions workflow (same logic)

## Files Modified
- `app/api/onboarding/[token]/save/route.ts` — auto-push interview.json on step 6 complete
- `app/api/sessions/[id]/blueprint/route.ts` — poll GitHub if no local blueprint
- `app/api/sessions/[id]/analyze/route.ts` — manual fallback trigger
- `.env` — add GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME

## Secrets Split
| Location | Secrets |
|---|---|
| Local .env | GITHUB_TOKEN (PAT), GITHUB_REPO_OWNER, GITHUB_REPO_NAME |
| GitHub Secrets | GITEA_URL, GITEA_TOKEN, GITEA_REPO_OWNER, GITEA_REPO_NAME |
| Gitea Secrets | (same mirror) |
| ANTHROPIC_API_KEY | NEVER needed — uses Max subscription via claude CLI |

## No API Keys
Claude Max subscription is authenticated on the Windows machine.
The self-hosted runner is that same machine.
claude --print runs with the authenticated session.
Zero Anthropic API keys in any config file.
