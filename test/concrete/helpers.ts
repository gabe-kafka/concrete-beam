// Generic assertion helpers for concrete-beam test cases.
//
// `assertCase` walks the partial `expect` tree on a case, asserting
// each declared leaf against the actual analyze() result. Numeric
// fields use a per-case tolerance; strings/booleans are strict
// equality. Anything not declared in `expect` is ignored.

import assert from "node:assert/strict";
import type { ConcreteCase, NumericExpect } from "./cases";
import type { AnalyzeResult } from "../../lib/concrete/analyze";

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function isNumericExpect(v: unknown): v is NumericExpect {
  return isPlainObject(v) && (
    "value" in v || "min" in v || "max" in v
  );
}

function assertNumericExpect(
  actual: unknown,
  expected: NumericExpect,
  defaultTol: number,
  label: string,
): void {
  if (typeof actual !== "number") {
    throw new Error(`${label}: expected a number, got ${typeof actual} (${actual})`);
  }
  if (expected.value !== undefined) {
    const tol = expected.tol ?? defaultTol;
    const delta = Math.abs(actual - expected.value);
    assert.ok(
      delta <= tol,
      `${label}: expected ${expected.value} (±${tol}), got ${actual}, delta ${delta}`,
    );
  }
  if (expected.min !== undefined) {
    assert.ok(actual >= expected.min, `${label}: expected ≥ ${expected.min}, got ${actual}`);
  }
  if (expected.max !== undefined) {
    assert.ok(actual <= expected.max, `${label}: expected ≤ ${expected.max}, got ${actual}`);
  }
}

function assertSubset(
  actual: unknown,
  expected: unknown,
  defaultTol: number,
  path: string,
): void {
  if (expected === undefined) return;

  // Numeric expectation node — { value?, tol?, min?, max? }
  if (isNumericExpect(expected)) {
    assertNumericExpect(actual, expected, defaultTol, path);
    return;
  }

  // Bare number → treat as { value: n }
  if (typeof expected === "number") {
    assertNumericExpect(actual, { value: expected }, defaultTol, path);
    return;
  }

  // Strict primitives.
  if (
    typeof expected === "string" ||
    typeof expected === "boolean" ||
    expected === null
  ) {
    assert.equal(actual, expected, `${path}: expected ${String(expected)}, got ${String(actual)}`);
    return;
  }

  // Recurse on objects (Partial<T>) — only check keys the test declared.
  if (isPlainObject(expected)) {
    if (!isPlainObject(actual)) {
      throw new Error(`${path}: expected an object, got ${typeof actual}`);
    }
    for (const key of Object.keys(expected)) {
      assertSubset(actual[key], expected[key], defaultTol, `${path}.${key}`);
    }
    return;
  }

  // Arrays: position-by-position.
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) throw new Error(`${path}: expected an array`);
    for (let i = 0; i < expected.length; i++) {
      assertSubset(actual[i], expected[i], defaultTol, `${path}[${i}]`);
    }
    return;
  }

  throw new Error(`${path}: unsupported expectation type ${typeof expected}`);
}

export function assertCase(actual: AnalyzeResult, c: ConcreteCase): void {
  const tol = c.tolerance ?? 0.5;

  // Top-level structural expectations declared via `expect`.
  if (c.expect) assertSubset(actual, c.expect, tol, c.name);

  // Code-check assertions: declare a list of rule fragments + level
  // expected to appear in `result.checks`. Each entry must match at
  // least one check (substring match on `rule`).
  if (c.expectChecks) {
    for (const expectCheck of c.expectChecks) {
      const found = actual.checks.find((ch) =>
        ch.rule.includes(expectCheck.ruleIncludes) &&
        (expectCheck.level === undefined || ch.level === expectCheck.level),
      );
      if (!found) {
        const summary = actual.checks
          .map((c2) => `[${c2.level}] ${c2.rule} — ${c2.message}`)
          .join("\n  ");
        throw new Error(
          `${c.name}: expected a check matching "${expectCheck.ruleIncludes}"` +
          (expectCheck.level ? ` at level "${expectCheck.level}"` : "") +
          `\n  Actual checks:\n  ${summary || "(none)"}`,
        );
      }
    }
  }
}
