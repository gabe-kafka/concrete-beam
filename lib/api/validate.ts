// Input validation for every concrete-beam endpoint. Fails fast at the
// boundary; trusts internal callers. Each validator returns null on
// success or an ApiError on failure.

import type {
  AnalyzeRequest,
  ApiError,
  CapacityRequest,
  CheckRequest,
  DesignRequest,
  StiffnessRequest,
  WireRebarLayer,
  WireSection,
  WireShear,
} from "./types";
import { isRebarSize } from "@/lib/concrete/rebar";

const fail = (message: string): ApiError => ({
  ok: false,
  error: "invalid_input",
  message,
});

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateSection(section: unknown): ApiError | null {
  if (typeof section !== "object" || section === null) {
    return fail("`section` must be an object.");
  }
  const s = section as Partial<WireSection>;
  for (const key of ["b", "h", "fc", "fy"] as const) {
    const v = s[key];
    if (!isFiniteNumber(v) || v <= 0) {
      return fail(`\`section.${key}\` must be a finite number > 0.`);
    }
  }
  if (!Array.isArray(s.layers)) return fail("`section.layers` must be an array.");
  for (let i = 0; i < s.layers.length; i++) {
    const layer = s.layers[i] as Partial<WireRebarLayer>;
    if (!layer || (layer.side !== "top" && layer.side !== "bottom")) {
      return fail(`\`section.layers[${i}].side\` must be "top" or "bottom".`);
    }
    if (typeof layer.bar_size !== "string" || !isRebarSize(layer.bar_size)) {
      return fail(`\`section.layers[${i}].bar_size\` must be a known rebar size (#3..#18).`);
    }
    if (!isFiniteNumber(layer.num_bars) || layer.num_bars < 0 || !Number.isInteger(layer.num_bars)) {
      return fail(`\`section.layers[${i}].num_bars\` must be a non-negative integer.`);
    }
    if (!isFiniteNumber(layer.dist) || layer.dist < 0) {
      return fail(`\`section.layers[${i}].dist\` must be a finite number ≥ 0.`);
    }
    // Bar must fit inside the section.
    if (layer.dist > (s.h ?? Infinity)) {
      return fail(`\`section.layers[${i}].dist\` (${layer.dist}) exceeds section height ${s.h}.`);
    }
  }
  if (s.cover !== undefined) {
    if (typeof s.cover !== "object" || s.cover === null) return fail("`section.cover` must be an object.");
    for (const key of ["top", "bottom", "side"] as const) {
      const v = s.cover[key];
      if (v !== undefined && (!isFiniteNumber(v) || v < 0)) {
        return fail(`\`section.cover.${key}\` must be a finite number ≥ 0.`);
      }
    }
  }
  return null;
}

function validateShear(shear: unknown): ApiError | null {
  if (shear === undefined) return null;
  if (typeof shear !== "object" || shear === null) return fail("`shear` must be an object.");
  const s = shear as Partial<WireShear>;
  if (typeof s.bar_size !== "string" || !isRebarSize(s.bar_size)) {
    return fail("`shear.bar_size` must be a known rebar size.");
  }
  if (!isFiniteNumber(s.num_legs) || s.num_legs < 2 || !Number.isInteger(s.num_legs)) {
    return fail("`shear.num_legs` must be an integer ≥ 2.");
  }
  if (!isFiniteNumber(s.spacing) || s.spacing <= 0) {
    return fail("`shear.spacing` must be a finite number > 0.");
  }
  return null;
}

function validateDemandsOptional(d: unknown): ApiError | null {
  if (d === undefined) return null;
  if (typeof d !== "object" || d === null) return fail("`demands` must be an object.");
  const obj = d as Record<string, unknown>;
  for (const key of [
    "Mu_pos_kipft", "Mu_neg_kipft", "Vu_kips",
    "Ma_pos_kipft", "Ma_neg_kipft",
  ]) {
    const v = obj[key];
    if (v !== undefined && (!isFiniteNumber(v) || v < 0)) {
      return fail(`\`demands.${key}\` must be a finite number ≥ 0.`);
    }
  }
  return null;
}

export function validateAnalyze(body: unknown): ApiError | null {
  if (typeof body !== "object" || body === null) return fail("Body must be a JSON object.");
  const b = body as Partial<AnalyzeRequest>;
  return (
    validateSection(b.section) ||
    validateShear(b.shear) ||
    validateDemandsOptional(b.demands)
  );
}

export function validateCapacity(body: unknown): ApiError | null {
  if (typeof body !== "object" || body === null) return fail("Body must be a JSON object.");
  const b = body as Partial<CapacityRequest>;
  return validateSection(b.section) || validateShear(b.shear);
}

export function validateStiffness(body: unknown): ApiError | null {
  if (typeof body !== "object" || body === null) return fail("Body must be a JSON object.");
  const b = body as Partial<StiffnessRequest>;
  const sect = validateSection(b.section);
  if (sect) return sect;
  for (const key of ["Ma_pos_kipft", "Ma_neg_kipft"] as const) {
    const v = b[key];
    if (v !== undefined && (!isFiniteNumber(v) || v < 0)) {
      return fail(`\`${key}\` must be a finite number ≥ 0.`);
    }
  }
  return null;
}

export function validateDesign(body: unknown): ApiError | null {
  if (typeof body !== "object" || body === null) return fail("Body must be a JSON object.");
  const b = body as Partial<DesignRequest>;
  for (const key of ["b", "h", "fc", "fy", "d_pos"] as const) {
    const v = b[key];
    if (!isFiniteNumber(v) || v <= 0) {
      return fail(`\`${key}\` must be a finite number > 0.`);
    }
  }
  for (const key of ["d_neg", "d_prime_pos", "d_prime_neg"] as const) {
    const v = b[key];
    if (v !== undefined && (!isFiniteNumber(v) || v < 0)) {
      return fail(`\`${key}\` must be a finite number ≥ 0.`);
    }
  }
  for (const key of ["Mu_pos_kipft", "Mu_neg_kipft"] as const) {
    const v = b[key];
    if (v !== undefined && (!isFiniteNumber(v) || v < 0)) {
      return fail(`\`${key}\` must be a finite number ≥ 0.`);
    }
  }
  if (b.Mu_pos_kipft === undefined && b.Mu_neg_kipft === undefined) {
    return fail("Provide at least one of `Mu_pos_kipft` or `Mu_neg_kipft`.");
  }
  if (b.phi !== undefined && (!isFiniteNumber(b.phi) || b.phi <= 0 || b.phi > 1)) {
    return fail("`phi` must be a finite number in (0, 1].");
  }
  return null;
}

export function validateCheck(body: unknown): ApiError | null {
  if (typeof body !== "object" || body === null) return fail("Body must be a JSON object.");
  const b = body as Partial<CheckRequest>;
  return (
    validateSection(b.section) ||
    validateShear(b.shear) ||
    validateDemandsOptional(b.demands)
  );
}
