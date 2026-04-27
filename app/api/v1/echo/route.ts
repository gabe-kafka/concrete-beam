// Replace this entire file with your real endpoint. The structure to
// keep:
//
//   - corsHeaders / OPTIONS handler so any localhost dev port plus your
//     production hostname (NEXT_PUBLIC_APP_HOSTNAME) can call it.
//   - POST handler: parse JSON → validate → run domain logic → return
//     `SuccessResponse | ApiError` with consistent `ok` discriminant.

import { NextResponse } from "next/server";
import type { ApiError, EchoRequest, EchoResponse } from "@/lib/api/types";
import { validateEcho } from "@/lib/api/validate";

const PROD_HOSTNAME = process.env.NEXT_PUBLIC_APP_HOSTNAME ?? "";

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return true;
    if (PROD_HOSTNAME && u.hostname === PROD_HOSTNAME) return true;
    return false;
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = isAllowedOrigin(origin) ? origin! : "http://localhost:3000";
  return {
    "Access-Control-Allow-Origin": allow,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(
      { ok: false, error: "invalid_input", message: "Body must be valid JSON." },
      400,
      cors,
    );
  }

  const v = validateEcho(body);
  if (v) return jsonError(v, 400, cors);

  const { message, repeat = 1 } = body as EchoRequest;
  const echoes = Array.from({ length: repeat }, () => message);

  const res: EchoResponse = {
    ok: true,
    echoes,
    receivedAt: new Date().toISOString(),
  };
  return NextResponse.json(res, { headers: cors });
}

function jsonError(err: ApiError, status: number, cors: Record<string, string>) {
  return NextResponse.json(err, { status, headers: cors });
}
