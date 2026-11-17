import { DrizzleQueryError } from "drizzle-orm";
import { DatabaseError } from "pg";
function errorKind(error: unknown): string {
  if (error instanceof DrizzleQueryError) return "DrizzleQueryError";
  if (error instanceof DatabaseError) return "DatabaseError";
  if (error instanceof TypeError) return "TypeError";
  if (error instanceof RangeError) return "RangeError";
  return error instanceof Error ? "Error" : "UnknownError";
}
export function safeError(error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined;
  // The first stack line contains the error message and may include SQL or values.
  // Keep only V8 frames with a source location, never the message, query or parameters.
  const frames =
    error instanceof Error
      ? (error.stack ?? "")
          .split("\n")
          .filter((line) =>
            /^\s+at (?:async )?(?:(?:[^()\n]+) \()?((?:file:\/\/|\/|node:)[^\n]+:\d+:\d+)\)?$/.test(
              line,
            ),
          )
          .slice(0, 8)
      : [];
  const databaseError =
    error instanceof DatabaseError ? error : cause instanceof DatabaseError ? cause : undefined;
  return {
    name: errorKind(error),
    frames,
    ...(databaseError && /^[A-Z0-9]{5}$/.test(databaseError.code ?? "")
      ? { code: databaseError.code, causeName: "DatabaseError" }
      : {}),
  };
}
