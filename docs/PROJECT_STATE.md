# StreamLearn: Project State

Last updated: 2026-10-02

## Goal

Production-grade OTT + education platform (Node/Express, MongoDB, Redis, Bull, FFmpeg, React/Vite).
Workflow: all changes done locally, reviewed, then pushed to GitHub. Not deployed yet.

## Phases

- [x] Phase 0: cleanup, tooling (lint, CI, Docker, tests setup)
- [ ] Phase 1: security and payments (P0 list below)
- [ ] Phase 2: core flows (player, course learn, admin CRUD, auth flows)
- [ ] Phase 3: video pipeline (object storage, signed access, ffprobe)
- [ ] Phase 4: automated tests (auth, payments, access control)
- [ ] Phase 5: deployment and monitoring
- [ ] Phase 6: competitor-driven features

## Open P0 issues (from initial audit)

1. POST /subscriptions/subscribe activates a plan without payment
2. Coupon routes have no admin check; /coupons/validate route missing
3. Stream endpoints ignore access/subscription; signed URL never validated; /uploads is public
4. Update endpoints pass req.body directly (mass assignment)
5. Razorpay verify hardcodes monthly; webhooks do not activate subscriptions; Stripe webhook cannot work (json parser runs before raw)
6. Cross-site cookies (SameSite=strict) and refresh interceptor loop break prod login
7. Deploy blockers: Google strategy needs GOOGLE_CLIENT_ID, missing trust proxy, worker/ffmpeg/disk on Render
8. Broken flows: movie play (id vs slug), course learn (id vs slug), admin list hides drafts, watchlist empty objects, Google login returns JSON
9. IDOR and data leaks: assignments, notifications, doubts, live start/end, watch-party sockets
10. OTP without attempt limit; first registered user becomes owner
11. NoSQL and regex injection via query params

## Decisions

(none yet)

## Working agreement

- One phase per chat session. At the start of a session, re-read this file and the latest code on GitHub.
- All changes are made locally, verified, then pushed. Scripts are delivered as downloadable files.
- Local repo: ~/projects/ott/streamlearn. Local setup: `npm run setup:env && npm run db:up`.

## Session log

- 2026-10-02, Phase 0: removed unused stubs, dependencies and scratch files; added env examples,
  docker-compose, prettier, editorconfig, CI, backend Dockerfile, README, local env script.
  Deferred to Phase 4: ESLint config and automated tests. Deferred to Phase 1: removal of no-op
  controller exports (done together with controller rewrites). LICENSE: owner to decide.
