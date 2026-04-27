// Shear capacity per ACI 318. Uses the simplified Vc (no axial load,
// no detailed ρw factor) — matches the Streamlit prototype.

import { LAMBDA_NORMAL, PHI_SHEAR, ksiToPsi } from "./units";
import { type RebarSize, barArea } from "./rebar";

export interface ShearReinf {
  bar_size: RebarSize;
  num_legs: number;
  spacing: number;   // s, in
}

export interface ShearInput {
  fc: number;        // ksi
  fy: number;        // ksi (transverse)
  b: number;         // bw, in
  d: number;         // depth to tension steel from comp face, in
  shear: ShearReinf;
}

export interface ShearResult {
  phi: number;
  Vc_kips: number;
  Vs_kips: number;
  Vn_kips: number;
  phiVn_kips: number;
  Av: number;        // in², total area of stirrup legs at one section
  warnings: string[];
}

export function computePhiVn(input: ShearInput): ShearResult {
  const { fc, fy, b, d, shear } = input;
  const fc_psi = ksiToPsi(fc);
  const fy_psi = ksiToPsi(fy);
  const Av = shear.num_legs * barArea(shear.bar_size);
  const warnings: string[] = [];

  // Vc = 2λ·√(f'c)·b·d, lb → kip
  const Vc_kips = (2 * LAMBDA_NORMAL * Math.sqrt(fc_psi) * b * d) / 1000;

  // Vs = Av·fy·d / s
  let Vs_kips = shear.spacing > 0
    ? (Av * fy_psi * d) / shear.spacing / 1000
    : 0;

  // Vs cap: 8·√f'c·b·d (ACI 22.5.1.2)
  const Vs_max_kips = (8 * Math.sqrt(fc_psi) * b * d) / 1000;
  if (Vs_kips > Vs_max_kips) {
    warnings.push(
      `Vs exceeds maximum allowed (${Vs_max_kips.toFixed(1)} kips); capped.`,
    );
    Vs_kips = Vs_max_kips;
  }

  const Vn_kips = Vc_kips + Vs_kips;
  const phi = PHI_SHEAR;
  const phiVn_kips = phi * Vn_kips;

  return { phi, Vc_kips, Vs_kips, Vn_kips, phiVn_kips, Av, warnings };
}
