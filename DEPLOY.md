# StreamLearn — Deployment Guide

## 🖥️ Architecture
```
Frontend  → Vercel    (free)
Backend   → Render    (free)
Database  → MongoDB Atlas (free M0)
Cache     → Upstash Redis (free)
Storage   → Cloudinary (free)
Video CDN → Cloudinary (demo) / Bunny.net (production)
```

---

## 1️⃣ Backend → Render

### Step 1: Push to GitHub
```bash
cd streamlearn-backend
git init
git add .
git commit -m "StreamLearn backend v1"
git remote add origin https://github.com/YOUR_USERNAME/streamlearn-backend.git
git push -u origin main
```

### Step 2: Deploy on Render
1. Go to https://render.com → New → Web Service
2. Connect GitHub repo: `streamlearn-backend`
3. Settings:
   - **Runtime**: Node
   - **Build**: `npm install`
   - **Start**: `node src/server.js`
   - **Region**: Singapore (closest to India)
4. Add Environment Variables (from .env.production.example)
5. Click Deploy

### Step 3: Get your backend URL
```
https://streamlearn-backend-xxxx.onrender.com
```
Note this URL — you'll need it for frontend.

---

## 2️⃣ Frontend → Vercel

### Step 1: Update .env.production
```
VITE_API_URL=https://streamlearn-backend-xxxx.onrender.com/api
VITE_SOCKET_URL=https://streamlearn-backend-xxxx.onrender.com
```

### Step 2: Push to GitHub
```bash
cd streamlearn-frontend
git init
git add .
git commit -m "StreamLearn frontend v1"
git remote add origin https://github.com/YOUR_USERNAME/streamlearn-frontend.git
git push -u origin main
```

### Step 3: Deploy on Vercel
```bash
# Option A: Vercel CLI (recommended)
npm install -g vercel
cd streamlearn-frontend
vercel

# Option B: Vercel Dashboard
# → vercel.com → New Project → Import GitHub repo
```

### Step 4: Set environment variables in Vercel
```
VITE_API_URL = https://your-backend.onrender.com/api
VITE_SOCKET_URL = https://your-backend.onrender.com
VITE_RAZORPAY_KEY = rzp_test_xxxxxxxxxx
```

---

## 3️⃣ Update CORS on Backend

In your Render env vars, update:
```
CLIENT_URL=https://your-app.vercel.app
```

---

## 4️⃣ Custom Domain (Optional)

**Vercel**: Add domain in Vercel dashboard
**Render**: Add custom domain in Render settings

Example: `app.clientname.com` → Vercel
         `api.clientname.com` → Render

---

## 5️⃣ White Label Delivery

For each new client:
1. Fork both repos OR use same code with client's env vars
2. Change in .env:
   ```
   PLATFORM_NAME=ClientName
   BRAND_COLOR=#their_color
   CLIENT_URL=https://client-domain.com
   ```
3. Deploy fresh Render + Vercel instance
4. Charge: ₹10,000-15,000 deployment fee + hosting

---

## ✅ Post-Deploy Checklist

- [ ] Health check: GET /health → { status: 'ok' }
- [ ] Register a user
- [ ] Login works
- [ ] Browse page loads
- [ ] Admin panel accessible
- [ ] Create a plan
- [ ] Upload a test video
- [ ] PWA: Add to home screen on mobile
- [ ] Push notification test
