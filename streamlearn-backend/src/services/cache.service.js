const { getRedis } = require('../config/redis');

const DEFAULT_TTL = 60 * 5; // 5 minutes

const get = async (key) => {
  const redis = getRedis();
  if (!redis) return null;
  const val = await redis.get(key);
  return val ? JSON.parse(val) : null;
};

const set = async (key, value, ttl = DEFAULT_TTL) => {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), 'EX', ttl);
};

const del = async (key) => {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(key);
};

const delPattern = async (pattern) => {
  const redis = getRedis();
  if (!redis) return;
  const keys = await redis.keys(pattern);
  if (keys.length) await redis.del(...keys);
};

module.exports = { get, set, del, delPattern };
