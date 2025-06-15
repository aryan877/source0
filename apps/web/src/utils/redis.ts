import Redis, { type RedisOptions } from "ioredis";

const redisUrl = process.env.REDIS_URL;
const redisTlsEnabled = process.env.REDIS_TLS_ENABLED === "true";

if (!redisUrl || redisUrl.includes("your-upstash-redis-password")) {
  console.warn(
    "Redis environment variable REDIS_URL not set or is using placeholder values. Resumable streams will be disabled."
  );
}

const createRedisInstance = () => {
  if (!redisUrl || redisUrl.includes("your-upstash-redis-password")) {
    return null;
  }

  const options: RedisOptions = {
    maxRetriesPerRequest: null,
  };

  if (redisTlsEnabled) {
    options.tls = { rejectUnauthorized: false };
  }

  return new Redis(redisUrl, options);
};

export const redis = createRedisInstance();

// Create separate instances for publishing and subscribing as recommended by ioredis.
export const pub = createRedisInstance();
export const sub = createRedisInstance();
