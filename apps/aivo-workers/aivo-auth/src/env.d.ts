interface CloudflareBindings {
  DB: D1Database;
  EMAIL_QUEUE: Queue<import("@aivo/auth-contracts").MailMessage>;
  APP_ORIGIN: string;
  GOOGLE_CLIENT_IDS: string;
  FACEBOOK_APP_ID: string;
  FACEBOOK_APP_SECRET: string;
  JWT_SECRET: string;
  ACCESS_TTL: string;
  REFRESH_TTL: string;
  ACTION_TTL: string;
  PASSWORD_ITERATIONS: string;
}
