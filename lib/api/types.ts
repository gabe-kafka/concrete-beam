// Wire types for the concrete-beam API.
//
// Public unit conventions on the wire:
//   length  : in
//   stress  : ksi (f'c, fy)
//   moment  : kip-ft  (suffix _kipft)
//   shear   : kip     (suffix _kips)
//
// Every endpoint returns either a typed success body with `ok: true`
// or `{ ok: false, error, message }`. Clients branch on `ok`.

import type { RebarSize } from "@/lib/concrete/rebar";
import type { CheckResult } from "@/lib/concrete/checks";
import type { FlexureResult } from "@/lib/concrete/flexure";
import type { ShearResult } from "@/lib/concrete/shear";
import type { SectionStiffnessResult } from "@/lib/concrete/stiffness";

export interface WireRebarLayer {
  side: "top" | "bottom";
  bar_size: RebarSize;
  num_bars: number;
  /** Distance from the layer's reference face (top for 'top', bottom for 'bottom') to the bar centroid, in. */
  dist: number;
}

export interface WireCover {
  top?: number;
  bottom?: number;
  side?: number;
}

export interface WireSection {
  /** Width, in. */
  b: number;
  /** Total height, in. */
  h: number;
  /** Concrete strength, ksi. */
  fc: number;
  /** Steel yield strength, ksi. */
  fy: number;
  layers: WireRebarLayer[];
  cover?: WireCover;
}

export interface WireShear {
  bar_size: RebarSize;
  num_legs: number;
  /** Stirrup spacing s, in. */
  spacing: number;
}

export interface WireDemands {
  /** Factored sagging moment (tension at bottom), kip-ft. */
  Mu_pos_kipft?: number;
  /** Factored hogging moment magnitude (tension at top), kip-ft. */
  Mu_neg_kipft?: number;
  /** Factored shear, kips. */
  Vu_kips?: number;
  /** Service moment for stiffness, positive face, kip-ft. */
  Ma_pos_kipft?: number;
  /** Service moment for stiffness, negative face, kip-ft. */
  Ma_neg_kipft?: number;
}

// ── /analyze ────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  section: WireSection;
  shear?: WireShear;
  demands?: WireDemands;
}

export interface AnalyzeResponse {
  ok: true;
  geometry: {
    b: number; h: number; fc: number; fy: number;
    As_bottom: number;
    As_top: number;
    d_pos: number;
    d_prime_pos: number;
    d_neg: number;
    d_prime_neg: number;
    centroid_bottom: number;
    centroid_top: number;
  };
  capacity: {
    positive: FlexureResult;
    negative: FlexureResult;
    shear: ShearResult | null;
  };
  stiffness: SectionStiffnessResult;
  checks: CheckResult[];
  demand_check: {
    positive: { Mu_kipft?: number; phiMn_kipft?: number; ratio?: number; status: "ok" | "fail" | "n/a" };
    negative: { Mu_kipft?: number; phiMn_kipft?: number; ratio?: number; status: "ok" | "fail" | "n/a" };
    shear:    { Vu_kips?: number;  phiVn_kips?: number;  ratio?: number; status: "ok" | "fail" | "n/a" };
  };
}

// ── /capacity ───────────────────────────────────────────────────────

export interface CapacityRequest {
  section: WireSection;
  shear?: WireShear;
}

export interface CapacityResponse {
  ok: true;
  positive: FlexureResult;
  negative: FlexureResult;
  shear: ShearResult | null;
}

// ── /stiffness ──────────────────────────────────────────────────────

export interface StiffnessRequest {
  section: WireSection;
  Ma_pos_kipft?: number;
  Ma_neg_kipft?: number;
}

export type StiffnessResponse = { ok: true } & SectionStiffnessResult;

// ── /design ─────────────────────────────────────────────────────────

export interface DesignRequest {
  /** Beam section *geometry only* — layers may be empty if you just want sizing. */
  b: number;
  h: number;
  fc: number;
  fy: number;
  d_pos: number;
  d_neg?: number;
  d_prime_pos?: number;
  d_prime_neg?: number;
  Mu_pos_kipft?: number;
  Mu_neg_kipft?: number;
  phi?: number;
}

export interface DesignFaceWire {
  status: "ok" | "below_min" | "needs_compression_steel" | "needs_doubly_reinforced" | "infeasible";
  As_req_in2: number;
  As_prime_req_in2: number;
  rho: number;
  rho_min: number;
  rho_max_tc: number;
  a_in: number;
  Mn_kipft: number;
  phiMn_kipft: number;
}

export interface DesignResponse {
  ok: true;
  positive?: DesignFaceWire;
  negative?: DesignFaceWire;
}

// ── /check ──────────────────────────────────────────────────────────

export interface CheckRequest {
  section: WireSection;
  shear?: WireShear;
  demands?: WireDemands;
}

export type CheckResponse = AnalyzeResponse;

// ── error ───────────────────────────────────────────────────────────

export type ApiErrorCode = "invalid_input" | "rate_limited" | "internal_error";

export interface ApiError {
  ok: false;
  error: ApiErrorCode;
  message: string;
  details?: unknown;
}
