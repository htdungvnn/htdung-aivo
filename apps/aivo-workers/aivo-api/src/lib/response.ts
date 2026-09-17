export function success<T>(data: T, requestId: string) {
  return { success: true as const, data, requestId };
}

export function failure(
  code: string,
  message: string,
  requestId: string,
  details?: unknown,
) {
  return {
    success: false as const,
    error: {
      code,
      message,
      requestId,
      ...(details === undefined ? {} : { details }),
    },
  };
}
