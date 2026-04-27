// Per-resource input validation. Return `null` on success or an
// `ApiError` on failure. Keep validation simple and explicit — the goal
// is to fail fast at the boundary, not to recreate JSON Schema.

import type { ApiError, EchoRequest } from "./types";

export function validateEcho(body: unknown): ApiError | null {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "invalid_input", message: "Body must be a JSON object." };
  }
  const b = body as Partial<EchoRequest>;
  if (typeof b.message !== "string" || b.message.length === 0) {
    return { ok: false, error: "invalid_input", message: "`message` must be a non-empty string." };
  }
  if (b.repeat !== undefined) {
    if (!Number.isInteger(b.repeat) || b.repeat < 1 || b.repeat > 100) {
      return { ok: false, error: "invalid_input", message: "`repeat` must be an integer in [1, 100]." };
    }
  }
  return null;
}
