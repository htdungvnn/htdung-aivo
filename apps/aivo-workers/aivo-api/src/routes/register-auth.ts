import type { OpenAPIHono } from "@hono/zod-openapi";
import { authProxy } from "./auth.proxy";
export function registerAuth(app: OpenAPIHono<any>) {
  app.route("/api/v1/auth", authProxy);
}
