// POST /api/v1/design — required reinforcement for given Mu+ / Mu−.
// Returns face-by-face sizing: tension As, plus As' if doubly-reinforced
// is required to keep the section tension-controlled.

import { NextResponse } from "next/server";
import type { DesignFaceWire, DesignRequest, DesignResponse } from "@/lib/api/types";
import { validateDesign } from "@/lib/api/validate";
import { corsHeaders, jsonError, preflight, readJson } from "@/lib/api/http";
import { designFace } from "@/lib/concrete/designer";

export const OPTIONS = (req: Request) => preflight(req);

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));
  const r = await readJson(req);
  if ("error" in r) return jsonError(r.error, 400, cors);

  const verr = validateDesign(r.body);
  if (verr) return jsonError(verr, 400, cors);

  const body = r.body as DesignRequest;
  const phi = body.phi;

  let positive: DesignFaceWire | undefined;
  let negative: DesignFaceWire | undefined;

  if (body.Mu_pos_kipft !== undefined && body.Mu_pos_kipft >= 0) {
    positive = designFace({
      Mu_kipft: body.Mu_pos_kipft,
      fc: body.fc, fy: body.fy,
      b: body.b, d: body.d_pos,
      d_prime: body.d_prime_pos,
      phi,
    });
  }
  if (body.Mu_neg_kipft !== undefined && body.Mu_neg_kipft >= 0) {
    const d_neg = body.d_neg ?? body.d_pos;
    negative = designFace({
      Mu_kipft: body.Mu_neg_kipft,
      fc: body.fc, fy: body.fy,
      b: body.b, d: d_neg,
      d_prime: body.d_prime_neg,
      phi,
    });
  }

  const res: DesignResponse = { ok: true, positive, negative };
  return NextResponse.json(res, { headers: cors });
}
