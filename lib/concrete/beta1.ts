// β1 — depth ratio of the equivalent rectangular stress block.
// ACI 318 Table 22.2.2.4.3, f'c in ksi.

export function beta1FromFc(fc_ksi: number): number {
  if (fc_ksi <= 4) return 0.85;
  if (fc_ksi >= 8) return 0.65;
  return 0.85 - 0.05 * (fc_ksi - 4);
}
