# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Appointment & Booking PWA system designed for service businesses (barbers, salons, tutors, clinics, mechanics, consultants). The project currently contains a backend API with MongoDB integration. The frontend PWA (`web/`) is planned but not yet implemented.

## Architecture

### Backend API (`api/`)
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB (via MongoDB Atlas)
- **Data Layer Pattern**: Repository pattern with separation of concerns
  - `api/src/db/mongo.ts` - Database connection singleton and collection access
  - `api/src/repos/appointmentsRepo.ts` - Data access layer for appointments
  - `api/src/routes/appointments.ts` - HTTP route handlers with validation
  - `api/src/lib/store.ts` - Legacy in-memory store (appears unused, MongoDB is active implementation)
- **API Prefix**: All routes are prefixed with `/v1` (e.g., `/v1/appointments`)
- **Status Values**: Appointments support three statuses: `scheduled`, `cancelled`, `completed`

### Key Data Model
The core `Appointment` entity includes:
- `title`, `date` (ISO 8601), `durationMinutes`, `customerId`
- Optional `notes` field
- `status` enum: `scheduled`, `cancelled`, `completed`
- Automatic `createdAt` and `updatedAt` timestamps

### Middleware Stack
Applied in order:
1. Helmet (security headers)
2. CORS
3. JSON body parser
4. Morgan (request logging)
5. Routes
6. 404 handler (`middleware/error.ts`)
7. Error handler (`middleware/error.ts`)

## Build & Development Commands

### API Development
```bash
cd api
npm install              # Install dependencies
npm run dev              # Start dev server with hot reload (tsx watch)
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled code from dist/
npm test                 # Run Vitest tests
npm run lint             # ESLint validation
npm run db:ping          # Test MongoDB connection
```

### Environment Variables
Required in `api/.env`:
```
MONGODB_URI=mongodb+srv://...
DB_NAME=appointments
PORT=4000
```

**Security Note**: The file `db.txt` contains hardcoded MongoDB credentials and should be moved to `.env` and added to `.gitignore`.

## Code Style (from AGENTS.md)
- **Language**: TypeScript for all code
- **Formatting**: 2 spaces, 100-char line width, semicolons on, single quotes
- **Naming**: `kebab-case` files, `PascalCase` components/classes, `camelCase` variables
- **Linting**: ESLint + Prettier enforced before commits
- **Commits**: Conventional Commits format `type(scope): message`
  - Example: `feat(api): add appointment reminder endpoint`

## Testing Approach
- Unit tests: Vitest (colocate as `*.test.ts`)
- E2E tests: Planned for `tests/e2e/` (not yet implemented)
- Target: ≥80% coverage for changed code

## Common Patterns

### Adding a New Route
1. Define repository functions in `api/src/repos/` (data access)
2. Create route handlers in `api/src/routes/` (validation + repo calls)
3. Register router in `api/src/index.ts` under `/v1` prefix
4. Use validation helpers from `api/src/lib/validate.ts`

### Database Operations
- Always use `getCollection<T>(name)` from `api/src/db/mongo.ts`
- MongoDB is initialized once at startup via `connectMongo()` in `api/src/index.ts:36`
- Transformations: MongoDB `_id` (ObjectId) ↔ API `id` (string) handled in repo layer

### Error Handling
- Throw errors with `.status` property for HTTP status codes
- Use `badRequest(message)` helper from `api/src/lib/validate.ts`
- All errors caught by `errorHandler` middleware and returned as JSON

## Future Web Frontend (Planned)
Per AGENTS.md, the `web/` directory will contain:
- PWA frontend with `src/` and `public/`
- Build commands: `npm run dev`, `npm run build`
- E2E tests via Playwright or Cypress
