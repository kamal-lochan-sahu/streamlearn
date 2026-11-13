const Bull = require('bull');

// TRANSCODE_ATTEMPTS / TRANSCODE_BACKOFF_MS exist so tests can fail fast; the defaults are for real use.
const transcodingQueue = new Bull('video-transcoding', {
  redis: process.env.REDIS_URL,
  defaultJobOptions: {
    attempts: Number(process.env.TRANSCODE_ATTEMPTS) || 3,
    backoff: { type: 'exponential', delay: Number(process.env.TRANSCODE_BACKOFF_MS) || 5000 },
    removeOnComplete: true,
    removeOnFail: 100, // keep the last 100 failures for debugging, not all of them forever
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
