// OpenAPI 3.1 spec served from the API itself, so /docs (or any third
// party) can render it without going through a build step. Update the
// `paths` section as you add or evolve endpoints.

import { NextResponse } from "next/server";

export function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "API Template",
      version: "0.1.0",
      description: "Lean Next.js template — replace echo with your real resource.",
    },
    paths: {
      "/api/v1/echo": {
        post: {
          summary: "Echo a message back N times.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message"],
                  properties: {
                    message: { type: "string", minLength: 1 },
                    repeat: { type: "integer", minimum: 1, maximum: 100, default: 1 },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Echoed messages.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { const: true },
                      echoes: { type: "array", items: { type: "string" } },
                      receivedAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Validation error.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { const: false },
                      error: { type: "string" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
  return NextResponse.json(spec);
}
