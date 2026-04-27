// Wire types for /api/v1/<resource>. Kept separate from any internal
// domain types so the public contract can evolve independently.
//
// Replace `EchoRequest` / `EchoResponse` with the shapes for your
// resource. Keep the `ApiError` shape — every endpoint should return
// `{ ok: false, error, message }` on failure so clients can branch on
// `error` cleanly.

export type EchoRequest = {
  message: string;
  repeat?: number;
};

export type EchoResponse = {
  ok: true;
  echoes: string[];
  receivedAt: string;
};

export type ApiErrorCode = "invalid_input" | "rate_limited" | "internal_error";

export type ApiError = {
  ok: false;
  error: ApiErrorCode;
  message: string;
  details?: unknown;
};
