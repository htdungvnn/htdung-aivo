# AIVO API Gateway

A pure Cloudflare Workers gateway. This project does not contain user tables, repositories, D1 migrations, or AIVO business logic.

## Gateway responsibilities

- Request ID propagation
- Structured JSON logging with `console`
- Sensitive-field redaction
- Swagger-style Scalar documentation
- OpenAPI document generation
- CORS and security headers
- Optional KV-based baseline rate limiting
- Request proxying to downstream services
- Centralized gateway error handling

## Install

```bash
pnpm install
pnpm cf-typegen
pnpm typecheck
```

If pnpm blocks native dependency build scripts:

```bash
pnpm approve-builds
```

Approve `esbuild` and `workerd`.

## Run

```bash
pnpm dev
```

- Gateway: `http://localhost:8787`
- Health: `http://localhost:8787/api/v1/health`
- Docs: `http://localhost:8787/docs`
- OpenAPI: `http://localhost:8787/openapi.json`

## Proxy convention

```text
/api/v1/auth/*       -> AUTH_SERVICE_URL
/api/v1/profile/*    -> PROFILE_SERVICE_URL
/api/v1/workouts/*   -> WORKOUT_SERVICE_URL
/api/v1/nutrition/*  -> NUTRITION_SERVICE_URL
/api/v1/ai/*         -> AI_SERVICE_URL
/api/v1/billing/*    -> BILLING_SERVICE_URL
```

Example:

```text
POST /api/v1/auth/login -> POST ${AUTH_SERVICE_URL}/login
```

## Logging

The gateway uses structured `console.info`, `console.warn`, and `console.error`. It does not use Pino and does not write files because Workers do not provide persistent local file storage.

Application request/response logs ignore:

```text
/docs
/docs/*
/openapi.json
/favicon.ico
/robots.txt
```

Wrangler can still print its own local access lines. Those are not produced by the gateway logger.

## Optional KV rate limiting

The middleware automatically skips KV rate limiting when `RATE_LIMIT_KV` is not configured. To enable it, create a namespace and add its binding to `wrangler.jsonc`.

## Turborepo workspace

Copy the relevant entries from `pnpm-workspace.example.yaml` into the root `pnpm-workspace.yaml`. Do not place a second workspace file inside the API app when the app already belongs to the root monorepo.
