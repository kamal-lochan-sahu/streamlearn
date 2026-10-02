#!/usr/bin/env bash
# Local development ke liye .env files banata hai (git me kabhi commit nahi hoti).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BE_ENV="$ROOT/streamlearn-backend/.env"
FE_ENV="$ROOT/streamlearn-frontend/.env"
rand() { openssl rand -hex 32; }

FE_PORT=$(grep -oE "port: *[0-9]+" "$ROOT/streamlearn-frontend/vite.config.js" 2>/dev/null | grep -oE "[0-9]+" | head -1 || true)
FE_PORT=${FE_PORT:-5173}
BE_PORT=5000

if [ -f "$BE_ENV" ]; then
  echo "skip: $BE_ENV already exists"
else
  cat > "$BE_ENV" <<ENVEOF
NODE_ENV=development
PORT=${BE_PORT}
CLIENT_URL=http://localhost:${FE_PORT}

MONGODB_URI=mongodb://localhost:27017/streamlearn
REDIS_URL=redis://localhost:6379

JWT_SECRET=$(rand)
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=$(rand)
REFRESH_TOKEN_EXPIRES_IN=7d

TEMP_UPLOAD_PATH=./uploads/temp
HLS_OUTPUT_PATH=./uploads/hls
STREAM_BASE_URL=http://localhost:${BE_PORT}
FFMPEG_PATH=$(command -v ffmpeg || echo /usr/bin/ffmpeg)

OTT_MODE=true
EDUCATION_MODE=true

# Dummy placeholders: sirf server boot hone ke liye. Feature test karte waqt asli test keys daalo.
GOOGLE_CLIENT_ID=dummy-client-id
GOOGLE_CLIENT_SECRET=dummy-client-secret
GOOGLE_CALLBACK_URL=http://localhost:${BE_PORT}/api/auth/google/callback
RAZORPAY_KEY_ID=rzp_test_dummy
RAZORPAY_KEY_SECRET=dummy
RAZORPAY_WEBHOOK_SECRET=dummy
STRIPE_SECRET_KEY=sk_test_dummy
STRIPE_WEBHOOK_SECRET=whsec_dummy

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

EMAIL_FROM=StreamLearn <noreply@localhost>
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
ENVEOF
  chmod 600 "$BE_ENV"
  echo "created: $BE_ENV"
fi

if [ -f "$FE_ENV" ]; then
  echo "skip: $FE_ENV already exists"
else
  cat > "$FE_ENV" <<ENVEOF
VITE_API_URL=http://localhost:${BE_PORT}/api
VITE_SOCKET_URL=http://localhost:${BE_PORT}
ENVEOF
  echo "created: $FE_ENV"
fi
