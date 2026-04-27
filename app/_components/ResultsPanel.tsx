"use client";

import type { AnalyzeResult } from "@/lib/concrete/analyze";
import type { OneSidedStiffness } from "@/lib/concrete/stiffness";

function n(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

function levelColor(l: "ok" | "info" | "warn" | "fail"): string {
  switch (l) {
    case "ok":   return "var(--ok)";
    case "warn": return "var(--warn)";
    case "fail": return "var(--err)";
    default:     return "var(--dim)";
  }
}

interface Row { k: string; v: string; dim?: boolean }

function FaceStiffness({ label, face }: { label: string; face: OneSidedStiffness }) {
  const hasMa = Number.isFinite(face.Ma_over_Mcr);
  const tag = !hasMa
    ? { text: "no Ma", color: "var(--dim)" }
    : face.is_cracked
      ? { text: "CRACKED", color: "var(--warn)" }
      : { text: "uncracked", color: "var(--ok)" };
  const pct = Number.isFinite(face.Ie_over_Ig) ? face.Ie_over_Ig * 100 : NaN;
  return (
    <div className="border p-2" style={{ borderColor: "var(--rule)" }}>
      <div className="flex items-baseline justify-between mb-2">
        <span style={{ color: "var(--dim)" }}>{label}</span>
        <span className="uppercase tracking-wider" style={{ color: tag.color, fontSize: "0.7em" }}>{tag.text}</span>
      </div>
      <KvTable rows={[
        { k: "kd", v: `${n(face.kd, 2)} in`, dim: true },
        { k: "Icr", v: `${n(face.Icr, 0)} in⁴`, dim: true },
        { k: "Ie", v: `${n(face.Ie, 0)} in⁴` },
        { k: "Ie / Ig", v: Number.isFinite(pct) ? `${n(pct, 1)} %` : "—" },
        { k: "Ma / Mcr", v: hasMa ? n(face.Ma_over_Mcr, 2) : "—", dim: true },
        { k: "EIeff", v: `${n(face.EIeff_kipin2, 0)} k·in²` },
      ]} />
    </div>
  );
}

function KvTable({ rows }: { rows: Row[] }) {
  return (
    <table className="w-full text-xs">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="py-0.5 pr-3" style={{ color: "var(--dim)" }}>{r.k}</td>
            <td className="py-0.5 text-right tabular-nums" style={{ color: r.dim ? "var(--dim)" : "var(--foreground)" }}>{r.v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ResultsPanel({ result }: { result: AnalyzeResult }) {
  const { capacity, stiffness, geometry, checks, demand_check } = result;
  const pos = capacity.positive;
  const neg = capacity.negative;
  const sh = capacity.shear;

  return (
    <div className="space-y-4 text-xs">
      {/* Geometry summary */}
      <div className="border p-3" style={{ borderColor: "var(--rule)" }}>
        <h3 className="uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>Section</h3>
        <KvTable rows={[
          { k: "As (bottom)", v: `${n(geometry.As_bottom)} in²` },
          { k: "As (top)", v: `${n(geometry.As_top)} in²` },
          { k: "d (positive)", v: `${n(geometry.d_pos)} in` },
          { k: "d′ (positive)", v: `${n(geometry.d_prime_pos)} in` },
          { k: "d (negative)", v: `${n(geometry.d_neg)} in` },
          { k: "d′ (negative)", v: `${n(geometry.d_prime_neg)} in` },
        ]} />
      </div>

      {/* Capacity */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border p-3" style={{ borderColor: "var(--rule)" }}>
          <h3 className="uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>+M (sagging)</h3>
          <KvTable rows={[
            { k: "ΦMn", v: `${n(pos.phiMn_kipft, 1)} k·ft` },
            { k: "Mn",  v: `${n(pos.Mn_kipft, 1)} k·ft`, dim: true },
            { k: "Φ",   v: `${n(pos.phi, 3)}`, dim: true },
            { k: "a",   v: `${n(pos.a, 2)} in`, dim: true },
            { k: "c",   v: `${n(pos.c, 2)} in`, dim: true },
            { k: "ε_t", v: `${n(pos.eps_t, 4)}`, dim: true },
            { k: "class", v: pos.classification, dim: true },
          ]} />
        </div>
        <div className="border p-3" style={{ borderColor: "var(--rule)" }}>
          <h3 className="uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>−M (hogging)</h3>
          <KvTable rows={[
            { k: "ΦMn⁻", v: `${n(neg.phiMn_kipft, 1)} k·ft` },
            { k: "Mn⁻",  v: `${n(neg.Mn_kipft, 1)} k·ft`, dim: true },
            { k: "Φ",   v: `${n(neg.phi, 3)}`, dim: true },
            { k: "a",   v: `${n(neg.a, 2)} in`, dim: true },
            { k: "c",   v: `${n(neg.c, 2)} in`, dim: true },
            { k: "ε_t", v: `${n(neg.eps_t, 4)}`, dim: true },
            { k: "class", v: neg.classification, dim: true },
          ]} />
        </div>
      </div>

      {/* Shear */}
      {sh && (
        <div className="border p-3" style={{ borderColor: "var(--rule)" }}>
          <h3 className="uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>Shear</h3>
          <KvTable rows={[
            { k: "ΦVn", v: `${n(sh.phiVn_kips, 1)} kips` },
            { k: "Vc",  v: `${n(sh.Vc_kips, 1)} kips`, dim: true },
            { k: "Vs",  v: `${n(sh.Vs_kips, 1)} kips`, dim: true },
            { k: "Av",  v: `${n(sh.Av, 3)} in²`, dim: true },
          ]} />
        </div>
      )}

      {/* Stiffness — gross + per-face cracked state per ACI 318-19 §24.2.3.5 */}
      <div className="border p-3" style={{ borderColor: "var(--rule)" }}>
        <h3 className="uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>Stiffness</h3>
        <KvTable rows={[
          { k: "Ec",  v: `${n(stiffness.Ec_ksi, 0)} ksi`, dim: true },
          { k: "Ig",  v: `${n(stiffness.Ig, 0)} in⁴`, dim: true },
          { k: "Mcr", v: `${n(stiffness.Mcr_kipft, 1)} k·ft`, dim: true },
          { k: "⅔·Mcr (cracking onset)", v: `${n((2/3) * stiffness.Mcr_kipft, 1)} k·ft`, dim: true },
        ]} />
        <div className="grid grid-cols-2 gap-3 mt-3">
          <FaceStiffness label="+M (sagging)" face={stiffness.positive} />
          <FaceStiffness label="−M (hogging)" face={stiffness.negative} />
        </div>
      </div>

      {/* Demand checks */}
      {(demand_check.positive.status !== "n/a" ||
        demand_check.negative.status !== "n/a" ||
        demand_check.shear.status !== "n/a") && (
        <div className="border p-3" style={{ borderColor: "var(--rule)" }}>
          <h3 className="uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>Demand check</h3>
          <table className="w-full text-xs">
            <tbody>
              {(["positive", "negative", "shear"] as const).map((face) => {
                const dc = demand_check[face];
                if (dc.status === "n/a") return null;
                const lbl =
                  face === "positive" ? "Mu⁺ / ΦMn⁺" :
                  face === "negative" ? "Mu⁻ / ΦMn⁻" :
                  "Vu / ΦVn";
                const dem =
                  face === "shear" ? `${n(dc.Vu_kips ?? 0, 1)}` : `${n(dc.Mu_kipft ?? 0, 1)}`;
                const cap =
                  face === "shear" ? `${n(dc.phiVn_kips ?? 0, 1)}` : `${n(dc.phiMn_kipft ?? 0, 1)}`;
                return (
                  <tr key={face}>
                    <td className="py-0.5 pr-3" style={{ color: "var(--dim)" }}>{lbl}</td>
                    <td className="py-0.5 text-right tabular-nums">{dem} / {cap}</td>
                    <td className="py-0.5 pl-3 text-right tabular-nums" style={{ color: dc.status === "ok" ? "var(--ok)" : "var(--err)" }}>
                      {n(dc.ratio ?? 0, 2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Code checks */}
      {checks.length > 0 && (
        <div className="border p-3" style={{ borderColor: "var(--rule)" }}>
          <h3 className="uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>Code checks</h3>
          <ul className="space-y-1">
            {checks.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span style={{ color: levelColor(c.level), minWidth: "2.5em" }}>{c.level.toUpperCase()}</span>
                <span style={{ color: "var(--dim)" }}>{c.rule}</span>
                <span className="ml-auto text-right">{c.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
