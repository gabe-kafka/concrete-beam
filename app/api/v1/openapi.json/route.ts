// OpenAPI 3.1 spec — delegates to lib/api/openapi.ts so the /docs page
// can import the same object instead of fetching it back over HTTP.

import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/api/openapi";

export function GET() {
  return NextResponse.json(openApiSpec);
}
