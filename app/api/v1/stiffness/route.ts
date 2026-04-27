// POST /api/v1/stiffness — Ec, Ig, Mcr, Icr ±, Ie ±, EIeff ± for the
// given section under provided service moments. This is the value the
// FEA solver pulls back to update its member stiffness matrix.

import { NextResponse } from "next/server";
import type { StiffnessRequest, StiffnessResponse } from "@/lib/api/types";
import { validateStiffness } from "@/lib/api/validate";
import { corsHeaders, jsonError, preflight, readJson } from "@/lib/api/http";
import { computeGeometry } from "@/lib/concrete/section";
import { computeStiffness } from "@/lib/concrete/stiffness";

export const OPTIONS = (req: Request) => preflight(req);

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));
  const r = await readJson(req);
  if ("error" in r) return jsonError(r.error, 400, cors);

  const verr = validateStiffness(r.body);
  if (verr) return jsonError(verr, 400, cors);

  const body = r.body as StiffnessRequest;
  const g = computeGeometry(body.section);
  const stiffness = computeStiffness({
    fc: g.fc,
    b: g.b, h: g.h,
    d_pos: g.d_pos, d_prime_pos: g.d_prime_pos || 0,
    As_pos: g.As_bottom, As_prime_pos: g.As_top,
    d_neg: g.d_neg, d_prime_neg: g.d_prime_neg || 0,
    As_neg: g.As_top, As_prime_neg: g.As_bottom,
    Ma_pos_kipft: body.Ma_pos_kipft,
    Ma_neg_kipft: body.Ma_neg_kipft,
  });

  const res: StiffnessResponse = { ok: true, ...stiffness };
  return NextResponse.json(res, { headers: cors });
}
