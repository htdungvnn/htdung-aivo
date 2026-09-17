import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { ApiError } from '../errors/api-error';
import { createLogger } from '../lib/logger';
import { failure } from '../lib/response';
import type { AppEnv } from '../types';

export function errorHandler(error: Error, c: Context<AppEnv>): Response {
  const requestId = c.get('requestId') || crypto.randomUUID();
  const logger = createLogger(c.env.LOG_LEVEL, {
    requestId,
    method: c.req.method,
    path: c.req.path,
  });

  if (error instanceof ZodError) {
    logger.warn('validation.error', { issues: error.issues });
    return c.json(failure('VALIDATION_ERROR', 'Request validation failed', requestId, error.issues), 400);
  }

  if (error instanceof ApiError) {
    const data = { code: error.code, error, details: error.details };
    if (error.status >= 500) logger.error('gateway.error', data);
    else logger.warn('gateway.rejected', data);
    return c.json(failure(error.code, error.message, requestId, error.details), error.status);
  }

  if (error instanceof HTTPException) {
    logger.warn('http.exception', { status: error.status, error });
    return c.json(failure(`HTTP_${error.status}`, error.message, requestId), error.status);
  }

  logger.error('unhandled.error', { error });
  return c.json(failure('INTERNAL_SERVER_ERROR', 'Internal server error', requestId), 500);
}
