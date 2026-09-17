import { createMiddleware } from 'hono/factory';
import { ApiError } from '../errors/api-error';
import type { AppEnv } from '../types';

export const rateLimitMiddleware = (limit = 120, windowSeconds = 60) =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (!c.env.RATE_LIMIT_KV) {
      await next();
      return;
    }

    const client = c.req.header('cf-connecting-ip') || 'local';
    const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
    const key = `gateway-rate:${client}:${bucket}`;
    const count = Number(await c.env.RATE_LIMIT_KV.get(key) || '0') + 1;

    await c.env.RATE_LIMIT_KV.put(key, String(count), {
      expirationTtl: windowSeconds + 10,
    });

    c.header('x-ratelimit-limit', String(limit));
    c.header('x-ratelimit-remaining', String(Math.max(0, limit - count)));

    if (count > limit) {
      throw new ApiError(429, 'RATE_LIMITED', 'Too many requests');
    }

    await next();
  });
