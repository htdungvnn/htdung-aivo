import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { success } from '../lib/response';
import type { AppEnv } from '../types';

const HealthSchema = z.object({
  success: z.literal(true),
  data: z.object({
    service: z.string(),
    role: z.literal('gateway'),
    status: z.literal('ok'),
    version: z.string(),
    environment: z.string(),
    timestamp: z.string(),
  }),
  requestId: z.string(),
}).openapi('HealthResponse');

const route = createRoute({
  method: 'get',
  path: '/',
  tags: ['System'],
  summary: 'Gateway health check',
  responses: {
    200: {
      description: 'Gateway is operational',
      content: { 'application/json': { schema: HealthSchema } },
    },
  },
});

export const healthRoutes = new OpenAPIHono<AppEnv>();
healthRoutes.openapi(route, (c) => c.json(success({
  service: c.env.APP_NAME,
  role: 'gateway' as const,
  status: 'ok' as const,
  version: c.env.APP_VERSION,
  environment: c.env.ENVIRONMENT,
  timestamp: new Date().toISOString(),
}, c.get('requestId')), 200));
