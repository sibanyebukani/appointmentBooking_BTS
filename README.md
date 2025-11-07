# BookIt — Appointment & Booking System

Comprehensive appointment booking platform with a PWA frontend (`web/`) and a secure TypeScript/Express API (`api/`). Uses MongoDB for persistence, JWT access tokens with refresh rotation, rate limiting, audit logging, and email flows.

## Project Structure

```
.
├─ web/                 # PWA frontend (Vite)
│  ├─ public/           # Static HTML, assets, manifest
│  ├─ vite.config.js
│  └─ package.json
├─ api/                 # Backend API (TypeScript + Express)
│  ├─ src/
│  │  ├─ routes/        # auth, profile, appointments, security, system
│  │  ├─ middleware/    # error handling, rate limiting
│  │  ├─ lib/           # auth, email, logger, validation
│  │  ├─ repos/         # MongoDB repositories
│  │  ├─ db/            # Mongo connection
│  │  └─ index.ts       # API bootstrap (/v1 prefix)
│  ├─ tsconfig.json
│  └─ package.json
├─ tests/               # (placeholder) unit/e2e tests
├─ QUICK_START.md       # Quick usage notes (has some encoding artifacts)
├─ TESTING_SUMMARY.md   # Validation notes (encoding artifacts)
└─ AGENTS.md            # Contributor & repo guidelines
```

## Prerequisites

- Node.js 18+ and npm
- MongoDB instance/URI
- Git (to contribute or sync with remote)

## Getting Started

Install and run API and Web in separate terminals:

```
# API
cd api
npm install
npm run dev         # starts Express on http://localhost:4000

# Web
cd ../web
npm install
npm run dev         # starts Vite on http://localhost:5173
```

Optional:

```
# Web preview (after build)
npm run build
npm run preview

# Or static serve public folder
npm run serve       # serves web/public on http://localhost:3000
```

## Environment Variables

Create `.env` files (not committed) with the following variables.

API (`api/.env`):

```
PORT=4000
MONGODB_URI=mongodb+srv://<user>:<pass>@<host>/<db>
DB_NAME=appointments

# JWT / Tokens
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
JWT_EXPIRES_IN=15m

# CORS / Logging
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info

# Email (DEV: omit USER/PASS to log to console)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=noreply@appointmentbooking.com
FRONTEND_URL=http://localhost:5173
```

Web (`web/.env`):

```
VITE_API_BASE_URL=http://localhost:4000/v1
```

## Scripts

Web (`web/package.json`):

- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run preview` — preview built app
- `npm run serve` — static-serve `public/` on port 3000

API (`api/package.json`):

- `npm run dev` — tsx watch on `src/index.ts`
- `npm run build` — TypeScript build to `dist/`
- `npm start` — run compiled server
- `npm run lint` — ESLint
- `npm test` — Vitest
- `npm run db:ping` — connectivity script

## API Overview

Base URL: `http://localhost:4000/v1`

- `POST /auth/register` — Create account (password strength + breach check)
- `POST /auth/login` — Login (JWT access + refresh token issuance)
- `POST /auth/refresh` — Rotate refresh token, issue new access token
- `POST /auth/request-password-reset` — Start reset flow (email)
- `POST /auth/reset-password` — Complete reset
- `GET /profile` — Get current user profile
- `PUT /profile` — Update profile and preferences
- `GET /appointments` — Appointments placeholder
- `GET /system/health` or `/health` — Health checks
- `GET /security/*` — Security-related routes

Security:

- Helmet, CORS, JSON body parsing, request logging (morgan)
- Global `/v1/*` rate limiting + per-route strict limits (auth, reset, etc.)
- Audit logging to MongoDB and log files (`logs/*.log`)
- Token context binding (IP address + User-Agent validation)

## Build & Deploy

```
# API
cd api
npm run build
node dist/index.js

# Web
cd ../web
npm run build
```

Serve the built frontend from your hosting of choice; point it at the API base URL via `VITE_API_BASE_URL`.

## Testing

- Unit tests (API): `cd api && npm test`
- E2E (if added): place under `tests/e2e/` and wire up Playwright/Cypress.

Note: `QUICK_START.md` and `TESTING_SUMMARY.md` contain additional flows but include some encoding artifacts; this README is the canonical starting point.

## Development Notes

- Follow coding style in `AGENTS.md` (TypeScript preferred, 2-space, semicolons, single quotes)
- Keep secrets in `.env.local` / `.env` files — never commit
- Avoid logging PII; keep rate limits on public endpoints

## Troubleshooting

- API fails to start: ensure `MONGODB_URI` is set and reachable
- Emails not sending: set `EMAIL_USER`/`EMAIL_PASS`; otherwise emails are logged to console in DEV mode
- CORS errors: set `CORS_ORIGIN` to your web app origin

## License

MIT (see individual package licenses where applicable)

