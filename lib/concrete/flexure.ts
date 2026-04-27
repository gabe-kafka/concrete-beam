// Doubly-reinforced rectangular flexural strength per ACI 318.
//
// Whitney stress block: a = β1·c, fc' compressive stress = 0.85 f'c.
// Procedure (matches the Streamlit prototype, generalized):
//   1. Assume compression steel yields, solve linear force balance for a.
//   2. Recover c = a/β1, check ε's = εcu·(c − d')/c against εy = fy/Es.
//   3. If compression steel does NOT yield, solve the quadratic in c
//      with f's = Es·ε's < fy.
//   4. Compute εt at tension layer; pick φ from ACI 318 21.2.2.
//   5. Mn = 0.85 f'c b a (d − a/2) + As' f's (d − d').
//
// The same kernel is called twice in analyze() — once with the +moment
// roles (tension at bottom) and once with −moment roles (tension at
// top), giving ΦMn+ and ΦMn− for the same physical section.

import { E_S_KSI, EPS_CU, kipinToKipft } from "./units";
import { beta1FromFc } from "./beta1";

export type FlexureClass =
  | "tension-controlled"
  | "transition"
  | "compression-controlled"
  | "invalid";

export interface FlexureInput {
  fc: number;     // ksi
  fy: number;     // ksi
  b: number;      // in
  d: number;      // in, depth to tension steel from comp face
  As: number;     // in², tension steel
  As_prime: number;  // in², compression steel (0 = singly reinforced)
  d_prime: number;   // in, depth to compression steel from comp face
}

export interface FlexureResult {
  ok: boolean;
  beta1: number;
  a: number;        // in, equivalent stress block depth
  c: number;        // in, neutral axis depth
  fs_prime: number; // ksi, stress in compression steel (≤ fy)
  eps_t: number;    // strain at extreme tension steel
  phi: number;      // strength reduction factor
  classification: FlexureClass;
  Mn_kipft: number; // nominal moment (no φ)
  phiMn_kipft: number;
  warnings: string[];
}

function classify(eps_t: number, fy_ksi: number): { phi: number; cls: FlexureClass } {
  if (eps_t <= 0) return { phi: 0, cls: "invalid" };
  // ACI 318-19 21.2.2: tension-controlled limit ε_ty + 0.003.
  // For Grade-60 steel ε_ty ≈ 0.00207; the 0.005 / 0.002 limits below
  // match the Streamlit prototype and remain valid for fy ≤ 80 ksi.
  const eps_y = fy_ksi / E_S_KSI;
  if (eps_t >= 0.005) return { phi: 0.9, cls: "tension-controlled" };
  if (eps_t >= eps_y) {
    // Linear interpolation between 0.65 and 0.9.
    const phi = 0.65 + (eps_t - eps_y) * (0.25 / (0.005 - eps_y));
    return { phi, cls: "transition" };
  }
  return { phi: 0.65, cls: "compression-controlled" };
}

export function computePhiMn(input: FlexureInput): FlexureResult {
  const { fc, fy, b, d, As, As_prime, d_prime } = input;
  const beta1 = beta1FromFc(fc);
  const warnings: string[] = [];

  // No tension steel → no flexural capacity.
  if (As <= 0 || d <= 0) {
    return {
      ok: false, beta1, a: 0, c: 0, fs_prime: 0, eps_t: 0, phi: 0,
      classification: "invalid",
      Mn_kipft: 0, phiMn_kipft: 0,
      warnings: ["No tension reinforcement on this face."],
    };
  }

  let a: number;
  let c: number;
  let fs_prime: number;

  if (As_prime <= 0 || d_prime <= 0) {
    // Singly-reinforced.
    a = (As * fy) / (0.85 * fc * b);
    c = a / beta1;
    fs_prime = 0;
  } else {
    // Step 1: assume As' yields. If a_assume comes out negative, it
    // means the equilibrium can't be satisfied with both steels at fy
    // — the quadratic branch below handles it (As' is actually below
    // yield because the NA is shallow, e.g. negative-moment hogging on
    // a section with As(tens) << As'(comp)).
    const a_assume = ((As - As_prime) * fy) / (0.85 * fc * b);
    const c_assume = a_assume > 0 ? a_assume / beta1 : -1;
    const eps_y = fy / E_S_KSI;
    const eps_s_prime_assume =
      c_assume > d_prime ? EPS_CU * (c_assume - d_prime) / c_assume : 0;

    if (eps_s_prime_assume >= eps_y) {
      a = a_assume;
      c = c_assume;
      fs_prime = fy;
    } else {
      // Compression steel does not yield. Force balance:
      //   0.85 f'c b · β1 · c + As' · Es · εcu · (c − d')/c = As · fy
      // → 0.85 f'c b β1 · c² + (As' Es εcu − As fy) · c − As' Es εcu d' = 0
      const A = 0.85 * fc * b * beta1;
      const B = As_prime * E_S_KSI * EPS_CU - As * fy;
      const C = -As_prime * E_S_KSI * EPS_CU * d_prime;
      const disc = B * B - 4 * A * C;
      if (disc < 0) {
        return {
          ok: false, beta1, a: 0, c: 0, fs_prime: 0, eps_t: 0, phi: 0,
          classification: "invalid",
          Mn_kipft: 0, phiMn_kipft: 0,
          warnings: ["No real solution to strain-compatibility equation."],
        };
      }
      c = (-B + Math.sqrt(disc)) / (2 * A);
      a = beta1 * c;
      const eps_s_prime = EPS_CU * (c - d_prime) / c;
      fs_prime = E_S_KSI * eps_s_prime;
      // Cap at fy in case of round-off near the boundary.
      if (fs_prime > fy) fs_prime = fy;
      if (fs_prime < 0) fs_prime = 0;  // compression steel above NA — ignore
    }
  }

  const eps_t = c < d ? EPS_CU * (d - c) / c : 0;
  const { phi, cls } = classify(eps_t, fy);

  if (cls === "transition") {
    warnings.push("Section is in the transition zone (not fully tension-controlled).");
  } else if (cls === "compression-controlled") {
    warnings.push("Section is compression-controlled.");
  } else if (cls === "invalid") {
    warnings.push("Invalid strain distribution at the assumed neutral axis.");
  }

  const C_conc = 0.85 * fc * b * a;            // kip
  const C_steel = As_prime > 0 ? As_prime * fs_prime : 0; // kip
  const Mn_kipin = C_conc * (d - a / 2) + C_steel * (d - d_prime || 0);
  const Mn_kipft = kipinToKipft(Mn_kipin);
  const phiMn_kipft = phi * Mn_kipft;

  return {
    ok: cls !== "invalid",
    beta1, a, c, fs_prime,
    eps_t, phi, classification: cls,
    Mn_kipft, phiMn_kipft,
    warnings,
  };
}
