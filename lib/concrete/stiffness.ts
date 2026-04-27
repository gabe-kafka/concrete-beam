// Cracked-section and effective stiffness for service-load deflection.
// Closes the FEA → cracked-section → updated EI loop described in the
// repo README. Math follows ACI 318-19. f'c, fy in ksi; lengths in in.
//
// Doubly-reinforced cracked-section neutral axis (transformed area):
//   b·c²/2 + (n−1)·As'·(c − d') = n·As·(d − c)
// → quadratic in c.
//
// Icr (about NA): b·c³/3 + (n−1)·As'·(c − d')² + n·As·(d − c)²
// Ig:  b·h³/12          (gross, ignoring steel)
// fr:  7.5·λ·√f'c_psi   psi  (ACI 318-19 19.2.3.1)
// Mcr: fr · Ig / yt     lb-in
//
// Effective moment of inertia (ACI 318-19 §24.2.3.5, Bischoff form):
//   Ma ≤ (2/3)·Mcr  → Ie = Ig
//   Ma > (2/3)·Mcr  → Ie = Icr / [1 − ((2/3)·Mcr/Ma)² · (1 − Icr/Ig)]
//
// At the threshold the two branches meet (Ie = Ig); for Ma → ∞,
// Ie → Icr. This replaces the older Branson form (ACI 318-14).

import { LAMBDA_NORMAL, ksiToPsi, kipinToKipft } from "./units";

export interface CrackedInput {
  b: number;         // in
  d: number;         // in
  d_prime: number;   // in (0 ok if no compression steel)
  As: number;        // in² tension
  As_prime: number;  // in² compression
  Ec_ksi: number;    // computed once per section
  Es_ksi: number;
}

export interface CrackedResult {
  kd: number;        // in, cracked NA from compression face
  Icr: number;       // in⁴
}

export function crackedNA(input: CrackedInput): CrackedResult {
  const { b, d, d_prime, As, As_prime, Ec_ksi, Es_ksi } = input;
  if (As <= 0 || d <= 0) return { kd: NaN, Icr: NaN };

  const n = Es_ksi / Ec_ksi;
  const useCompSteel = As_prime > 0 && d_prime > 0;

  // (b/2)·c² + [(n−1)As' + n·As]·c − [(n−1)As'·d' + n·As·d] = 0
  const A = b / 2;
  const B = (useCompSteel ? (n - 1) * As_prime : 0) + n * As;
  const C = -((useCompSteel ? (n - 1) * As_prime * d_prime : 0) + n * As * d);
  const disc = B * B - 4 * A * C;
  if (disc < 0) return { kd: NaN, Icr: NaN };
  const c = (-B + Math.sqrt(disc)) / (2 * A);

  const Icr =
    (b * c ** 3) / 3 +
    (useCompSteel ? (n - 1) * As_prime * (c - d_prime) ** 2 : 0) +
    n * As * (d - c) ** 2;

  return { kd: c, Icr };
}

export interface SectionStiffnessInput {
  fc: number;        // ksi
  b: number;
  h: number;
  // Positive-moment side
  d_pos: number;
  d_prime_pos: number;
  As_pos: number;       // bottom steel
  As_prime_pos: number; // top steel
  // Negative-moment side
  d_neg: number;
  d_prime_neg: number;
  As_neg: number;       // top steel
  As_prime_neg: number; // bottom steel
  // Service moments (kip-ft, magnitudes). Either may be 0/undefined.
  Ma_pos_kipft?: number;
  Ma_neg_kipft?: number;
}

export interface OneSidedStiffness {
  kd: number;
  Icr: number;
  Ie: number;
  EIeff_kipin2: number;
  /** true when Ma > (2/3)·Mcr (the section has cracked). */
  is_cracked: boolean;
  /** Ma / Mcr (NaN if Ma not provided). */
  Ma_over_Mcr: number;
  /** Ie / Ig — fraction of gross stiffness retained. */
  Ie_over_Ig: number;
}

export interface SectionStiffnessResult {
  Ec_ksi: number;
  Ig: number;            // in⁴
  yt: number;            // in (h/2 — gross, symmetric)
  fr_ksi: number;
  Mcr_kipft: number;
  positive: OneSidedStiffness;
  negative: OneSidedStiffness;
}

const E_S_KSI_CONST = 29_000;

export function sectionEcKsi(fc_ksi: number): number {
  // Ec = 57000·√f'c_psi (psi) per ACI 19.2.2.1, normal-weight.
  const fc_psi = ksiToPsi(fc_ksi);
  return (57_000 * Math.sqrt(fc_psi)) / 1000;
}

export function sectionFrKsi(fc_ksi: number): number {
  // fr = 7.5·λ·√f'c_psi (psi)
  const fc_psi = ksiToPsi(fc_ksi);
  return (7.5 * LAMBDA_NORMAL * Math.sqrt(fc_psi)) / 1000;
}

export function computeStiffness(input: SectionStiffnessInput): SectionStiffnessResult {
  const Ec_ksi = sectionEcKsi(input.fc);
  const fr_ksi = sectionFrKsi(input.fc);
  const Ig = (input.b * input.h ** 3) / 12;
  const yt = input.h / 2;
  const Mcr_kipin = (fr_ksi * Ig) / yt; // ksi · in³ / in = kip·in
  const Mcr_kipft = kipinToKipft(Mcr_kipin);

  // ACI 318-19 §24.2.3.5b (Bischoff). Section cracks when Ma > (2/3)·Mcr.
  const Mcr_eff = (2 / 3) * Mcr_kipft;
  const oneSide = (
    d: number,
    d_prime: number,
    As: number,
    As_prime: number,
    Ma_kipft: number | undefined,
  ): OneSidedStiffness => {
    const cr = crackedNA({
      b: input.b, d, d_prime,
      As, As_prime,
      Ec_ksi, Es_ksi: E_S_KSI_CONST,
    });
    const haveMa = Ma_kipft !== undefined && Ma_kipft > 0;
    const is_cracked = haveMa && Number.isFinite(cr.Icr) && Ma_kipft! > Mcr_eff;

    let Ie: number;
    if (!Number.isFinite(cr.Icr)) {
      Ie = Ig;
    } else if (!is_cracked) {
      Ie = Ig;
    } else {
      const r = Mcr_eff / Ma_kipft!;
      const denom = 1 - r * r * (1 - cr.Icr / Ig);
      // For the normal regime (Icr < Ig), denom ∈ (Icr/Ig, 1] and
      // Ie ∈ [Icr, Ig]. For very heavily reinforced sections where
      // Icr > Ig, Bischoff is out of its calibrated range — cap at Ig.
      Ie = denom > 0 ? cr.Icr / denom : cr.Icr;
      if (Ie > Ig) Ie = Ig;
    }
    return {
      kd: cr.kd,
      Icr: cr.Icr,
      Ie,
      EIeff_kipin2: Ec_ksi * Ie,
      is_cracked,
      Ma_over_Mcr: haveMa ? Ma_kipft! / Mcr_kipft : NaN,
      Ie_over_Ig: Ig > 0 ? Ie / Ig : NaN,
    };
  };

  return {
    Ec_ksi, Ig, yt, fr_ksi, Mcr_kipft,
    positive: oneSide(
      input.d_pos, input.d_prime_pos,
      input.As_pos, input.As_prime_pos,
      input.Ma_pos_kipft,
    ),
    negative: oneSide(
      input.d_neg, input.d_prime_neg,
      input.As_neg, input.As_prime_neg,
      input.Ma_neg_kipft,
    ),
  };
}
