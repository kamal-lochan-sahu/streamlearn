const cron       = require('node-cron');
const LiveStream = require('../models/LiveStream');
const { createNotification } = require('../services/notification.service');

// Run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  const thirtyMinFromNow = new Date(Date.now() + 30 * 60 * 1000);
  const inWindow = new Date(Date.now() + 35 * 60 * 1000);

  const streams = await LiveStream.find({
    status: 'scheduled',
    scheduledAt: { $gte: thirtyMinFromNow, $lte: inWindow },
  });

  for (const stream of streams) {
    // TODO: get subscribers and send notification
    console.log(`⏰ Live reminder for: ${stream.title}`);
  }
});

console.log('✅ Live reminder cron registered');
