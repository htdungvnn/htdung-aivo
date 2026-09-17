import { createRoute } from "@hono/zod-openapi";
import {
  EmailRegister,
  EmailLogin,
  EmailRequest,
  VerifyEmail,
  ResetPassword,
  GoogleLogin,
  FacebookLogin,
  RefreshToken,
  Accepted,
  Session,
} from "@aivo/auth-contracts";
const body = (schema: any) => ({ content: { "application/json": { schema } } });
const session = {
  200: {
    description: "AIVO session",
    content: { "application/json": { schema: Session } },
  },
};
export const authOpenApiRoutes = [
  createRoute({
    method: "post",
    path: "/register/email",
    tags: ["Authentication"],
    request: { body: body(EmailRegister) },
    responses: {
      202: {
        description: "Verification email queued",
        content: { "application/json": { schema: Accepted } },
      },
    },
  }),
  createRoute({
    method: "post",
    path: "/login/email",
    tags: ["Authentication"],
    request: { body: body(EmailLogin) },
    responses: session,
  }),
  createRoute({
    method: "post",
    path: "/verification/resend",
    tags: ["Authentication"],
    request: { body: body(EmailRequest) },
    responses: {
      202: {
        description: "Accepted",
        content: { "application/json": { schema: Accepted } },
      },
    },
  }),
  createRoute({
    method: "post",
    path: "/verify-email",
    tags: ["Authentication"],
    request: { body: body(VerifyEmail) },
    responses: {
      200: {
        description: "Email verified",
        content: { "application/json": { schema: Accepted } },
      },
    },
  }),
  createRoute({
    method: "post",
    path: "/password/forgot",
    tags: ["Authentication"],
    request: { body: body(EmailRequest) },
    responses: {
      202: {
        description: "Accepted",
        content: { "application/json": { schema: Accepted } },
      },
    },
  }),
  createRoute({
    method: "post",
    path: "/password/reset",
    tags: ["Authentication"],
    request: { body: body(ResetPassword) },
    responses: {
      200: {
        description: "Password reset",
        content: { "application/json": { schema: Accepted } },
      },
    },
  }),
  createRoute({
    method: "post",
    path: "/google",
    tags: ["Authentication"],
    request: { body: body(GoogleLogin) },
    responses: session,
  }),
  createRoute({
    method: "post",
    path: "/facebook",
    tags: ["Authentication"],
    request: { body: body(FacebookLogin) },
    responses: session,
  }),
  createRoute({
    method: "post",
    path: "/refresh",
    tags: ["Authentication"],
    request: { body: body(RefreshToken) },
    responses: session,
  }),
  createRoute({
    method: "post",
    path: "/logout",
    tags: ["Authentication"],
    request: { body: body(RefreshToken) },
    responses: { 204: { description: "Logged out" } },
  }),
] as const;
