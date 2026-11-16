# CartPilot API

The backend is a separate Express + TypeScript application. It shares the repository with the existing Vite frontend but runs independently.

## Requirements

- Node.js 20.19+ (or a newer supported LTS release)
- PostgreSQL
- npm

## Environment

Create a root `.env` file (do not commit it):

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/cartpilot?schema=public"
PORT=4000
CLIENT_ORIGIN="http://localhost:3000"
```

Keep any existing Gemini secret in the same root environment file. Never expose server secrets through Vite's `VITE_` variables.

## Commands

- `npm run dev:server` — run the API in watch mode
- `npm run prisma:generate` — generate the Prisma client
- `npm run db:migrate` — create/apply a development migration
- `npm run typecheck:server` — type-check backend TypeScript

## Initial endpoints

- `GET /api` — API identity
- `GET /api/health` — process liveness
- `GET /api/health/ready` — database readiness

The first migration creates the customer, cart, cart-item, interaction, activity-event and recovery-message data model. Business endpoints and frontend integration will be added in subsequent stages.
