import type { ErrorCode } from "../types/api.js";

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export const formatError = (err: unknown) => {
  if (err instanceof ApiError) {
    return {
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? {},
      },
    };
  }

  return {
    error: {
      code: "UPSTREAM_ERROR" as ErrorCode,
      message: err instanceof Error ? err.message : "Unexpected error",
      details: {},
    },
  };
};
