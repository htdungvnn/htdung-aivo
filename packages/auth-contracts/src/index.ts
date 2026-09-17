import { z } from "@hono/zod-openapi";
export const EmailRegister = z
  .object({
    email: z.email(),
    password: z.string().min(12).max(128),
    locale: z.enum(["en", "vi"]).optional(),
  })
  .openapi("EmailRegister");
export const EmailLogin = z
  .object({ email: z.email(), password: z.string().min(1).max(128) })
  .openapi("EmailLogin");
export const EmailRequest = z
  .object({ email: z.email(), locale: z.enum(["en", "vi"]).optional() })
  .openapi("EmailRequest");
export const VerifyEmail = z
  .object({ token: z.string().min(32) })
  .openapi("VerifyEmail");
export const ResetPassword = z
  .object({
    token: z.string().min(32),
    newPassword: z.string().min(12).max(128),
  })
  .openapi("ResetPassword");
export const GoogleLogin = z
  .object({ idToken: z.string().min(20) })
  .openapi("GoogleLogin");
export const FacebookLogin = z
  .object({ accessToken: z.string().min(20) })
  .openapi("FacebookLogin");
export const RefreshToken = z
  .object({ refreshToken: z.string().min(40) })
  .openapi("RefreshToken");
export const Accepted = z
  .object({
    success: z.literal(true),
    data: z.object({ status: z.string() }),
    requestId: z.string(),
  })
  .openapi("Accepted");
export const Session = z
  .object({
    success: z.literal(true),
    data: z.object({
      tokenType: z.literal("Bearer"),
      accessToken: z.string(),
      expiresIn: z.number(),
      refreshToken: z.string(),
    }),
    requestId: z.string(),
  })
  .openapi("AuthSession");
export type MailMessage = {
  version: 1;
  type: "auth.email-verification" | "auth.password-reset";
  messageId: string;
  to: string;
  actionUrl: string;
  expiresAt: string;
  locale?: "en" | "vi";
};
