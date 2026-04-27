// Required-steel sizing. Used both for the standalone /design endpoint
// and as part of the structural-terminal closure: given Mu+ and Mu− on
// each face, return As_top and As_bottom that make ΦMn ≥ Mu on both
// sides. Uses the singly-reinforced closed form first; if Mu exceeds
// the tension-controlled limit, falls back to a doubly-reinforced fix
// that adds compression steel to bring εt back into the tension-
// controlled zone.

import { E_S_KSI, EPS_CU, kipftToKipin } from "./units";
import { beta1FromFc } from "./beta1";
import { rhoMin } from "./checks";

export interface DesignFaceInput {
  Mu_kipft: number;   // demand on this face (magnitude, tension on this face)
  fc: number;         // ksi
  fy: number;         // ksi
  b: number;          // in
  d: number;          // in
  d_prime?: number;   // in, depth to compression steel from compression face
  phi?: number;       // default 0.9 (tension-controlled target)
}

export type DesignStatus =
  | "ok"
  | "below_min"
  | "needs_compression_steel"
  | "needs_doubly_reinforced"
  | "infeasible";

export interface DesignFaceResult {
  status: DesignStatus;
  As_req_in2: number;
  As_prime_req_in2: number;  // 0 unless doubly-reinforced is needed
  rho: number;
  rho_min: number;
  rho_max_tc: number;        // ρ at εt = 0.005 (singly-reinforced TC limit)
  a_in: number;
  Mn_kipft: number;
  phiMn_kipft: number;
}

export function designFace(input: DesignFaceInput): DesignFaceResult {
  const { Mu_kipft, fc, fy, b, d } = input;
  const phi = input.phi ?? 0.9;
  const d_prime = input.d_prime ?? 0;
  const beta1 = beta1FromFc(fc);

  const Mu_kipin = kipftToKipin(Mu_kipft);
  const m = 0.85 * fc;
  const Rn = Mu_kipin / (phi * b * d * d);   // ksi (kip-in / in³)
  const rho_minimum = rhoMin(fc, fy);

  // Tension-controlled max ρ (εt = 0.005, εcu = 0.003 → c/d = 3/8)
  const rho_max_tc = (0.85 * beta1 * fc * EPS_CU) / (fy * (EPS_CU + 0.005));

  const radicand = 1 - (2 * Rn) / m;
  let status: DesignStatus;
  let rho_demand: number;
  let As_prime_req = 0;

  if (radicand < 0 || rho_demand_overflow(Rn, m, fy, rho_max_tc)) {
    // Singly-reinforced limit exceeded → doubly-reinforced fix.
    if (d_prime <= 0) {
      // Caller wanted singly-reinforced; flag and return the TC-limit
      // amount of tension steel. Section is undersized.
      status = "needs_compression_steel";
      rho_demand = rho_max_tc;
    } else {
      // Step 1: compute As1 using ρ_max,TC and resulting Mn1.
      const As1 = rho_max_tc * b * d;
      const a1 = (As1 * fy) / (m * b);
      const Mn1_kipin = As1 * fy * (d - a1 / 2);

      // Step 2: residual moment carried by the steel couple.
      const Mu_residual_kipin = Mu_kipin / phi - Mn1_kipin;
      if (Mu_residual_kipin <= 0 || d - d_prime <= 0) {
        status = "ok";
        rho_demand = rho_max_tc;
      } else {
        const fs_prime = fy; // assume yields; verified after the fact
        As_prime_req = Mu_residual_kipin / (fs_prime * (d - d_prime));
        const As_req_total = As1 + As_prime_req * (fs_prime / fy);
        rho_demand = As_req_total / (b * d);

        // Sanity: ε's at the TC-limit c (εt = 0.005 → c = 3d/8).
        const c_tc = (3 / 8) * d;
        const eps_s_prime = EPS_CU * (c_tc - d_prime) / c_tc;
        const eps_y = fy / E_S_KSI;
        if (eps_s_prime < eps_y) {
          // Compression steel doesn't yield at the TC limit; the
          // closed-form As' is non-conservative. Inflate to keep φ=0.9.
          As_prime_req = (Mu_residual_kipin / (E_S_KSI * eps_s_prime * (d - d_prime)));
        }

        status = "needs_doubly_reinforced";
      }
    }
  } else {
    rho_demand = (m / fy) * (1 - Math.sqrt(radicand));
    if (rho_demand < rho_minimum) {
      status = "below_min";
    } else if (rho_demand > rho_max_tc) {
      status = "needs_compression_steel";
    } else {
      status = "ok";
    }
  }

  const rho = Math.max(rho_demand, rho_minimum);
  const As_req_in2 = rho * b * d;

  // Recompute capacity at the chosen As (and As' if any).
  const a_in = ((As_req_in2 - As_prime_req) * fy) / (m * b);
  const Mn_kipin =
    m * b * a_in * (d - a_in / 2) + As_prime_req * fy * (d - d_prime);
  const Mn_kipft = Mn_kipin / 12;
  const phiMn_kipft = phi * Mn_kipft;

  return {
    status,
    As_req_in2,
    As_prime_req_in2: As_prime_req,
    rho,
    rho_min: rho_minimum,
    rho_max_tc,
    a_in,
    Mn_kipft,
    phiMn_kipft,
  };
}

// Helper: did the closed-form ρ exceed the TC limit even though the
// radicand was non-negative? (Catches the case where Rn approaches the
// singly-reinforced limit but doesn't quite cross it.)
function rho_demand_overflow(Rn: number, m: number, fy: number, rho_max_tc: number): boolean {
  const rho = (m / fy) * (1 - Math.sqrt(Math.max(0, 1 - (2 * Rn) / m)));
  return rho > rho_max_tc;
}
