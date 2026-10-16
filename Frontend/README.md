# Veynia frontend

Next.js (App Router) on Bun. The browser only talks to Next; Next calls FastAPI
from the server (`lib/api.ts`), with the JWT in an httpOnly cookie.

## Run

With the whole stack: `docker compose up` from the repo root (needs `Frontend/.env.local`).

On the host, with the backend on port 8000:

```bash
cp .env.example .env.local   # then fill in INTERNAL_API_SECRET
bun install
bun run dev                  # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Dev server |
| `bun run build` | Production build |
| `bun run lint` / `bun run typecheck` | ESLint / TypeScript |
| `bun run test` | Unit tests (Vitest) |
| `bun run gen:api` | Regenerate `lib/api-types.ts` from the running backend's OpenAPI schema |

## Layout

- `app/(auth)/`: sign in, register, forgot and reset password, and their server actions
- `app/app/`: the signed-in app (protected by `proxy.ts`)
- `lib/`: API client, session cookie, error formatting, generated API types
- `components/ui/`: buttons, fields, alerts (design tokens live in `app/globals.css`)
