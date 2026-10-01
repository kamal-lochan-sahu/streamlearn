const Bull = require('bull');

const transcodingQueue = new Bull('video-transcoding', {
  redis: process.env.REDIS_URL,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

const notificationQueue = new Bull('notifications', {
  redis: process.env.REDIS_URL,
  defaultJobOptions: { attempts: 2, removeOnComplete: true },
});

transcodingQueue.on('global:failed', (jobId, err) => {
  console.error(`Transcoding job ${jobId} failed:`, err);
});

module.exports = { transcodingQueue, notificationQueue };
