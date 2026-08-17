export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "conflict"
  | "bad_request";

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function unauthorized(message = "Unauthorized") {
  return new ApiError("unauthorized", message, 401);
}

export function forbidden(message = "Forbidden") {
  return new ApiError("forbidden", message, 403);
}

export function notFound(message = "Not found") {
  return new ApiError("not_found", message, 404);
}

export function conflict(message = "Conflict") {
  return new ApiError("conflict", message, 409);
}

export function badRequest(message: string) {
  return new ApiError("bad_request", message, 400);
}
