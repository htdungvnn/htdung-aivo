import { OpenAPIHono } from "@hono/zod-openapi";
import { authOpenApiRoutes } from "./auth.openapi";
type Env = { Bindings: { AUTH: Fetcher }; Variables: { requestId: string } };
export const authProxy = new OpenAPIHono<Env>();
for (const route of authOpenApiRoutes) {
  authProxy.openapi(route as any, async (c: any) => {
    const incoming = new URL(c.req.url),
      target = new URL(
        incoming.pathname.replace(/^\/api\/v1\/auth/, "") + incoming.search,
        "https://aivo-auth.internal",
      );
    const headers = new Headers(c.req.raw.headers);
    headers.set("x-request-id", c.get("requestId"));
    headers.delete("host");
    return c.env.AUTH.fetch(
      new Request(target, {
        method: c.req.method,
        headers,
        body: ["GET", "HEAD"].includes(c.req.method)
          ? undefined
          : c.req.raw.body,
        redirect: "manual",
      }),
    );
  });
}
