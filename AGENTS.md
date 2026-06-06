# Agent Instructions

## Role

Act as the project orchestrator for this repository. Use delegation when it adds value, especially for exploration or review work that can run in parallel. If no sub-agent tool is available, continue directly and keep the work scoped.

## Communication

- User-facing messages must be in Spanish.
- Keep user-facing messages short, direct, and functional.
- Code, code comments, documentation titles, technical documentation, branch names, and commit messages must be in English.
- Ask questions only when missing information blocks a safe implementation.

## Project Context

- `admin/backend`: Laravel API and source of truth for project data.
- `admin/frontend`: React/Vite VADMIN panel and current implementation priority.
- `web`: Next.js storefront kept for a future phase; do not inspect, modify, or prioritize it unless explicitly requested.
- VADMIN is the official backend provider for the project.
- Shopify implementation is deprecated. Do not add Shopify dependencies, Shopify fetchers, or `SHOPIFY_*` environment variables.
- Development admin API URL: `http://pgrefrigeracion.test/api`.

## Documentation Map

- `docs/README.md`: Documentation index and ownership rules.
- `docs/PROJECT_INFO.md`: Stable project overview, architecture, commands, and environment notes.
- `docs/SPECS.md`: Product and technical specifications. This is the source of truth for intended behavior.
- `docs/ROADMAP.md`: High-level status grouped by completed, in progress, and planned work.
- `docs/DEVLOG.md`: Execution log and active implementation checklists.
- `docs/DEPLOY_INFO.md`: Deployment, server, and release information.
- `docs/standards/`: Reusable implementation standards.

## Documentation Rules

- Update `docs/SPECS.md` before implementing new or complex behavior.
- Update `docs/DEVLOG.md` with the current plan before multi-file execution, then mark steps as completed as work progresses.
- Update `docs/ROADMAP.md` only when project status changes.
- Update `docs/PROJECT_INFO.md` only when stable architecture, commands, or environment facts change.
- Keep specs separate from logs. Do not use `SPECS.md` as a changelog.
- Keep roadmap separate from task checklists. Do not use `ROADMAP.md` for per-file execution steps.

## Workflow

### Efficiency and Context Budget

- Keep context usage proportional to the task risk and scope.
- Prefer targeted file reads and searches over loading whole large files when the relevant section is known.
- Avoid printing or reviewing long diffs unless the change is risky, cross-cutting, or the user asks for a detailed review.
- Summarize findings and decisions instead of carrying large command outputs forward.
- For small UI polish or copy/layout tweaks, avoid documentation updates unless behavior, workflow, API contracts, or project knowledge changes.
- Do not update `docs/DEVLOG.md` for small visual tweaks, copy edits, or single-file fixes unless tracking the work would clearly help.
- Update `docs/SPECS.md` only when a change affects business rules, API contracts, data models, workflows, or durable project knowledge.
- For micro-adjustments, do not repeat full validation after every edit. Run focused checks only when they are likely to catch mistakes, and reserve lint/build/test suites for the end of a meaningful batch or when the user asks.
- For small frontend changes, prefer one final `npm run build` only after a meaningful batch.
- For small backend changes, prefer `php -l` or a focused test before broader suites.
- Do not run `php artisan migrate:fresh --seed` without asking the user first, because it destroys local database data.
- Use repository skills only for non-trivial implementation, unfamiliar patterns, or when they are explicitly helpful. For small edits, do not open skill files unless necessary.
- Preserve quality by increasing discovery, documentation, and validation again when touching production-sensitive behavior, backend contracts, data persistence, auth, checkout, exports, or shared components.

### New or Complex Features

1. Discovery
   - Inspect relevant files and docs.
   - Identify current behavior, constraints, and risks.
   - Produce a short technical proposal when the implementation path is not obvious.

2. Specification and Plan
   - Update `docs/SPECS.md` with intended behavior.
   - Add a numbered checklist to `docs/DEVLOG.md`.
   - Ask for one combined approval only when the change is large, ambiguous, or user approval is explicitly required.

3. Execution
   - Implement one logical unit at a time.
   - Prefer existing project patterns over new abstractions.
   - Update `docs/DEVLOG.md` as checklist items are completed.

4. Validation
   - Run the narrowest useful checks first.
   - Broaden validation when shared behavior or user-facing workflows changed.
   - Report what was changed and what was validated.

### Fixes and Small Modifications

1. Discovery
   - Inspect the relevant files.
   - Skip formal proposal when the fix is straightforward.

2. Execution
   - Apply the smallest safe change.
   - Update documentation only if behavior, workflow, or project knowledge changed.

3. Validation
   - Run focused checks when practical.
   - Report any checks that could not be run.

## Engineering Rules

- Respect existing user changes. Never revert unrelated work.
- Prefer `rg` for search.
- Prefer project-local helpers and established conventions.
- Avoid speculative changes.
- Keep changes scoped to the user request.
- Do not add dependencies unless the task requires them and the existing stack has no reasonable solution.

## Frontend Rules

- Before implementing or changing a reusable UI control, check `docs/standards/` first, especially `docs/standards/COMPONENT_STANDARDS.md`, to reuse existing component and field-adapter patterns.
- Match the existing design system and local component patterns.

## Backend Rules
