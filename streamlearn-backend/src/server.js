require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { connectRedis } = require('./config/redis');
const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

async function start() {
  await connectDB();
  await connectRedis();

  // Cron jobs
  require('./jobs/subExpiry.job');
  require('./jobs/liveReminder.job');
  require('./jobs/cleanTemp.job');

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
