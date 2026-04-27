// ACI 318 prescriptive checks. These are advisory: the API returns
// every check it ran along with severity, the caller decides whether to
// gate on them.
//
// Severities:
//   info — informational, always passes
//   warn — outside common practice but not a code violation
//   fail — explicit ACI 318 violation

import { type RebarLayer, type SectionGeometry } from "./section";
import { barDiameter, barArea } from "./rebar";
import { ksiToPsi } from "./units";

export type CheckLevel = "ok" | "info" | "warn" | "fail";

export interface CheckResult {
  rule: string;
  level: CheckLevel;
  message: string;
}

export function rhoMin(fc_ksi: number, fy_ksi: number): number {
  const fc_psi = ksiToPsi(fc_ksi);
  const fy_psi = ksiToPsi(fy_ksi);
  return Math.max((3 * Math.sqrt(fc_psi)) / fy_psi, 200 / fy_psi);
}

export function reinforcementChecks(
  geom: SectionGeometry,
  layers: RebarLayer[],
): CheckResult[] {
  const out: CheckResult[] = [];
  const rho_min = rhoMin(geom.fc, geom.fy);

  // ρ_min and ρ_max for bottom (positive moment tension face).
  if (geom.As_bottom > 0 && Number.isFinite(geom.d_pos)) {
    const rho = geom.As_bottom / (geom.b * geom.d_pos);
    out.push({
      rule: "ACI 9.6.1.1 ρ_min (bottom)",
      level: rho >= rho_min ? "ok" : "fail",
      message: `ρ_bot = ${rho.toFixed(4)}, ρ_min = ${rho_min.toFixed(4)}`,
    });
    if (rho > 0.04) {
      out.push({
        rule: "Practical ρ_max (bottom)",
        level: "warn",
        message: `ρ_bot = ${rho.toFixed(4)} > 0.04 — congested or over-reinforced.`,
      });
    }
  } else {
    out.push({
      rule: "Bottom reinforcement",
      level: "warn",
      message: "No bottom reinforcement; positive-moment capacity is zero.",
    });
  }

  // ρ_min on top steel using d_neg (negative moment tension face).
  if (geom.As_top > 0 && Number.isFinite(geom.d_neg)) {
    const rho_top = geom.As_top / (geom.b * geom.d_neg);
    out.push({
      rule: "ACI 9.6.1.1 ρ_min (top, negative moment)",
      level: rho_top >= rho_min ? "ok" : "fail",
      message: `ρ_top = ${rho_top.toFixed(4)}, ρ_min = ${rho_min.toFixed(4)}`,
    });
  } else {
    out.push({
      rule: "Top reinforcement",
      level: "info",
      message: "No top reinforcement; negative-moment capacity is zero.",
    });
  }

  // Cover and spacing checks per ACI 25.2.
  const sideCover = geom.cover.side;
  const bottomCover = geom.cover.bottom;
  const topCover = geom.cover.top;

  for (const layer of layers) {
    if (layer.num_bars <= 0) continue;
    const dBar = barDiameter(layer.bar_size);
    const cover = layer.side === "bottom" ? bottomCover : topCover;
    const minCenter = cover + dBar / 2;
    if (layer.dist < minCenter - 1e-9) {
      out.push({
        rule: `ACI 20.5 cover (${layer.side})`,
        level: "fail",
        message:
          `Layer at ${layer.dist.toFixed(2)} in violates ${cover.toFixed(2)} in clear cover ` +
          `(needs ≥ ${minCenter.toFixed(2)} in to bar center).`,
      });
    }
    if (layer.num_bars > 1) {
      const centerSpacing = (geom.b - 2 * sideCover) / (layer.num_bars - 1);
      const clearH = centerSpacing - dBar;
      const minClearH = Math.max(1.0, dBar);
      if (clearH < minClearH - 1e-9) {
        out.push({
          rule: `ACI 25.2.1 horizontal spacing (${layer.side})`,
          level: "fail",
          message:
            `Clear spacing ${clearH.toFixed(2)} in < ${minClearH.toFixed(2)} in for ` +
            `${layer.num_bars}-${layer.bar_size} bars in ${geom.b.toFixed(1)} in width.`,
        });
      }
    }
  }

  // Vertical clear spacing between layers on the same face.
  const checkVertical = (side: "top" | "bottom"): void => {
    const list = layers
      .filter((l) => l.side === side && l.num_bars > 0)
      .map((l) => ({ y: l.dist, d: barDiameter(l.bar_size) }))
      .sort((a, b) => a.y - b.y);
    for (let i = 0; i + 1 < list.length; i++) {
      const a = list[i];
      const c = list[i + 1];
      const clearV = c.y - a.y - (a.d / 2 + c.d / 2);
      if (clearV < 1.0 - 1e-9) {
        out.push({
          rule: `ACI 25.2.2 vertical spacing (${side})`,
          level: "fail",
          message:
            `Clear vertical spacing ${clearV.toFixed(2)} in between ${side} layers ` +
            `at ${a.y.toFixed(2)} and ${c.y.toFixed(2)} in is < 1.0 in.`,
        });
      }
    }
  };
  checkVertical("top");
  checkVertical("bottom");

  return out;
}

export function totalArea(layers: RebarLayer[], side: "top" | "bottom"): number {
  let A = 0;
  for (const l of layers) {
    if (l.side === side && l.num_bars > 0) A += l.num_bars * barArea(l.bar_size);
  }
  return A;
}
