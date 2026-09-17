import { Hono } from 'hono';
import { ApiError } from '../errors/api-error';
import { resolveServiceUrl, validServices } from '../config/services';
import type { AppEnv, ServiceName } from '../types';

export const proxyRoutes = new Hono<AppEnv>();

proxyRoutes.all('/:service/*', async (c) => {
  const service = c.req.param('service') as ServiceName;
  if (!validServices.has(service)) {
    throw new ApiError(404, 'SERVICE_NOT_FOUND', 'Gateway service route not found');
  }

  const upstreamBase = resolveServiceUrl(c.env, service);
  if (!upstreamBase) {
    throw new ApiError(503, 'SERVICE_NOT_CONFIGURED', `${service} service is not configured`);
  }

  const incomingUrl = new URL(c.req.url);
  const prefix = `/api/v1/${service}`;
  const upstreamPath = incomingUrl.pathname.slice(prefix.length) || '/';
  const target = new URL(upstreamPath + incomingUrl.search, upstreamBase);
  const headers = new Headers(c.req.raw.headers);

  headers.set('x-request-id', c.get('requestId'));
  headers.set('x-forwarded-host', incomingUrl.host);
  headers.set('x-forwarded-proto', incomingUrl.protocol.replace(':', ''));
  headers.delete('host');
  headers.delete('content-length');

  const method = c.req.method;
  const body = method === 'GET' || method === 'HEAD' ? undefined : c.req.raw.body;

  try {
    const response = await fetch(target, {
      method,
      headers,
      body,
      redirect: 'manual',
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('x-request-id', c.get('requestId'));
    responseHeaders.delete('server');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    throw new ApiError(502, 'UPSTREAM_UNAVAILABLE', `${service} service is unavailable`, {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
});
