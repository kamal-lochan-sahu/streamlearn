require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { connectRedis } = require('./config/redis');
const { initSocket } = require('./config/socket');
const { validateEnv } = require('./config/validateEnv');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

async function start() {
  validateEnv();
  await connectDB();
  await connectRedis();

  // Cron jobs
  require('./jobs/subExpiry.job');
  require('./jobs/liveReminder.job');
  require('./jobs/cleanTemp.job');

  // One process for everything (Render free has no second process): INLINE_WORKERS=true runs the video and
  // notification workers inside this server. On a bigger host keep them separate: npm run worker:transcode.
  if (['1', 'true', 'yes'].includes(String(process.env.INLINE_WORKERS || '').toLowerCase())) {
    require('./queue/transcodingWorker');
    require('./queue/notificationWorker');
  }

  server.listen(PORT, () => {
    console.log(`\n🚀 StreamLearn backend running on port ${PORT}`);
    console.log(`   Mode: ${process.env.NODE_ENV}`);
    console.log(`   OTT: ${process.env.OTT_MODE} | EDU: ${process.env.EDUCATION_MODE}\n`);
  });
}

start().catch((err) => {
  console.error('❌ Startup failed:', err);
  process.exit(1);
});
