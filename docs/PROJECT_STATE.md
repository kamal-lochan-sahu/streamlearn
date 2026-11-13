# StreamLearn: Project State

Last updated: 2026-11-13

## Goal

Production-grade OTT + education platform (Node/Express, MongoDB, Redis, Bull, FFmpeg, React/Vite).
Workflow: all changes done locally, reviewed, then pushed to GitHub. Not deployed yet.

## Phases

- [x] Phase 0: cleanup, tooling (lint, CI, Docker, tests setup)
- [x] Phase 1: security and payments (P0 list below)
  - [x] 1a: payments, coupons, subscriptions (P0 #1, #2, #5)
  - [x] 1b: auth hardening (P0 #6, #10, Google login, trust proxy)
  - [x] 1c: access control (P0 #3, #9: streams, uploads, IDOR, sockets)
  - [x] 1d: mass assignment and query injection (P0 #4, #11)
- [x] Phase 2: core flows (player, course learn, admin CRUD, auth flows)
  - [x] 2a: playback and viewer flows (movie play, course learn, resume, continue watching, watchlist)
  - [x] 2b: admin CRUD (content list with drafts, Users page + ban/role, review moderation, CSV export)
  - [x] 2c: auth screens (forgot/reset password, OTP verify, change password, profile picker)
- [ ] Phase 3: video pipeline (object storage, signed access, ffprobe)
  - [ ] 3a: ffprobe check, safer ffmpeg transcoder (quality ladder, no upscaling), job status and errors, duration, safe re-upload
  - [ ] 3b: object storage for HLS files, delete cascade for titles, episodes, lectures and their files
  - [ ] 3c: signed access on object storage, cleanup jobs (orphan files, stuck jobs)
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

- Subscriptions are created only by payment fulfillment (verify or webhook); the public subscribe endpoint is removed.
- Coupon discount is always computed on the server from the plan price. `free_trial` coupons are rejected until supported.
- Stripe currency comes from `STRIPE_CURRENCY` (default `inr`) because plan prices are stored in INR.
- PPV access = a successful `ppv` Transaction (`hasPurchasedContent`); enforced on stream endpoints in 1c.
- Sessions: access token (15m) is sent only in the `Authorization` header and stored by the frontend; the refresh token lives only in an httpOnly cookie (path `/api/auth`), is stored hashed in the DB and rotates on every refresh. No `accessToken` cookie exists anymore and the backend ignores cookies for access.
- Cookie SameSite: `lax` in dev, `none; Secure` in production, override with `COOKIE_SAMESITE`. Safari and Chrome block third-party cookies, so for production serve the API under the same site as the frontend (custom domain like `api.example.com` + `app.example.com`, or a Vercel rewrite of `/api` to the backend) and set `COOKIE_SAMESITE=lax`. Decide this in Phase 5.
- Only one refresh token is stored per user, so logging in on a second device signs out the first one. Revisit if multi-device sessions are needed.
- Public sign-up always creates a `viewer`. The first owner is created with `npm run create-owner -- <email> "<name>"` (also promotes an existing account).
- OTP: 6 digits from `crypto.randomInt`, stored hashed, 5 guesses per code (counted atomically), then locked for 15 minutes, 60 second resend cooldown. `send-otp` and `forgot-password` return the same answer whether or not the account exists.
- Google login: the callback redirects to `CLIENT_URL/auth/callback?code=...` with a one-time code (60s, single use); the frontend swaps it via `POST /auth/google/exchange`. A `state` cookie protects against login CSRF. Linking Google to an unverified local account wipes that account's password. Without `GOOGLE_*` env vars the server still boots and `/auth/google` answers 503.
- Passwords: minimum 8 characters (register, reset, change). Reset and change password end all other sessions.
- Video playback: `GET /content/:slug/stream`, `/episodes/:id/stream`, `/lectures/:id/stream` check access first (`services/access.service.js`: free, active subscription, successful PPV purchase, owner/staff, published and not expired; free-preview lectures work for any logged-in user) and return a signed link `<STREAM_BASE_URL or request host>/hls/<token>/master.m3u8`. The token is a 4h JWT (audience `hls`) for ONE video folder and sits in the URL path, so playlists and segments inherit it. `/uploads` is no longer served; HLS files are only readable through `/hls`. `videoFiles` now store relative paths, never URLs, and are never sent in detail/listing responses.
- Roles: `owner`/`admin` manage everything; `creator` only content (and its episodes, lectures, assignments, streams) they own. Assignments, doubts and progress need access to the course. Students see only their own assignment submission.
- Sockets: every namespace requires a valid access token (user is loaded from the DB), `join-stream`/`join-party` check audience/membership, messages are length- and rate-limited, only the host controls watch-party playback, one poll vote per person (atomic).
- Live streams: viewers never receive `streamKey`, `rtmpUrl`, `hlsUrl` or `recordingUrl`; they get the playback link from `/live/:id/stream-url` after the audience check. Known gap: the live HLS server itself (nginx-rtmp or similar) is still outside this app, so its URL is not signed. Protect it in Phase 5 (secure link module or move to a managed live service).
- Content text index uses `language_override: 'textSearchLanguage'` because `Content.language` is an array (real MongoDB refused every insert otherwise). An existing database that already has the old `title_text_description_text_tags_text` index must drop it once (`db.contents.dropIndex('title_text_description_text_tags_text')`) before the app can rebuild it; fresh databases need nothing.
- Query input (1d): `utils/query.utils.js` parses browse/search/user-list input (text, enum, list, int, page/limit, sort whitelist) and answers 400 for objects, unknown enum values and too long text; page/limit are clamped (limit max 50, admin lists 100). A global `rejectOperatorKeys` middleware (after the body parsers) answers 400 to any query/body key starting with `$` or named `__proto__`; raw webhook bodies are skipped. Search text is escaped before use in a RegExp (suggestions, admin user search).
- Listings (browse, search, suggestions, featured, trending, new releases, related, recommendations) only show published content (`publishedFilter` in `search.service.js`, same rule as `isPublished` in `access.service.js`), and list items use `LIST_FIELDS` (never `videoFiles`, `ownerId`). The browse cache key is built from the cleaned params only.
- Mass assignment (1d): plan, review, settings, profile and continue-watching handlers read only whitelisted, validated fields (`optional*` helpers in `utils/validate.utils.js`). Plans reject negative or non-numeric prices (they drive payments) and cannot be deleted while they have active subscribers. Reviews recompute the content rating on create/update/delete; "helpful" is an atomic toggle.
- Settings are platform-wide (one document, first admin who saves creates it). Admins read everything; everyone else only `platform` and `features`. Section updates use dot paths, so a branding save no longer wipes other branding fields.
- Secrets: `User.toJSON` strips `password`, `refreshToken`, `otp`, `oauthCode`, `resetPasswordToken`, `resetPasswordExpires`; profile and admin user list also exclude them in the query.
- Error handler: Mongoose `CastError` and `ValidationError` become 400, duplicate key 409, bad JSON 400, and unexpected 500s show a generic message in production.
- Mongo portability: positional `$` updates, `$pull` on subdocuments and `$ne` on nested arrays are avoided (FerretDB, used in sandbox tests, evaluates them wrongly). Use `$nor`, load-modify-save with version retry, etc.
- `TRUST_PROXY` (hops, default 1 in production) makes rate limits use the real client IP behind Render/Vercel.
- Title endpoints under `/content/:slug` (detail, stream, resume, episodes) accept the slug OR the id. Frontend links always use the slug (`/player/:slug`, `/learn/:slug/:lectureId`); only episodes (`/player/:episodeId?type=episode`) and lectures use ids. Detail of a draft, scheduled or expired title answers 404 except for staff and the owning creator (preview). Students never see draft lectures or episodes.
- Resume: `resumeAt` (seconds) comes back in the stream response itself (movies/episodes from the active profile's continue-watching entry, lectures from `CourseProgress.lastLecture/lastTimestamp`), so the player starts at the right place without a second request. `GET /content/:slug/resume` tells the detail page which episode or lecture to continue. An episode stream also returns `nextEpisodeId` (autoplay). Finished titles are removed with `DELETE /users/continue-watching/:contentId`.
- Continue watching: one entry per title and profile (a series keeps its latest episode), sorted newest first, max 50, ids must belong together (episode/lecture of that content). The list shows only published titles and returns `episodeId` / `lectureId`.
- Progress saving in the browser: `hooks/useProgressSaver` (every 10s, on pause, on leaving). Background requests pass `{ silent: true }` so the global error toast stays quiet.
- Watchlist: one document per profile (unique index on userId + profileIndex), adds are atomic, removed/unpublished titles are skipped in the list, max 500 items. Newly added titles can only be published ones.
- React Query v5: always `invalidateQueries({ queryKey: [...] })` (the array form silently invalidated everything).
- Admin (2b): `GET /content/admin/list` (drafts included; creators see only their own titles) feeds the admin Content page. `GET /users/admin/all` lists every role with search, role and status filters. Ban/unban (`PUT /users/admin/:id/status`, admin) removes the refresh token; the access token stops working at once because `authenticate` checks `isActive` on every request. Roles (`PUT /users/admin/:id/role`) are changed by the owner only, to viewer, creator or admin. Nobody changes themselves or the owner; only the owner changes admins. Review moderation: `GET /reviews/admin/all`, `PUT /reviews/admin/:id/visibility`; a review hidden by staff has `moderated: true` and its author cannot bring it back. Export: `GET /analytics/export?type=transactions|subscriptions|users|content&days=` streams a CSV (max 50,000 rows, text starting with = + - @ gets an apostrophe so spreadsheets do not run it as a formula).
- Auth screens (2c): `/forgot-password`, `/reset-password/:token` (signs the user in afterwards), `/login/otp` (6 digit email code, resend after 60s) and a Change password card on the Account page (the server signs out other devices and this device gets the new session). All sign-in paths go through `authStore.applySession`. The app calls `refreshUser()` (GET /users/profile) when it opens, so role, subscription and profiles are never stale. `switchProfile` asks the server first and then updates the store; `activeProfileIndex` is persisted. Profiles are addressed by position: deleting profile i moves the later ones up, so the active profile index and the per-profile watchlists are shifted with it (the deleted profile's watchlist is deleted). `POST /users/profiles` and `DELETE /users/profiles/:i` answer `{ profiles, activeProfile }`.
- Video pipeline (3a): `services/video.service.js#queueTranscode` is the only way an upload becomes a job (content, episode, lecture, `/upload/video`). It ffprobes the file first (`utils/ffmpeg.utils.js`): not a video, no video track, broken, or longer than `MAX_VIDEO_HOURS` (default 12) answers 400 with a readable message before anything is queued; the temp file is removed by the caller. A second upload while a job for the same item is really queued or running answers 409; a stale "processing" whose job no longer exists does not block. ffmpeg and ffprobe are started with `spawn` and an argument list (no shell, no `fluent-ffmpeg`), with a time limit (`TRANSCODE_TIMEOUT_MINUTES`, default 360).
- Quality ladder: 480p, 720p and 1080p rungs are made only when the source is that tall (never upscaled); a source smaller than 480p gets one rung at its own size under the key `480p`. Rungs are named folders (`480p/`, `720p/`, `1080p/`), audio is optional (silent videos stay silent), phone rotation is respected, keyframes every 2 seconds. `videoFiles` lists only rungs that exist; `/stream?quality=` falls back to master when a quality is missing.
- Transcode results: the worker encodes into `<dir>.new-<jobId>` and swaps it in only when everything worked, so a failed re-upload never damages the video that already plays. The first finished video publishes the item (`isActive: true`); a re-upload never changes visibility. `duration` (seconds) is saved from ffprobe and also returned by the upload response. `transcodeStatus` stays `processing` while retries remain; only the last attempt writes `failed` plus a short `transcodeError` (no server paths). A title deleted while its video is processed leaves no files behind.
- `transcodeJobId` and `transcodeError` are server-only: they are in `SERVER_MANAGED`, and `utils/schema.utils.js` strips them from `toJSON()` and `toObject()` of Content, Episode and Lecture. Do not use `select: false` for such fields: FerretDB (sandbox tests) cannot run `findOneAndUpdate` with that projection. The admin content list adds `transcodeError` on purpose; the admin Content page shows it as a tooltip on a red "failed" badge and checks again every 5 seconds while something is processing.

## Working agreement

- One phase per chat session. At the start of a session, re-read this file and the latest code on GitHub.
- All changes are made locally, verified, then pushed. Scripts are delivered as downloadable files.
- Local repo: ~/projects/ott/streamlearn. Local setup: `npm run setup:env && npm run db:up`.

## Session log

- 2026-10-02, Phase 0: removed unused stubs, dependencies and scratch files; added env examples,
  docker-compose, prettier, editorconfig, CI, backend Dockerfile, README, local env script.
  Deferred to Phase 4: ESLint config and automated tests. Deferred to Phase 1: removal of no-op
  controller exports (done together with controller rewrites). LICENSE: owner to decide.
- 2026-10-02, Phase 1a: payments rewrite (server-side pricing and cycle, signature checks with timing-safe compare,
  idempotent fulfillment shared by verify and webhooks, raw-body webhooks, ownership check on verify),
  coupon service with atomic redemption and admin-only CRUD, no-op controller exports removed for payments,
  subscriptions and coupons. Admin transactions page now uses `/payments/admin/all`.
- 2026-10-04, Phase 1b: auth rewrite (hashed rotating refresh tokens, Origin check on refresh/logout/exchange, header-only access tokens, OTP attempt limit and lockout, no account discovery on OTP/forgot, owner only via script, Google login via one-time code with state, trust proxy, env validation at startup, separate rate limiters). Frontend: refresh interceptor no longer loops (single refresh shared by parallel requests, auth endpoints excluded, no redirect when already on /login), `/auth/callback` page, `API_URL` export, Register password minimum 8.
- 2026-10-23, Phase 1c: private signed video links (`/hls`), access service used by stream/assignment/doubt/progress/live/watch-party, creator ownership checks on every content mutation, mass-assignment guards on content/episode/lecture/live updates, IDOR fixes (notifications, assignments, doubts, live start/end/update/delete), upload hardening (creators only, type filter, random filenames, temp files removed on refusal; fixed `rule.test is not a function` crash in the filter), socket auth per namespace, real HTTP 201 on create endpoints. Removed unused `subscription.middleware.js` and `streaming.service.js`.
- 2026-10-26, Phase 1d: query injection and mass assignment (see Decisions). Known leftovers for Phase 2: `analytics/export` is a stub that claims an email is queued; the admin Users page calls `/users/profile` instead of the admin list; watchlist `get` returns empty objects for removed content; there is no review moderation by staff. Phase 5: `cache.delPattern` uses Redis `KEYS` (blocking).
- 2026-10-30, Phase 2a: playback and viewer flows. Movie play (id vs slug) and course learn fixed by accepting both on the API and linking by slug; resume position for movies, episodes and lectures; next-episode autoplay; continue-watching saved with the right ids (episodes used to be saved as a title and vanished) and listed with one query; progress saving that really runs while playing (the old 5s timer was reset on every time update); player retries short HLS errors and seeks reliably; drafts previewable by their owner; watchlist `get` no longer returns empty objects; Play on cards/hero opens the detail page for series and courses. Known gaps left for later: the "My Notes" box on the player page is not saved anywhere (needs a model, Phase 6); view count increments on every uncached detail load instead of on play.
- 2026-10-30, Phase 2b: admin CRUD (see Decisions). Known gap: deleting a title (`DELETE /content/admin/:id`) removes only the Content document, not its episodes, sections, lectures, reviews or video files (needs a cascade, Phase 3 with object storage).
- 2026-11-11, Phase 2c: auth screens (see Decisions). Phase 2 is complete once 2c is merged. Known gaps for later: `npm run lint` in the frontend has no ESLint config file (Phase 4 tooling); no email verification step after register (accounts are usable at once; email codes only work as a login method); profile avatars per profile are not editable yet.
- 2026-11-13, Phase 3a: video pipeline basics (see Decisions). Removed `fluent-ffmpeg` and `config/ffmpeg.js`; new env vars `FFPROBE_PATH`, `FFMPEG_PRESET`, `MAX_VIDEO_HOURS`, `TRANSCODE_TIMEOUT_MINUTES` (all optional). Known gaps for 3b/3c: files still live on the server disk (`HLS_OUTPUT_PATH`), deleting a title, episode or lecture does not remove its files or child documents yet, no cleanup of orphan folders or stuck jobs, one transcode at a time per worker process (concurrency 1).
