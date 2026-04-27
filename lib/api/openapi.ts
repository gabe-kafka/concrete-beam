// Single source of truth for the OpenAPI spec — imported by both the
// /api/v1/openapi.json route and the /docs page so the latter doesn't
// have to make a server-side fetch back to itself (host is unknown at
// build time).

const REBAR_ENUM = ["#3", "#4", "#5", "#6", "#7", "#8", "#9", "#10", "#11", "#14", "#18"];

const Section = {
  type: "object",
  required: ["b", "h", "fc", "fy", "layers"],
  properties: {
    b: { type: "number", exclusiveMinimum: 0, description: "Width, in." },
    h: { type: "number", exclusiveMinimum: 0, description: "Height, in." },
    fc: { type: "number", exclusiveMinimum: 0, description: "f'c, ksi." },
    fy: { type: "number", exclusiveMinimum: 0, description: "fy, ksi." },
    layers: {
      type: "array",
      items: {
        type: "object",
        required: ["side", "bar_size", "num_bars", "dist"],
        properties: {
          side: { type: "string", enum: ["top", "bottom"] },
          bar_size: { type: "string", enum: REBAR_ENUM },
          num_bars: { type: "integer", minimum: 0 },
          dist: { type: "number", minimum: 0, description: "Bar centroid offset from face, in." },
        },
      },
    },
    cover: {
      type: "object",
      properties: {
        top: { type: "number", minimum: 0 },
        bottom: { type: "number", minimum: 0 },
        side: { type: "number", minimum: 0 },
      },
    },
  },
};

const Shear = {
  type: "object",
  required: ["bar_size", "num_legs", "spacing"],
  properties: {
    bar_size: { type: "string", enum: REBAR_ENUM },
    num_legs: { type: "integer", minimum: 2 },
    spacing: { type: "number", exclusiveMinimum: 0 },
  },
};

const Demands = {
  type: "object",
  properties: {
    Mu_pos_kipft: { type: "number", minimum: 0 },
    Mu_neg_kipft: { type: "number", minimum: 0 },
    Vu_kips: { type: "number", minimum: 0 },
    Ma_pos_kipft: { type: "number", minimum: 0 },
    Ma_neg_kipft: { type: "number", minimum: 0 },
  },
};

const ErrorSchema = {
  type: "object",
  properties: {
    ok: { const: false },
    error: { type: "string", enum: ["invalid_input", "rate_limited", "internal_error"] },
    message: { type: "string" },
  },
};

function jsonResponse(schema: object, description: string) {
  return {
    description,
    content: { "application/json": { schema } },
  };
}

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "concrete-beam",
    version: "0.2.0",
    description:
      "ACI 318 doubly-reinforced rectangular concrete beam: capacity (ΦMn ±, ΦVn), cracked-section stiffness (Icr ±, Ie ±, EIeff ±), required reinforcement, code checks. Designed to plug into a structural FEA loop.",
  },
  components: {
    schemas: { Section, Shear, Demands, Error: ErrorSchema },
  },
  paths: {
    "/api/v1/analyze": {
      post: {
        summary: "Full doubly-reinforced beam analysis (capacity ± + stiffness ± + checks).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["section"],
                properties: {
                  section: { $ref: "#/components/schemas/Section" },
                  shear: { $ref: "#/components/schemas/Shear" },
                  demands: { $ref: "#/components/schemas/Demands" },
                },
              },
            },
          },
        },
        responses: {
          "200": jsonResponse({ type: "object" }, "Analysis output."),
          "400": jsonResponse(ErrorSchema, "Validation error."),
        },
      },
    },
    "/api/v1/capacity": {
      post: {
        summary: "ΦMn+, ΦMn−, ΦVn for the supplied section.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["section"],
                properties: {
                  section: { $ref: "#/components/schemas/Section" },
                  shear: { $ref: "#/components/schemas/Shear" },
                },
              },
            },
          },
        },
        responses: {
          "200": jsonResponse({ type: "object" }, "Capacity output."),
          "400": jsonResponse(ErrorSchema, "Validation error."),
        },
      },
    },
    "/api/v1/stiffness": {
      post: {
        summary: "Cracked-section properties: Icr ±, Ie ±, EIeff ±.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["section"],
                properties: {
                  section: { $ref: "#/components/schemas/Section" },
                  Ma_pos_kipft: { type: "number", minimum: 0 },
                  Ma_neg_kipft: { type: "number", minimum: 0 },
                },
              },
            },
          },
        },
        responses: {
          "200": jsonResponse({ type: "object" }, "Stiffness output."),
          "400": jsonResponse(ErrorSchema, "Validation error."),
        },
      },
    },
    "/api/v1/design": {
      post: {
        summary: "Required tension (and compression) steel for Mu+ / Mu−.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["b", "h", "fc", "fy", "d_pos"],
                properties: {
                  b: { type: "number", exclusiveMinimum: 0 },
                  h: { type: "number", exclusiveMinimum: 0 },
                  fc: { type: "number", exclusiveMinimum: 0 },
                  fy: { type: "number", exclusiveMinimum: 0 },
                  d_pos: { type: "number", exclusiveMinimum: 0 },
                  d_neg: { type: "number", minimum: 0 },
                  d_prime_pos: { type: "number", minimum: 0 },
                  d_prime_neg: { type: "number", minimum: 0 },
                  Mu_pos_kipft: { type: "number", minimum: 0 },
                  Mu_neg_kipft: { type: "number", minimum: 0 },
                  phi: { type: "number", exclusiveMinimum: 0, maximum: 1, default: 0.9 },
                },
              },
            },
          },
        },
        responses: {
          "200": jsonResponse({ type: "object" }, "Design output."),
          "400": jsonResponse(ErrorSchema, "Validation error."),
        },
      },
    },
    "/api/v1/check": {
      post: {
        summary: "Pass/fail report — same response shape as /analyze.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["section"],
                properties: {
                  section: { $ref: "#/components/schemas/Section" },
                  shear: { $ref: "#/components/schemas/Shear" },
                  demands: { $ref: "#/components/schemas/Demands" },
                },
              },
            },
          },
        },
        responses: {
          "200": jsonResponse({ type: "object" }, "Check output."),
          "400": jsonResponse(ErrorSchema, "Validation error."),
        },
      },
    },
  },
} as const;
