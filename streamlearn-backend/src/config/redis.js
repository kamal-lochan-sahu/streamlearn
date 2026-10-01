const Redis = require('ioredis');

let redis = null;

const connectRedis = async () => {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  });
  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('error', (err) => console.error('⚠️  Redis error:', err.message));
  await redis.connect().catch(() => {});
};

const getRedis = () => redis;

module.exports = { connectRedis, getRedis };
