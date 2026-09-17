export class ApiError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 405 | 408 | 409 | 413 | 415 | 422 | 429 | 500 | 502 | 503 | 504,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
