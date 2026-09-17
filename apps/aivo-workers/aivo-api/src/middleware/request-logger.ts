import { createMiddleware } from 'hono/factory';
import { createLogger } from '../lib/logger';
import type { AppEnv } from '../types';

const ignoredPaths = new Set([
  '/docs', '/docs/', '/openapi.json', '/favicon.ico', '/robots.txt',
]);

function shouldIgnore(path: string): boolean {
  return ignoredPaths.has(path) || path.startsWith('/docs/');
}

export const requestLoggerMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  if (shouldIgnore(c.req.path)) {
    await next();
    return;
  }

  const startedAt = Date.now();
  const logger = createLogger(c.env.LOG_LEVEL, {
    requestId: c.get('requestId'),
    environment: c.env.ENVIRONMENT,
  });

  logger.info('http.request', {
    request: {
      method: c.req.method,
      path: c.req.path,
      query: c.req.query(),
      userAgent: c.req.header('user-agent'),
      contentType: c.req.header('content-type'),
      clientIp: c.req.header('cf-connecting-ip'),
    },
  });

  try {
    await next();
    logger.info('http.response', {
      response: {
        status: c.res.status,
        contentType: c.res.headers.get('content-type'),
      },
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    logger.error('http.failed', {
      error,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
});
