// Golden ACI 318 hand-calculations exercised through the same
// `analyze()` entry point the API uses.
//
// Each case declares a partial `expect` tree against the AnalyzeResult
// shape; only fields it declares are checked (everything else is
// allowed to drift). Numeric expectations may be:
//   • a bare number — checked with the case-level `tolerance`
//   • { value, tol } — per-field tolerance override
//   • { min, max }  — interval check (no exact value)
//
// Add new cases by appending to `concreteCases`. Run with `npm test`.

import type { AnalyzeInput } from "../../lib/concrete/analyze";

export interface NumericExpect {
  value?: number;
  tol?: number;
  min?: number;
  max?: number;
}

export interface ConcreteCase {
  name: string;
  input: AnalyzeInput;
  /** Default tolerance for numeric expectations declared as bare numbers. */
  tolerance?: number;
  /** Partial tree against AnalyzeResult; only declared keys are checked. */
  expect?: Record<string, unknown>;
  /** Code-check assertions: rule substring + optional severity level. */
  expectChecks?: { ruleIncludes: string; level?: "ok" | "info" | "warn" | "fail" }[];
}

// Reusable section for the asymmetric-doubly-reinforced case (matches
// the app's default 36×62 with 4 layers of 12-#11 bottom + 2 layers of
// 12-#11 top). Numbers verified by hand against ΦMn = 16,636 k·ft (+M)
// and ΦMn⁻ = 8,881 k·ft (−M).
const HEAVY_36x62_DOUBLY: AnalyzeInput["section"] = {
  b: 36, h: 62, fc: 5, fy: 60,
  layers: [
    { side: "bottom", bar_size: "#11", num_bars: 12, dist: 2.5 },
    { side: "bottom", bar_size: "#11", num_bars: 12, dist: 5.5 },
    { side: "bottom", bar_size: "#11", num_bars: 12, dist: 8.5 },
    { side: "bottom", bar_size: "#11", num_bars: 12, dist: 11.5 },
    { side: "top",    bar_size: "#11", num_bars: 12, dist: 2.5 },
    { side: "top",    bar_size: "#11", num_bars: 12, dist: 5.5 },
  ],
};

// Singly-reinforced 12×24 with 3-#8 at d=21 (cover 3 in to bar center).
// Used by the Bischoff Ie sweep cases below.
const SINGLY_12x24: AnalyzeInput["section"] = {
  b: 12, h: 24, fc: 4, fy: 60,
  layers: [{ side: "bottom", bar_size: "#8", num_bars: 3, dist: 3 }],
};

