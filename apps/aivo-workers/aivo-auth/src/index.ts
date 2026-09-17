import { Hono } from "hono";
import { z } from "zod";
import {
  EmailRegister,
  EmailLogin,
  EmailRequest,
  VerifyEmail,
  ResetPassword,
  GoogleLogin,
  FacebookLogin,
  RefreshToken,
  type MailMessage,
} from "@aivo/auth-contracts";
import {
  facebookIdentity,
  googleIdentity,
  issueAccess,
  passwordHash,
  passwordVerify,
  randomToken,
  sha,
} from "./security";
type E = { Bindings: CloudflareBindings; Variables: { requestId: string } };
const app = new Hono<E>(),
  now = () => new Date().toISOString();
app.use("*", async (c, n) => {
  const id = c.req.header("x-request-id") || crypto.randomUUID();
  c.set("requestId", id);
  c.header("x-request-id", id);
  await n();
});
async function session(c: any, id: string, family = crypto.randomUUID()) {
  const a = await issueAccess(id, c.env),
    raw = randomToken(),
    rid = crypto.randomUUID(),
    expires = new Date(
      Date.now() + Number(c.env.REFRESH_TTL) * 1000,
    ).toISOString();
  await c.env.DB.prepare(
    "INSERT INTO refresh_tokens(id,account_id,family_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)",
  )
    .bind(rid, id, family, await sha(raw), expires, now())
    .run();
  return {
    tokenType: "Bearer",
    accessToken: a.token,
    expiresIn: a.expiresIn,
    refreshToken: raw,
    refreshId: rid,
  };
}
async function action(
  c: any,
  id: string,
  email: string,
  type: "email_verification" | "password_reset",
  locale?: "en" | "vi",
) {
  const raw = randomToken(),
    expires = new Date(
      Date.now() + Number(c.env.ACTION_TTL) * 1000,
    ).toISOString();
  await c.env.DB.prepare(
    "UPDATE action_tokens SET consumed_at=? WHERE account_id=? AND type=? AND consumed_at IS NULL",
  )
    .bind(now(), id, type)
    .run();
  await c.env.DB.prepare(
    "INSERT INTO action_tokens(id,account_id,type,token_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)",
  )
    .bind(crypto.randomUUID(), id, type, await sha(raw), expires, now())
    .run();
  const path =
    type === "email_verification" ? "verify-email" : "reset-password";
  const m: MailMessage = {
    version: 1,
    type:
      type === "email_verification"
        ? "auth.email-verification"
        : "auth.password-reset",
    messageId: crypto.randomUUID(),
    to: email,
    actionUrl: `${c.env.APP_ORIGIN}/${path}?token=${encodeURIComponent(raw)}`,
    expiresAt: expires,
    locale,
  };
  await c.env.EMAIL_QUEUE.send(m);
}
app.post("/register/email", async (c) => {
  const b = EmailRegister.parse(await c.req.json()),
    email = b.email.toLowerCase();
  if (
    await c.env.DB.prepare("SELECT id FROM accounts WHERE email=?")
      .bind(email)
      .first()
  )
    return c.json({ success: false, error: { code: "EMAIL_EXISTS" } }, 409);
  const id = crypto.randomUUID(),
    p = await passwordHash(b.password, Number(c.env.PASSWORD_ITERATIONS)),
    t = now();
  await c.env.DB.prepare(
    "INSERT INTO accounts(id,email,password_hash,password_salt,password_iterations,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      email,
      p.hash,
      p.salt,
      Number(c.env.PASSWORD_ITERATIONS),
      "pending_verification",
      t,
      t,
    )
    .run();
  await action(c, id, email, "email_verification", b.locale);
  return c.json(
    {
      success: true,
      data: { status: "verification_required" },
      requestId: c.get("requestId"),
    },
    202,
  );
});
app.post("/login/email", async (c) => {
  const b = EmailLogin.parse(await c.req.json()),
    r = await c.env.DB.prepare("SELECT * FROM accounts WHERE email=?")
      .bind(b.email.toLowerCase())
      .first<any>();
  if (
    !r ||
    !r.password_hash ||
    !(await passwordVerify(
      b.password,
      r.password_hash,
      r.password_salt,
      r.password_iterations,
    ))
  )
    return c.json(
      { success: false, error: { code: "INVALID_CREDENTIALS" } },
      401,
    );
  if (r.status !== "active")
    return c.json(
      { success: false, error: { code: "EMAIL_NOT_VERIFIED" } },
      403,
    );
  return c.json({
    success: true,
    data: await session(c, r.id),
    requestId: c.get("requestId"),
  });
});
app.post("/verification/resend", async (c) => {
  const b = EmailRequest.parse(await c.req.json()),
    r = await c.env.DB.prepare("SELECT id,status FROM accounts WHERE email=?")
      .bind(b.email.toLowerCase())
      .first<any>();
  if (r && r.status !== "active")
    await action(
      c,
      r.id,
      b.email.toLowerCase(),
      "email_verification",
      b.locale,
    );
  return c.json(
    {
      success: true,
      data: { status: "accepted" },
      requestId: c.get("requestId"),
    },
    202,
  );
});
app.post("/verify-email", async (c) => {
  const b = VerifyEmail.parse(await c.req.json()),
    r = await c.env.DB.prepare(
      "SELECT * FROM action_tokens WHERE token_hash=? AND type='email_verification'",
    )
      .bind(await sha(b.token))
      .first<any>();
  if (!r || r.consumed_at || new Date(r.expires_at) <= new Date())
    return c.json({ success: false, error: { code: "INVALID_TOKEN" } }, 400);
  const t = now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE action_tokens SET consumed_at=? WHERE id=?").bind(
      t,
      r.id,
    ),
    c.env.DB.prepare(
      "UPDATE accounts SET status='active',email_verified_at=?,updated_at=? WHERE id=?",
    ).bind(t, t, r.account_id),
  ]);
  return c.json({
    success: true,
    data: { status: "email_verified" },
    requestId: c.get("requestId"),
  });
});
app.post("/password/forgot", async (c) => {
  const b = EmailRequest.parse(await c.req.json()),
    r = await c.env.DB.prepare("SELECT id FROM accounts WHERE email=?")
      .bind(b.email.toLowerCase())
      .first<any>();
  if (r)
    await action(c, r.id, b.email.toLowerCase(), "password_reset", b.locale);
  return c.json(
    {
      success: true,
      data: { status: "accepted" },
      requestId: c.get("requestId"),
    },
    202,
  );
});
app.post("/password/reset", async (c) => {
  const b = ResetPassword.parse(await c.req.json()),
    r = await c.env.DB.prepare(
      "SELECT * FROM action_tokens WHERE token_hash=? AND type='password_reset'",
    )
      .bind(await sha(b.token))
      .first<any>();
  if (!r || r.consumed_at || new Date(r.expires_at) <= new Date())
    return c.json({ success: false, error: { code: "INVALID_TOKEN" } }, 400);
  const p = await passwordHash(
      b.newPassword,
      Number(c.env.PASSWORD_ITERATIONS),
    ),
    t = now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE action_tokens SET consumed_at=? WHERE id=?").bind(
      t,
      r.id,
    ),
    c.env.DB.prepare(
      "UPDATE accounts SET password_hash=?,password_salt=?,password_iterations=?,updated_at=? WHERE id=?",
    ).bind(p.hash, p.salt, Number(c.env.PASSWORD_ITERATIONS), t, r.account_id),
    c.env.DB.prepare(
      "UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,?) WHERE account_id=?",
    ).bind(t, r.account_id),
  ]);
  return c.json({
    success: true,
    data: { status: "password_reset" },
    requestId: c.get("requestId"),
  });
});
async function social(c: any, x: any) {
  let i = await c.env.DB.prepare(
      "SELECT account_id FROM identities WHERE provider=? AND provider_subject=?",
    )
      .bind(x.provider, x.subject)
      .first<any>(),
    id = i?.account_id;
  if (!id) {
    const same = x.email
      ? await c.env.DB.prepare("SELECT id FROM accounts WHERE email=?")
          .bind(x.email.toLowerCase())
          .first<any>()
      : null;
    id = same?.id || crypto.randomUUID();
    if (!same) {
      const t = now();
      await c.env.DB.prepare(
        "INSERT INTO accounts(id,email,status,email_verified_at,display_name,avatar_url,created_at,updated_at) VALUES(?,?,'active',?,?,?, ?,?)",
      )
        .bind(
          id,
          x.email?.toLowerCase() ?? null,
          x.email ? t : null,
          x.name ?? null,
          x.avatar ?? null,
          t,
          t,
        )
        .run();
    }
    await c.env.DB.prepare(
      "INSERT INTO identities(id,account_id,provider,provider_subject,provider_email,created_at) VALUES(?,?,?,?,?,?)",
    )
      .bind(
        crypto.randomUUID(),
        id,
        x.provider,
        x.subject,
        x.email ?? null,
        now(),
      )
      .run();
  }
  return c.json({
    success: true,
    data: await session(c, id),
    requestId: c.get("requestId"),
  });
}
app.post("/google", async (c) => {
  const b = GoogleLogin.parse(await c.req.json());
  return social(c, await googleIdentity(b.idToken, c.env));
});
app.post("/facebook", async (c) => {
  const b = FacebookLogin.parse(await c.req.json());
  return social(c, await facebookIdentity(b.accessToken, c.env));
});
app.post("/refresh", async (c) => {
  const b = RefreshToken.parse(await c.req.json()),
    r = await c.env.DB.prepare(
      "SELECT * FROM refresh_tokens WHERE token_hash=?",
    )
      .bind(await sha(b.refreshToken))
      .first<any>();
  if (!r || r.revoked_at || new Date(r.expires_at) <= new Date())
    return c.json({ success: false, error: { code: "INVALID_REFRESH" } }, 401);
  const n = await session(c, r.account_id, r.family_id);
  await c.env.DB.prepare(
    "UPDATE refresh_tokens SET revoked_at=?,replaced_by_id=? WHERE id=?",
  )
    .bind(now(), n.refreshId, r.id)
    .run();
  return c.json({ success: true, data: n, requestId: c.get("requestId") });
});
app.post("/logout", async (c) => {
  const b = RefreshToken.parse(await c.req.json());
  await c.env.DB.prepare(
    "UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,?) WHERE token_hash=?",
  )
    .bind(now(), await sha(b.refreshToken))
    .run();
  return c.body(null, 204);
});
app.get("/health", (c) => c.json({ status: "ok" }));
app.onError((e, c) => {
  console.error(e);
  return c.json(
    {
      success: false,
      error: {
        code: e instanceof z.ZodError ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
      },
    },
    e instanceof z.ZodError ? 400 : 500,
  );
});
export default app;
