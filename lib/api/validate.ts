import { ZodError, type ZodType } from "zod";
import { ApiError } from "@/lib/api/errors";

export function parseBody<T>(schema: ZodType<T>, raw: unknown): T {
  try {
    return schema.parse(raw);
  } catch (error) {
    if (error instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of error.issues) {
        const key = issue.path.join(".") || "_";
        fields[key] = issue.message;
      }
      throw new ApiError("validation_error", "Validation failed", 400, fields);
    }
    throw error;
  }
}