export const concreteCases: ConcreteCase[] = [
  // ── 1. Geometry — verifies the section parser ───────────────────────
  {
    name: "Geometry: 36x62 doubly-reinforced totals",
    input: { section: HEAVY_36x62_DOUBLY },
    tolerance: 0.05,
    expect: {
      geometry: {
        As_bottom: 74.95,         // 48·1.561
        As_top: 37.47,
        d_pos: 55,                // h − 7
        d_prime_pos: 4,
        d_neg: 58,
        d_prime_neg: 7,
      },
    },
  },

  // ── 2. Doubly-reinforced ΦMn (positive moment) ──────────────────────
  // Hand calc: a = (As−As')·fy/(0.85·f'c·b) = 14.70 in, c = 18.37 in,
  // εt = 0.00598 → tension-controlled, ΦMn = 16,636 k·ft.
  {
    name: "Capacity: 36x62 doubly-reinforced — +M tension-controlled",
    input: { section: HEAVY_36x62_DOUBLY },
    tolerance: 5,    // kip-ft
    expect: {
      capacity: {
        positive: {
          ok: true,
          phiMn_kipft: 16636,
          phi: { value: 0.9, tol: 0.001 },
          classification: "tension-controlled",
          a: { value: 14.70, tol: 0.05 },
          c: { value: 18.37, tol: 0.05 },
          fs_prime: { value: 60, tol: 0.5 },   // As' yields
        },
      },
    },
  },

  // ── 3. ΦMn⁻ on the same section — As(top) << As'(bottom).
  // The "both yield" linear branch fails (a_assume < 0); the
  // strain-compatibility quadratic gives c = 8.58 in, As' below yield
  // (f's = 16.0 ksi), εt = 0.0173 → tension-controlled, ΦMn⁻ = 8,881.
  {
    name: "Capacity: 36x62 doubly-reinforced — −M with As < As' (quadratic branch)",
    input: { section: HEAVY_36x62_DOUBLY },
    tolerance: 5,
    expect: {
      capacity: {
        negative: {
          ok: true,
          phiMn_kipft: 8881,
          phi: { value: 0.9, tol: 0.001 },
          classification: "tension-controlled",
          a: { value: 6.86, tol: 0.05 },
          c: { value: 8.58, tol: 0.05 },
          fs_prime: { value: 16.0, tol: 0.2 },  // does NOT yield
        },
      },
    },
  },

  // ── 4. Singly-reinforced ΦMn (textbook example) ─────────────────────
  // 12×24, f'c=4, fy=60, As=3-#8, d=21.
  // a = 2.356·60/(0.85·4·12) = 3.464 in, c = 4.075 in (β1=0.85),
  // εt = 0.003·(21−4.075)/4.075 = 0.01246 → TC, φ=0.9.
  // Mn = 0.85·4·12·3.464·(21 − 1.732) = 2722 k·in = 226.9 k·ft → ΦMn = 204.2.
  {
    name: "Capacity: 12x24 singly-reinforced — textbook ΦMn",
    input: { section: SINGLY_12x24 },
    tolerance: 1,
    expect: {
      capacity: {
        positive: {
          ok: true,
          phiMn_kipft: 204.2,
          phi: { value: 0.9, tol: 0.001 },
          classification: "tension-controlled",
          a: { value: 3.46, tol: 0.05 },
          c: { value: 4.07, tol: 0.05 },
          fs_prime: 0,        // no compression steel
        },
      },
    },
  },

  // ── 5. Stiffness baseline — Mcr & Icr for 12x24 singly ──────────────
  // Ec = 57000·√4000 = 3605 ksi, fr = 7.5·√4000 = 474.3 psi = 0.4743 ksi.
  // Ig = 12·24³/12 = 13,824 in⁴, yt = 12, Mcr = 546 k·in = 45.5 k·ft.
  // Cracked NA: 6c² + 18.94c − 397.7 = 0 → c = 6.71 in.
  // Icr = 12·6.71³/3 + 8.04·2.356·14.29² = 5074 in⁴.
  {
    name: "Stiffness: 12x24 singly — Ig, Mcr, Icr",
    input: { section: SINGLY_12x24 },
    tolerance: 50,
    expect: {
      stiffness: {
        Ig: 13824,
        Mcr_kipft: { value: 45.5, tol: 0.2 },
        Ec_ksi: { value: 3605, tol: 5 },
        positive: {
          kd: { value: 6.71, tol: 0.05 },
          Icr: { value: 5074, tol: 10 },
        },
      },
    },
  },

  // ── 6. Bischoff Ie — uncracked branch (Ma ≤ ⅔·Mcr) ────────────────
  {
    name: "Stiffness: Bischoff Ie — uncracked at Ma = 25 k·ft",
    input: { section: SINGLY_12x24, demands: { Ma_pos_kipft: 25 } },
    tolerance: 1,
    expect: {
      stiffness: {
        positive: {
          is_cracked: false,
          Ie: { value: 13824, tol: 1 },        // = Ig
          Ie_over_Ig: { value: 1.0, tol: 0.001 },
        },
      },
    },
  },

  // ── 7. Bischoff Ie — just past the cracking threshold ─────────────
  // Ma = 31 k·ft ≈ 1.02·(⅔Mcr=30.4). Ie should drop sharply but still
  // close to Ig.
  {
    name: "Stiffness: Bischoff Ie — transition at Ma = 31 k·ft",
    input: { section: SINGLY_12x24, demands: { Ma_pos_kipft: 31 } },
    tolerance: 100,
    expect: {
      stiffness: {
        positive: {
          is_cracked: true,
          Ie: { value: 12912, tol: 100 },
          Ie_over_Ig: { min: 0.85, max: 0.95 },
        },
      },
    },
  },

  // ── 8. Bischoff Ie — well-cracked ─────────────────────────────────
  // Ma = 150 k·ft → r = 30.4/150 = 0.2027, r² = 0.041,
  // denom = 1 − 0.041·0.6326 = 0.974, Ie = 5079/0.974 = 5215.
  {
    name: "Stiffness: Bischoff Ie — well-cracked at Ma = 150 k·ft",
    input: { section: SINGLY_12x24, demands: { Ma_pos_kipft: 150 } },
    tolerance: 25,
    expect: {
      stiffness: {
        positive: {
          is_cracked: true,
          Ie: { value: 5215, tol: 25 },
          Ie_over_Ig: { min: 0.36, max: 0.40 },
        },
      },
    },
  },

  // ── 9. Bischoff Ie — asymptote to Icr at very large Ma ────────────
  {
    name: "Stiffness: Bischoff Ie — asymptote at Ma = 1e6 k·ft",
    input: { section: SINGLY_12x24, demands: { Ma_pos_kipft: 1_000_000 } },
    tolerance: 5,
    expect: {
      stiffness: {
        positive: {
          is_cracked: true,
          Ie: { value: 5079, tol: 5 },     // = Icr
          Ie_over_Ig: { min: 0.367, max: 0.368 },
        },
      },
    },
  },

  // ── 10. Demand check — flexure FAILS for an under-sized beam ──────
  // 12×24 singly with ΦMn ≈ 204 k·ft, demand Mu = 500 k·ft → fail.
  {
    name: "Demand: 12x24 singly fails ΦMn vs Mu = 500 k·ft",
    input: {
      section: SINGLY_12x24,
      demands: { Mu_pos_kipft: 500 },
    },
    expect: {
      demand_check: {
        positive: {
          status: "fail",
          ratio: { min: 2.4, max: 2.5 },
        },
      },
    },
  },

  // ── 11. Shear capacity — ΦVn for 12×24 with #4 stirrups @ 12 in ──
  // Vc = 2·1·√4000·12·21 / 1000 = 31.87 kip
  // Av = 2·0.196 = 0.393 in², Vs = 0.393·60·21/12 = 41.21 kip
  // ΦVn = 0.75·(31.87+41.21) = 54.8 kip
  {
    name: "Shear: 12x24 ΦVn with #4 @ 12 in",
    input: {
      section: SINGLY_12x24,
      shear: { bar_size: "#4", num_legs: 2, spacing: 12 },
    },
    tolerance: 0.5,
    expect: {
      capacity: {
        shear: {
          phi: { value: 0.75, tol: 0.001 },
          phiVn_kips: { value: 54.8, tol: 0.5 },
          Vc_kips: { value: 31.87, tol: 0.3 },
        },
      },
    },
  },

  // ── 12. Code-check FAIL — bar inside cover ────────────────────────
  // Move the bottom bar to dist = 0.5 in (≪ 1.5 cover + 0.5 = 2.0).
  {
    name: "Checks: bar fails ACI 20.5 cover",
    input: {
      section: {
        b: 12, h: 24, fc: 4, fy: 60,
        layers: [{ side: "bottom", bar_size: "#8", num_bars: 3, dist: 0.5 }],
      },
    },
    expectChecks: [{ ruleIncludes: "ACI 20.5 cover", level: "fail" }],
  },

  // ── 13. Code-check FAIL — ρ_min trip on a tiny As ─────────────────
  // 12×24 with a single #3 bar (As=0.11 in²) → ρ ≈ 0.0004, well below ρ_min ≈ 0.0033.
  {
    name: "Checks: ρ_min fail with under-reinforced section",
    input: {
      section: {
        b: 12, h: 24, fc: 4, fy: 60,
        layers: [{ side: "bottom", bar_size: "#3", num_bars: 1, dist: 3 }],
      },
    },
    expectChecks: [{ ruleIncludes: "ρ_min (bottom)", level: "fail" }],
  },

  // ── 14. Negative moment with NO top steel returns invalid ─────────
  {
    name: "Capacity: −M is invalid when there is no top steel",
    input: {
      section: {
        b: 12, h: 24, fc: 4, fy: 60,
        layers: [{ side: "bottom", bar_size: "#8", num_bars: 3, dist: 3 }],
      },
    },
    expect: {
      capacity: {
        negative: {
          ok: false,
          classification: "invalid",
          phiMn_kipft: { value: 0, tol: 0.01 },
        },
      },
    },
  },
];
