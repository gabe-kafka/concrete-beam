// POST /api/v1/capacity — ΦMn+, ΦMn−, ΦVn for the given section.

import { NextResponse } from "next/server";
import type { CapacityRequest, CapacityResponse } from "@/lib/api/types";
import { validateCapacity } from "@/lib/api/validate";
import { corsHeaders, jsonError, preflight, readJson } from "@/lib/api/http";
import { computeGeometry } from "@/lib/concrete/section";
import { computePhiMn } from "@/lib/concrete/flexure";
import { computePhiVn } from "@/lib/concrete/shear";

export const OPTIONS = (req: Request) => preflight(req);

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));
  const r = await readJson(req);
  if ("error" in r) return jsonError(r.error, 400, cors);

  const verr = validateCapacity(r.body);
  if (verr) return jsonError(verr, 400, cors);

  const body = r.body as CapacityRequest;
  const g = computeGeometry(body.section);
  const positive = computePhiMn({
    fc: g.fc, fy: g.fy, b: g.b,
    d: g.d_pos, As: g.As_bottom,
    As_prime: g.As_top, d_prime: g.d_prime_pos || 0,
  });
  const negative = computePhiMn({
    fc: g.fc, fy: g.fy, b: g.b,
    d: g.d_neg, As: g.As_top,
    As_prime: g.As_bottom, d_prime: g.d_prime_neg || 0,
  });

  const dForShear = Number.isFinite(g.d_pos) ? g.d_pos : Number.isFinite(g.d_neg) ? g.d_neg : 0;
  const shear = body.shear && dForShear > 0
    ? computePhiVn({ fc: g.fc, fy: g.fy, b: g.b, d: dForShear, shear: body.shear })
    : null;

  const res: CapacityResponse = { ok: true, positive, negative, shear };
  return NextResponse.json(res, { headers: cors });
}
