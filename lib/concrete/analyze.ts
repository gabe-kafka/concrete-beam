// One-shot orchestrator: full doubly-reinforced beam analysis for a
// section under both positive and negative bending plus shear. This is
// the endpoint structural-terminal will hit per member per iteration.

import {
  type BeamSection,
  type RebarLayer,
  computeGeometry,
  type SectionGeometry,
} from "./section";
import { computePhiMn, type FlexureResult } from "./flexure";
import { computePhiVn, type ShearReinf, type ShearResult } from "./shear";
import { computeStiffness, type SectionStiffnessResult } from "./stiffness";
import { reinforcementChecks, type CheckResult } from "./checks";

export interface BeamDemands {
  Mu_pos_kipft?: number;   // factored sagging moment (tension at bottom)
  Mu_neg_kipft?: number;   // factored hogging moment magnitude
  Vu_kips?: number;
  Ma_pos_kipft?: number;   // service moment for stiffness, positive
  Ma_neg_kipft?: number;
}

export interface AnalyzeInput {
  section: BeamSection;
  shear?: ShearReinf;
  demands?: BeamDemands;
}

export interface DemandCheck {
  Mu_kipft?: number;
  phiMn_kipft?: number;
  Vu_kips?: number;
  phiVn_kips?: number;
  ratio?: number;          // demand / capacity
  status: "ok" | "fail" | "n/a";
}

export interface AnalyzeResult {
  geometry: SectionGeometry;
  capacity: {
    positive: FlexureResult;
    negative: FlexureResult;
    shear: ShearResult | null;
  };
  stiffness: SectionStiffnessResult;
  checks: CheckResult[];
  demand_check: {
    positive: DemandCheck;
    negative: DemandCheck;
    shear: DemandCheck;
  };
}

function demandRatio(demand: number | undefined, capacity: number): DemandCheck {
  if (demand === undefined) return { status: "n/a" };
  if (capacity <= 0) return { status: "fail", ratio: Infinity };
  const r = demand / capacity;
  return { ratio: r, status: r <= 1.0 + 1e-6 ? "ok" : "fail" };
}

export function analyze(input: AnalyzeInput): AnalyzeResult {
  const { section } = input;
  const geometry = computeGeometry(section);
  const layers: RebarLayer[] = section.layers;

  // Positive moment: tension at bottom (As = As_bottom), comp at top.
  const positive = computePhiMn({
    fc: geometry.fc, fy: geometry.fy, b: geometry.b,
    d: geometry.d_pos,
    As: geometry.As_bottom,
    As_prime: geometry.As_top,
    d_prime: geometry.d_prime_pos || 0,
  });

  // Negative moment: tension at top (As = As_top), comp at bottom.
  const negative = computePhiMn({
    fc: geometry.fc, fy: geometry.fy, b: geometry.b,
    d: geometry.d_neg,
    As: geometry.As_top,
    As_prime: geometry.As_bottom,
    d_prime: geometry.d_prime_neg || 0,
  });

  // Shear uses the larger d for conservatism (or whichever face is in
  // tension). Per ACI we use d for the active tension face; for the
  // stand-alone /capacity output we just use d_pos when available.
  const dForShear = Number.isFinite(geometry.d_pos)
    ? geometry.d_pos
    : Number.isFinite(geometry.d_neg)
      ? geometry.d_neg
      : 0;

  const shear: ShearResult | null =
    input.shear && dForShear > 0
      ? computePhiVn({
          fc: geometry.fc, fy: geometry.fy,
          b: geometry.b, d: dForShear,
          shear: input.shear,
        })
      : null;

  const stiffness = computeStiffness({
    fc: geometry.fc,
    b: geometry.b, h: geometry.h,
    d_pos: geometry.d_pos,
    d_prime_pos: geometry.d_prime_pos || 0,
    As_pos: geometry.As_bottom,
    As_prime_pos: geometry.As_top,
    d_neg: geometry.d_neg,
    d_prime_neg: geometry.d_prime_neg || 0,
    As_neg: geometry.As_top,
    As_prime_neg: geometry.As_bottom,
    Ma_pos_kipft: input.demands?.Ma_pos_kipft,
    Ma_neg_kipft: input.demands?.Ma_neg_kipft,
  });

  const checks = reinforcementChecks(geometry, layers);

  const dem = input.demands ?? {};
  const demand_check = {
    positive: {
      Mu_kipft: dem.Mu_pos_kipft,
      phiMn_kipft: positive.phiMn_kipft,
      ...demandRatio(dem.Mu_pos_kipft, positive.phiMn_kipft),
    },
    negative: {
      Mu_kipft: dem.Mu_neg_kipft,
      phiMn_kipft: negative.phiMn_kipft,
      ...demandRatio(dem.Mu_neg_kipft, negative.phiMn_kipft),
    },
    shear: shear
      ? {
          Vu_kips: dem.Vu_kips,
          phiVn_kips: shear.phiVn_kips,
          ...demandRatio(dem.Vu_kips, shear.phiVn_kips),
        }
      : { status: "n/a" as const },
  };

  return {
    geometry,
    capacity: { positive, negative, shear },
    stiffness,
    checks,
    demand_check,
  };
}
