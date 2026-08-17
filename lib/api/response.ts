import { NextResponse } from "next/server";
import { ApiError, type ErrorCode } from "@/lib/api/errors";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function fail(
  code: ErrorCode,
  message: string,
  status: number,
  fields?: Record<string, string>,
) {
  return NextResponse.json(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    { status },
  );
}

export function fromError(error: unknown) {
  if (error instanceof ApiError) {
    return fail(error.code, error.message, error.status, error.fields);
  }
  console.error(error);
  return fail("bad_request", "Unexpected error", 500);
}
