<!-- Copilot instructions for the AudioSeg / Nativox repo -->
# Copilot quick orientation

These notes help AI coding agents be productive immediately in this repository (AudioSeg / Nativox).
Keep guidance concise and concrete — reference files and commands the project actually uses.

## Big picture (what this app is)
- Full-stack TypeScript web app for manual audio transcription/translation.
- Frontend: React + Vite (client/). Backend: Express + Node (server/) bundled for production.
- Database: PostgreSQL with Drizzle ORM (shared/schema.ts + server/db.ts). File uploads stored in `uploads/`.

## Key entry points
- Development: `npm run dev` (runs `tsx server/index.ts` and Vite in dev so server+client served on same port).
- Production build: `npm run build` then `npm start` (builds client with Vite and server with esbuild -> `dist/index.js`).
- Database migrations: `npm run db:push` (uses drizzle-kit).

## Project structure highlights (files to read first)
- `README.md` — high-level overview, environment vars, and most scripts.
- `server/index.ts` — server bootstrapping, logging middleware, Vite integration in dev.
- `server/routes.ts` — main API surface (projects, folders, segments, audio streaming, uploads).
- `server/routes-auth.ts` — JWT login/verify endpoints used by the frontend.
- `server/storage.ts` — data-access abstraction (used throughout routes) — read this to understand DB operations and shape.
- `shared/schema.ts` — Drizzle schema and TypeScript types shared between server and client.
- `client/src/App.tsx` + `client/src/main.tsx` — front-end routing, providers (Auth, i18n, React Query).

## Important conventions & patterns
- Authentication: JWT-based endpoints live in `server/routes-auth.ts`. The frontend calls `/api/auth/login` and `/api/auth/verify`.
- Authorization: route handlers use `authenticateToken` middleware from `server/middleware/auth` and then check `user.role` or `storage.getUserLanguages(user.id)` to gate access.
- Uploads: `multer` stores uploads into the top-level `uploads/` directory. Files are referenced in DB rows via `filePath`.
- Audio streaming: `/api/segments/:id/audio` implements byte-range streaming — preserve headers when modifying this route.
- Frontend routing uses `wouter` and guarded routes via `AuthContext` and `ProtectedRoute` component.
- Schema-first types: types come from `shared/schema.ts` and are used across server and client — prefer those types when adding new endpoints or front-end models.

## Build / test / debug tips (practical commands)
- Install: `npm install` (project uses Node 20+)
- Dev: `npm run dev` — starts the TypeScript server (tsx) and sets up Vite in dev mode via `server/vite.ts`.
- Build: `npm run build` — runs `vite build` then `esbuild` to bundle `server/index.ts` into `dist/`.
- Start (prod): `npm start` — runs `node dist/index.js` (ensure `PORT` env is set if needed).
- DB: run migrations with `npm run db:push`. Use `npm run db:studio` if available for a GUI.

## Common pitfalls and things to preserve
- Do not register Vite dev middleware before API routes — `server/index.ts` intentionally sets up Vite only after `registerRoutes`.
- When changing audio serving, preserve range-request handling and Content-Range/206 responses to keep waveform player functional.
- `uploads/` contains sample audio files used by developers; tests and manual QA rely on this layout.
- Environment variables: see `README.md` for required vars: DATABASE_URL, SESSION_SECRET, REPL_ID, REPLIT_DOMAINS, JWT_SECRET.

## Examples (copy these patterns)
- Authorization check (pattern used repeatedly in routes):

  - Fetch resource, fetch user, if user.role !== 'manager' then verify language access via `storage.getUserLanguages(user.id)` and compare to resource.languageId.

- File upload (multer):

  - multer diskStorage -> destination `uploads/` -> unique filename: timestamp + random + ext

## Integration points & external deps
- PostgreSQL (Neon recommended); Drizzle ORM used for queries — see `drizzle.config.ts` and `shared/schema.ts`.
- Replit auth is present but partially disabled; some auth helpers exist (`server/replitAuth.ts`, `server/replitAuth.backup.ts`). JWT endpoints in `routes-auth.ts` are active.
- ffmpeg (`fluent-ffmpeg`) is used server-side for audio processing (ensure ffmpeg binary is available in the environment when using related routes).

## When editing or adding endpoints
- Add types to `shared/schema.ts` where appropriate, then use those types in client components and server handlers.
- Follow existing error handling: catch, log to console, respond with status and `{ message }` JSON. Keep the pattern used in `routes.ts`.
- Add route-level logging using the logging wrapper established in `server/index.ts` (it captures JSON responses for /api/*).

## If merging existing copilot instructions
- If a `.github/copilot-instructions.md` already exists, preserve any manual notes about local developer credentials or internal deployment steps. Merge these topically into the matching sections above.

---
If any section is unclear or you'd like examples for a specific code area (e.g. adding a new `/api` endpoint or a client page), tell me which file and I'll expand the instructions.
