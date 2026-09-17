interface CloudflareBindings {
  APP_NAME: string;
  APP_VERSION: string;
  ENVIRONMENT: string;
  LOG_LEVEL: string;
  ALLOWED_ORIGINS: string;
  AUTH_SERVICE_URL: string;
  PROFILE_SERVICE_URL: string;
  WORKOUT_SERVICE_URL: string;
  NUTRITION_SERVICE_URL: string;
  AI_SERVICE_URL: string;
  BILLING_SERVICE_URL: string;
  RATE_LIMIT_KV?: KVNamespace;
}
