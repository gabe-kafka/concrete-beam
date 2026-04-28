// Test runner for the concrete-beam math kernel. Pattern lifted from
// statics/test/solver/solver.test.ts: iterate a flat array of cases,
// call analyze(), and assert on the structured expectations declared
// in each case. Run with `npm test`.

import { test } from "node:test";
import { analyze } from "../../lib/concrete/analyze";
import { concreteCases } from "./cases";
import { assertCase } from "./helpers";

for (const c of concreteCases) {
  test(c.name, () => {
    assertCase(analyze(c.input), c);
  });
}
