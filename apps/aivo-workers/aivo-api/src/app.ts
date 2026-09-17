import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { errorHandler } from "./middleware/error-handler";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { requestIdMiddleware } from "./middleware/request-id";
import { requestLoggerMiddleware } from "./middleware/request-logger";
import { failure, success } from "./lib/response";
import { healthRoutes } from "./routes/health";
import { proxyRoutes } from "./routes/proxy";
import type { AppEnv } from "./types";

export const app = new OpenAPIHono<AppEnv>();

app.use("*", requestIdMiddleware);
app.use("*", requestLoggerMiddleware);
app.use("*", secureHeaders());

app.use("/api/*", async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGINS.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : allowed[0]),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-Id",
      "Idempotency-Key",
    ],
    exposeHeaders: [
      "X-Request-Id",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
    ],
    credentials: true,
    maxAge: 86400,
  })(c, next);
});

app.use("/api/*", rateLimitMiddleware());

app.get("/", (c) =>
  c.json(
    success(
      {
        service: c.env.APP_NAME,
        role: "gateway",
        version: c.env.APP_VERSION,
        docs: "/docs",
        openapi: "/openapi.json",
      },
      c.get("requestId"),
    ),
  ),
);

app.route("/api/v1/health", healthRoutes);
app.route("/api/v1", proxyRoutes);

app.doc("/openapi.json", (c) => ({
  openapi: "3.1.0",
  info: {
    title: c.env.APP_NAME,
    version: c.env.APP_VERSION,
    description: "Edge gateway for AIVO web, mobile, and downstream services.",
  },
  servers: [{ url: new URL(c.req.url).origin, description: c.env.ENVIRONMENT }],
  tags: [
    { name: "System", description: "Gateway system endpoints" },
    { name: "Gateway", description: "Proxied downstream service endpoints" },
  ],
}));

app.get(
  "/docs",
  apiReference({
    spec: { url: "/openapi.json" },
    pageTitle: "AIVO API Gateway",
    theme: "purple",
  }),
);

app.notFound((c) =>
  c.json(
    failure(
      "ROUTE_NOT_FOUND",
      "Gateway route not found",
      c.get("requestId") || crypto.randomUUID(),
    ),
    404,
  ),
);

app.onError(errorHandler);
