# Repository Guidelines

## Project Structure & Module Organization
- Proposed layout until scaffolding lands:
  - `web/` – PWA frontend (`src/`, `public/`)
  - `api/` – optional backend (HTTP or functions)
  - `tests/` – unit and e2e suites
  - `scripts/` – local build/dev utilities
  - `docs/` – architecture notes and ADRs

## Build, Test, and Development Commands
- `npm install` – install dependencies.
- `npm run dev` – run the web dev server.
- `npm run build` – production build for `web/` (and `api/` if present).
- `npm test` – unit tests.
- `npm run e2e` – end‑to‑end tests (Playwright/Cypress if configured).
- `npm run lint` / `npm run format` – linting and formatting.

## Coding Style & Naming Conventions
- Language: prefer TypeScript for `web/` and `api/`.
- Indentation 2 spaces; 100‑char line width; semicolons on; single quotes.
- Naming: `kebab-case` files, `PascalCase` components/classes, `camelCase` vars.
- Tools: ESLint + Prettier; run `npm run lint` and fix before PR.

## Testing Guidelines
- Framework: Jest/Vitest for unit; Playwright/Cypress for e2e.
- Location: colocate unit tests as `*.test.ts[x]`; e2e in `tests/e2e/`.
- Coverage: target ≥80% for changed code; `npm run test:coverage` if available.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat|fix|docs|chore|refactor|test|perf(scope): message`.
  - Example: `feat(web): booking calendar slot selection`.
- PRs: clear description, link issues, screenshots/GIFs for UI, steps to test, and notes on risks/migrations.

## Security & Configuration Tips
- Store secrets in `.env.local`; never commit. Examples: `VITE_API_BASE_URL`, `JWT_SECRET`.
- Avoid logging PII; scrub request/response logs; add rate limiting on public endpoints.

## Agent‑Specific Instructions
- Keep diffs minimal and scoped; do not modify unrelated modules.
- Follow this file’s structure; update docs when adding scripts or directories.
- Ask before destructive actions (deletes/resets); prefer additive changes.

