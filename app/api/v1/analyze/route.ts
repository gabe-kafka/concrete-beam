// POST /api/v1/analyze — full doubly-reinforced beam analysis.
// One-shot endpoint that structural-terminal calls per member,
// per iteration of the FEA → cracked-section → updated EI loop.

import { NextResponse } from "next/server";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/api/types";
import { validateAnalyze } from "@/lib/api/validate";
import { corsHeaders, jsonError, preflight, readJson } from "@/lib/api/http";
import { analyze } from "@/lib/concrete/analyze";

export const OPTIONS = (req: Request) => preflight(req);

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));
  const r = await readJson(req);
  if ("error" in r) return jsonError(r.error, 400, cors);

  const verr = validateAnalyze(r.body);
  if (verr) return jsonError(verr, 400, cors);

  const body = r.body as AnalyzeRequest;
  const result = analyze({
    section: body.section,
    shear: body.shear,
    demands: body.demands,
  });

  const res: AnalyzeResponse = {
    ok: true,
    geometry: {
      b: result.geometry.b,
      h: result.geometry.h,
      fc: result.geometry.fc,
      fy: result.geometry.fy,
      As_bottom: result.geometry.As_bottom,
      As_top: result.geometry.As_top,
      d_pos: result.geometry.d_pos,
      d_prime_pos: result.geometry.d_prime_pos,
      d_neg: result.geometry.d_neg,
      d_prime_neg: result.geometry.d_prime_neg,
      centroid_bottom: result.geometry.centroid_bottom,
      centroid_top: result.geometry.centroid_top,
    },
    capacity: result.capacity,
    stiffness: result.stiffness,
    checks: result.checks,
    demand_check: result.demand_check,
  };
  return NextResponse.json(res, { headers: cors });
}
