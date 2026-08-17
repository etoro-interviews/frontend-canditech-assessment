"use client";

type ApiSuccess<T> = { data: T };
type ApiErrorBody = {
  error: { code: string; message: string; fields?: Record<string, string> };
};

export class ApiClientError extends Error {
  code: string;
  fields?: Record<string, string>;

  constructor(code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.fields = fields;
  }
}

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  let json: ApiSuccess<T> | ApiErrorBody;
  try {
    json = (await res.json()) as ApiSuccess<T> | ApiErrorBody;
  } catch {
    throw new ApiClientError("bad_request", "Invalid response");
  }

  if (!res.ok || "error" in json) {
    const err =
      "error" in json
        ? json.error
        : { code: "bad_request", message: "Request failed" };
    throw new ApiClientError(err.code, err.message, err.fields);
  }
  return json.data;
}

export function errorCode(err: unknown): string {
  if (err instanceof ApiClientError) return err.code;
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === "string") return code;
  }
  return "bad_request";
}

export function errorKey(code: string) {
  const known = [
    "unauthorized",
    "forbidden",
    "not_found",
    "validation_error",
    "conflict",
    "bad_request",
  ];
  return known.includes(code) ? `errors.${code}` : "errors.generic";
}
