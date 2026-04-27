// US imperial rebar designations and nominal diameters, in.
// Matches the Streamlit prototype's table.

export const REBAR_DIAMETERS_IN = {
  "#3": 0.375,
  "#4": 0.5,
  "#5": 0.625,
  "#6": 0.75,
  "#7": 0.875,
  "#8": 1.0,
  "#9": 1.128,
  "#10": 1.27,
  "#11": 1.41,
  "#14": 1.693,
  "#18": 2.257,
} as const;

export type RebarSize = keyof typeof REBAR_DIAMETERS_IN;

export const REBAR_SIZES = Object.keys(REBAR_DIAMETERS_IN) as RebarSize[];

export function isRebarSize(s: string): s is RebarSize {
  return s in REBAR_DIAMETERS_IN;
}

export function barDiameter(size: RebarSize): number {
  return REBAR_DIAMETERS_IN[size];
}

export function barArea(size: RebarSize): number {
  const d = REBAR_DIAMETERS_IN[size];
  return Math.PI * (d / 2) ** 2;
}
