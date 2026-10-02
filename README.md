# StreamLearn

Streaming platform that combines an OTT video experience with education features
(courses, lectures, live classes, certificates).

> Status: under active hardening towards a production release.
> See [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) for the current roadmap and known issues.

## Stack

- **Backend:** Node.js 20, Express, MongoDB (Mongoose), Redis, Bull, Socket.io, FFmpeg (HLS transcoding)
- **Frontend:** React, Vite, Tailwind CSS, Zustand, TanStack Query
- **Payments:** Razorpay, Stripe

## Repository layout

```
streamlearn-backend/    Express API, workers, sockets
streamlearn-frontend/   React single page app
docs/                   Project documentation
scripts/                Developer helper scripts
docker-compose.yml      Local MongoDB and Redis
```

## Local development

Requirements: Node.js 20+, Docker, FFmpeg.

```bash
npm install                      # root tooling (prettier)
npm run setup:env                # creates local .env files with random secrets
npm run db:up                    # starts MongoDB and Redis in Docker

cd streamlearn-backend && npm install && npm run dev
cd streamlearn-frontend && npm install && npm run dev
```

## Scripts (root)

| Script                 | What it does                        |
| ---------------------- | ----------------------------------- |
| `npm run setup:env`    | Create local `.env` files           |
| `npm run db:up/down`   | Start or stop MongoDB and Redis     |
| `npm run format`       | Format the whole repo with Prettier |
| `npm run format:check` | Check formatting (used in CI)       |

## Contributing

- Branch from `main`, use short-lived branches (`feat/...`, `fix/...`, `chore/...`).
- Use Conventional Commit messages (`feat:`, `fix:`, `chore:`, `docs:`).
- CI must pass (format check, backend syntax check, frontend build).
