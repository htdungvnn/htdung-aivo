import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
const e = new TextEncoder();
const b64 = (b: Uint8Array) => {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const ub = (v: string) => {
  const x =
    v.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (v.length % 4)) % 4);
  return Uint8Array.from(atob(x), (c) => c.charCodeAt(0));
};
export const randomToken = (n = 48) =>
  b64(crypto.getRandomValues(new Uint8Array(n)));
export const sha = async (v: string) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", e.encode(v))),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
export async function passwordHash(
  p: string,
  i: number,
  s = crypto.getRandomValues(new Uint8Array(16)),
) {
  const k = await crypto.subtle.importKey("raw", e.encode(p), "PBKDF2", false, [
    "deriveBits",
  ]);
  const d = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: s, iterations: i },
    k,
    256,
  );
  return { hash: b64(new Uint8Array(d)), salt: b64(s) };
}
export async function passwordVerify(
  p: string,
  h: string,
  s: string,
  i: number,
) {
  const v = await passwordHash(p, i, ub(s)),
    a = ub(v.hash),
    b = ub(h);
  if (a.length !== b.length) return false;
  let d = 0;
  for (let x = 0; x < a.length; x++) d |= a[x] ^ b[x];
  return d === 0;
}
export async function issueAccess(sub: string, env: CloudflareBindings) {
  const n = Math.floor(Date.now() / 1000),
    ttl = Number(env.ACCESS_TTL);
  return {
    token: await new SignJWT({ type: "access" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(sub)
      .setIssuer("aivo-auth")
      .setAudience("aivo-services")
      .setIssuedAt(n)
      .setExpirationTime(n + ttl)
      .setJti(crypto.randomUUID())
      .sign(e.encode(env.JWT_SECRET)),
    expiresIn: ttl,
  };
}
const google = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
export async function googleIdentity(t: string, env: CloudflareBindings) {
  const { payload } = await jwtVerify(t, google, {
    issuer: ["accounts.google.com", "https://accounts.google.com"],
    audience: env.GOOGLE_CLIENT_IDS.split(","),
  });
  if (!payload.sub) throw Error("Invalid Google token");
  return {
    provider: "google",
    subject: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    avatar: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}
export async function facebookIdentity(t: string, env: CloudflareBindings) {
  const u = new URL("https://graph.facebook.com/debug_token");
  u.searchParams.set("input_token", t);
  u.searchParams.set(
    "access_token",
    `${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}`,
  );
  const d: any = await fetch(u).then((r) => r.json());
  if (!d.data?.is_valid || String(d.data.app_id) !== env.FACEBOOK_APP_ID)
    throw Error("Invalid Facebook token");
  const me = new URL("https://graph.facebook.com/me");
  me.searchParams.set("fields", "id,name,email,picture");
  me.searchParams.set("access_token", t);
  const p: any = await fetch(me).then((r) => r.json());
  return {
    provider: "facebook",
    subject: String(p.id),
    email: p.email,
    name: p.name,
    avatar: p.picture?.data?.url,
  };
}
