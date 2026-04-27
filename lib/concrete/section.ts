// Section geometry: turn a list of rebar layers into the scalar
// quantities every downstream module needs (As_top/bot, centroids,
// d/d' for both positive and negative bending).
//
// Coordinate convention (per the Streamlit prototype):
//   - layer.dist for a 'bottom' layer is measured from the BOTTOM face.
//   - layer.dist for a 'top'    layer is measured from the TOP    face.
// Both are positive distances inward.

import { type RebarSize, barArea } from "./rebar";

export interface RebarLayer {
  side: "top" | "bottom";
  bar_size: RebarSize;
  num_bars: number;
  dist: number;
}

export interface Cover {
  top: number;
  bottom: number;
  side: number;
}

export const DEFAULT_COVER: Cover = { top: 1.5, bottom: 1.5, side: 1.5 };

export interface BeamSection {
  b: number;                // width, in
  h: number;                // height, in
  fc: number;               // f'c, ksi
  fy: number;               // fy, ksi
  layers: RebarLayer[];
  cover?: Partial<Cover>;
}

export interface SectionGeometry {
  b: number;
  h: number;
  fc: number;
  fy: number;
  As_bottom: number;        // in² total bottom steel
  As_top: number;           // in² total top steel
  centroid_bottom: number;  // in, from bottom face (NaN if no bottom steel)
  centroid_top: number;     // in, from top face (NaN if no top steel)
  d_pos: number;            // effective depth for + moment (compression at top)
  d_prime_pos: number;      // depth to compression (top) steel from top face
  d_neg: number;            // effective depth for − moment (compression at bottom)
  d_prime_neg: number;      // depth to compression (bottom) steel from bottom face
  cover: Cover;
}

function resolveCover(c?: Partial<Cover>): Cover {
  return { ...DEFAULT_COVER, ...(c ?? {}) };
}

export function computeGeometry(section: BeamSection): SectionGeometry {
  const { b, h, fc, fy, layers } = section;
  const cover = resolveCover(section.cover);

  let As_bottom = 0;
  let sum_As_y_bottom = 0;
  let As_top = 0;
  let sum_As_y_top = 0;

  for (const layer of layers) {
    if (layer.num_bars <= 0) continue;
    const As_group = layer.num_bars * barArea(layer.bar_size);
    if (layer.side === "bottom") {
      As_bottom += As_group;
      sum_As_y_bottom += As_group * layer.dist;
    } else {
      As_top += As_group;
      sum_As_y_top += As_group * layer.dist;
    }
  }

  const centroid_bottom = As_bottom > 0 ? sum_As_y_bottom / As_bottom : NaN;
  const centroid_top = As_top > 0 ? sum_As_y_top / As_top : NaN;

  // Positive moment: top is compressed; tension steel is at the bottom.
  const d_pos = As_bottom > 0 ? h - centroid_bottom : NaN;
  const d_prime_pos = As_top > 0 ? centroid_top : NaN;

  // Negative moment: bottom is compressed; tension steel is at the top.
  const d_neg = As_top > 0 ? h - centroid_top : NaN;
  const d_prime_neg = As_bottom > 0 ? centroid_bottom : NaN;

  return {
    b, h, fc, fy,
    As_bottom, As_top,
    centroid_bottom, centroid_top,
    d_pos, d_prime_pos,
    d_neg, d_prime_neg,
    cover,
  };
}
