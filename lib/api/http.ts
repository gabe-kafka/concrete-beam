// CORS / response helpers shared by every /api/v1/* route.

import { NextResponse } from "next/server";
import type { ApiError } from "./types";

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

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = isAllowedOrigin(origin) ? origin! : "http://localhost:3000";
  return {
    "Access-Control-Allow-Origin": allow,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function readJson(req: Request): Promise<{ body: unknown } | { error: ApiError }> {
  try {
    const body = await req.json();
    return { body };
  } catch {
    return {
      error: { ok: false, error: "invalid_input", message: "Body must be valid JSON." },
    };
  }
}

export function jsonError(err: ApiError, status: number, cors: Record<string, string>) {
  return NextResponse.json(err, { status, headers: cors });
}

export function preflight(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}
