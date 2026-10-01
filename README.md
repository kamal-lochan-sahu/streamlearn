# 🎬 StreamLearn — OTT + Education Platform
**Product 5 of StackForge Portfolio**

> One platform: Netflix + Hotstar + PW + Unacademy — White label, build once, deliver to any client.

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd streamlearn-backend
npm install
cp .env .env.local    # fill in your values
npm run dev           # starts on :5000
```

### 2. Frontend Setup
```bash
cd streamlearn-frontend
npm install
cp .env .env.local    # fill in your values
npm run dev           # starts on :3000
```

### 3. Transcoding Worker (separate terminal)
```bash
cd streamlearn-backend
npm run worker:transcode
```

---

## 📋 Week-by-Week Build Order

### Week 1 — Backend Foundation
- [x] Project scaffold (done via scaffold.py)
- [ ] Fill in content.controller.js (browse, search, stream)
- [ ] Fill in user.controller.js (profile management)
- [ ] Fill in payment.controller.js (Razorpay integration)
- [ ] Test all routes with Postman/Bruno

### Week 2 — Video Engine
- [ ] Test FFmpeg transcoding pipeline locally
- [ ] Set up Bull queue + transcoding worker
- [ ] Test HLS streaming in VideoPlayer component
- [ ] Set up Node Media Server for live RTMP

### Week 3 — Backend Complete
- [ ] Fill remaining controllers (doubt, assignment, coupon, analytics)
- [ ] Implement notification service (email + WhatsApp)
- [ ] Implement recommendation service
- [ ] Test cron jobs (sub expiry, live reminder, cleanup)

### Week 4 — Frontend Foundation
- [ ] Implement Login.jsx + Register.jsx (with API integration)
- [ ] Implement Home.jsx (Netflix layout with ContentRow + HeroSection)
- [ ] Implement Browse.jsx + Search.jsx
- [ ] Implement ContentDetail.jsx (OTT + Education modes)

### Week 5 — Frontend Complete
- [ ] Implement Watch.jsx (VideoPlayer page)
- [ ] Implement LiveWatch.jsx (LiveChat integration)
- [ ] Implement MyCourses.jsx + CourseLearn.jsx
- [ ] Implement Admin pages (Dashboard, Contents, Users, Analytics)

### Week 6 — Polish + Demo
- [ ] Upload demo content (royalty-free videos)
- [ ] Bug fixes + performance optimization
- [ ] Screen recording for portfolio
- [ ] Deploy backend to Render, frontend to Vercel

---

## 🏗️ Architecture

```
Client → React/Vite (Vercel)
         ↕ axios + socket.io
Server → Node/Express (Render)
         ↕ mongoose      ↕ ioredis
         MongoDB Atlas   Upstash Redis
         ↕ bull queue
Video  → FFmpeg → HLS → Cloudinary (demo)
                       → Bunny.net (production)
Live   → OBS → RTMP → Node Media Server → HLS
```

---

## 🔧 Tech Stack

**Backend:** Node.js, Express, MongoDB Atlas, Upstash Redis, Socket.io, Bull, FFmpeg, Cloudinary, Razorpay, Stripe

**Frontend:** React 18, Vite, Tailwind CSS, Zustand, TanStack Query, Video.js, HLS.js, Recharts

---

## 💰 White Label Delivery

| Feature | Toggle |
|---------|--------|
| OTT Mode | `OTT_MODE=true` |
| Education Mode | `EDUCATION_MODE=true` |
| Live Streaming | `LIVE_STREAMING=true` |
| Downloads | `OFFLINE_DOWNLOAD=true` |
| Community | `COMMUNITY_FEATURES=true` |
| Kids Profile | `KIDS_PROFILE=true` |

Client branding: change `PLATFORM_NAME`, `BRAND_COLOR`, `PLATFORM_LOGO` in `.env`.

---

## 🤖 CLI QA Workflow

Use Claude CLI (with Minimax M2.5) as your QA expert:

```bash
# Ask CLI to analyze a specific file
claude "Analyze streamlearn-backend/src/controllers/auth.controller.js for bugs, missing validations, and security issues. Give a detailed report."

# Ask CLI to check all models
claude "Review all models in streamlearn-backend/src/models/ — check schema correctness, missing indexes, and validation gaps."

# Ask CLI to find integration issues
claude "Check the frontend api.js and all service files — are all API endpoints matching the backend routes? List mismatches."

# Ask CLI to test a specific flow
claude "Trace the complete video upload → transcode → stream flow across all files. Find any broken links or missing error handling."
```

---

## 📁 Project Structure

```
streamlearn/
├── streamlearn-backend/
│   ├── src/
│   │   ├── config/      — db, redis, socket, ffmpeg, etc.
│   │   ├── models/      — 20 MongoDB schemas (all complete)
│   │   ├── controllers/ — auth complete, others need implementation
│   │   ├── routes/      — all routes defined
│   │   ├── middleware/  — auth, admin, rate limit, error
│   │   ├── utils/       — jwt, email, pdf, certificate, hls
│   │   ├── services/    — transcoding, streaming, cache, search
│   │   ├── queue/       — Bull job queue + workers
│   │   ├── socket/      — live chat, watch party, live stream
│   │   └── jobs/        — cron: sub expiry, live reminder, cleanup
│   └── package.json
└── streamlearn-frontend/
    ├── src/
    │   ├── store/       — authStore, playerStore, uiStore, liveStore
    │   ├── services/    — api.js + all service modules
    │   ├── components/  — Navbar, ContentCard, HeroSection, VideoPlayer, LiveChat
    │   ├── pages/       — all pages scaffolded (implement per week)
    │   ├── socket/      — Socket.io client setup
    │   └── utils/       — formatters, constants
    └── package.json
```

---

Built by **Sherlock (Kamal Lochan Sahu)** — StackForge Portfolio
