"use client";

import { useMemo, useState } from "react";
import { REBAR_SIZES, type RebarSize } from "@/lib/concrete/rebar";
import type { RebarLayer } from "@/lib/concrete/section";
import { analyze } from "@/lib/concrete/analyze";
import Header from "./_components/Header";
import BeamSvg from "./_components/BeamSvg";
import ResultsPanel from "./_components/ResultsPanel";
import {
  CheckboxField,
  IntField,
  NumberField,
  Section,
  SelectField,
} from "./_components/fields";

interface FaceConfig {
  bar_size: RebarSize;
  num_bars: number;
  multi_layers: boolean;
  num_layers: number;
  spacing: number;
  start_dist: number;
}

const DEFAULT_BOTTOM: FaceConfig = {
  bar_size: "#11", num_bars: 12,
  multi_layers: true, num_layers: 4, spacing: 3.0, start_dist: 2.5,
};
const DEFAULT_TOP: FaceConfig = {
  bar_size: "#11", num_bars: 12,
  multi_layers: true, num_layers: 2, spacing: 3.0, start_dist: 2.5,
};

function expandLayers(side: "top" | "bottom", c: FaceConfig): RebarLayer[] {
  if (c.num_bars <= 0) return [];
  const n = c.multi_layers ? Math.max(1, c.num_layers) : 1;
  const s = c.multi_layers ? c.spacing : 0;
  return Array.from({ length: n }, (_, i) => ({
    side, bar_size: c.bar_size, num_bars: c.num_bars,
    dist: c.start_dist + i * s,
  }));
}

function validateInputs({
  b,
  h,
  fc,
  fy,
  topCover,
  bottomCover,
  sideCover,
  bot,
  top,
  stirrupLegs,
  stirrupSpacing,
  layers,
}: {
  b: number;
  h: number;
  fc: number;
  fy: number;
  topCover: number;
  bottomCover: number;
  sideCover: number;
  bot: FaceConfig;
  top: FaceConfig;
  stirrupLegs: number;
  stirrupSpacing: number;
  layers: RebarLayer[];
}): string[] {
  const errors: string[] = [];

  if (!(b > 0)) errors.push("Section width b must be greater than 0 in.");
  if (!(h > 0)) errors.push("Section height h must be greater than 0 in.");
  if (!(fc > 0)) errors.push("Concrete strength f'c must be greater than 0 ksi.");
  if (!(fy > 0)) errors.push("Steel yield strength fy must be greater than 0 ksi.");
  if (bottomCover < 0 || topCover < 0 || sideCover < 0) {
    errors.push("Clear cover values cannot be negative.");
  }
  if (b > 0 && sideCover >= b / 2) {
    errors.push("Side cover leaves no horizontal space for reinforcement.");
  }

  const faceChecks = [
    ["Bottom", bot] as const,
    ["Top", top] as const,
  ];
  for (const [label, face] of faceChecks) {
    if (face.num_bars < 0) errors.push(`${label} bars per layer cannot be negative.`);
    if (face.multi_layers && face.num_layers < 1) errors.push(`${label} layer count must be at least 1.`);
    if (face.multi_layers && face.spacing <= 0) errors.push(`${label} layer spacing must be greater than 0 in.`);
    if (face.start_dist < 0) errors.push(`${label} first bar distance cannot be negative.`);
  }

  if (stirrupLegs < 2) errors.push("Stirrups must have at least 2 legs.");
  if (stirrupSpacing <= 0) errors.push("Stirrup spacing must be greater than 0 in.");

  if (h > 0) {
    for (const layer of layers) {
      const y = layer.side === "bottom" ? layer.dist : h - layer.dist;
      if (y < 0 || y > h) {
        errors.push(`${layer.side === "bottom" ? "Bottom" : "Top"} layer at ${layer.dist} in is outside the section height.`);
      }
    }
  }

  return errors;
}

export default function Home() {
  // Section
  const [b, setB] = useState(36);
  const [h, setH] = useState(62);
  const [fc, setFc] = useState(5);
  const [fy, setFy] = useState(60);
  // Cover
  const [topCover, setTopCover] = useState(1.5);
  const [bottomCover, setBottomCover] = useState(1.5);
  const [sideCover, setSideCover] = useState(1.5);
  // Reinf
  const [bot, setBot] = useState<FaceConfig>(DEFAULT_BOTTOM);
  const [top, setTop] = useState<FaceConfig>(DEFAULT_TOP);
  // Stirrups
  const [stirrupSize, setStirrupSize] = useState<RebarSize>("#4");
  const [stirrupLegs, setStirrupLegs] = useState(2);
  const [stirrupSpacing, setStirrupSpacing] = useState(12.0);
  // Demands
  const [muPos, setMuPos] = useState(0);
  const [muNeg, setMuNeg] = useState(0);
  const [vu, setVu] = useState(0);
  const [maPos, setMaPos] = useState(0);
  const [maNeg, setMaNeg] = useState(0);

  const layers = useMemo(
    () => [...expandLayers("bottom", bot), ...expandLayers("top", top)],
    [bot, top],
  );

  const analyzeInput = useMemo(() => ({
    section: {
      b, h, fc, fy,
      layers,
      cover: { top: topCover, bottom: bottomCover, side: sideCover },
    },
    shear: {
      bar_size: stirrupSize,
      num_legs: stirrupLegs,
      spacing: stirrupSpacing,
    },
    demands: {
      Mu_pos_kipft: muPos > 0 ? muPos : undefined,
      Mu_neg_kipft: muNeg > 0 ? muNeg : undefined,
      Vu_kips: vu > 0 ? vu : undefined,
      Ma_pos_kipft: maPos > 0 ? maPos : undefined,
      Ma_neg_kipft: maNeg > 0 ? maNeg : undefined,
    },
  }), [b, h, fc, fy, layers, topCover, bottomCover, sideCover,
       stirrupSize, stirrupLegs, stirrupSpacing,
       muPos, muNeg, vu, maPos, maNeg]);

  const inputErrors = useMemo(
    () => validateInputs({
      b,
      h,
      fc,
      fy,
      topCover,
      bottomCover,
      sideCover,
      bot,
      top,
      stirrupLegs,
      stirrupSpacing,
      layers,
    }),
    [b, h, fc, fy, topCover, bottomCover, sideCover, bot, top, stirrupLegs, stirrupSpacing, layers],
  );

  const analysis = useMemo(() => {
    if (inputErrors.length > 0) return { result: null, error: null };
    try {
      return { result: analyze(analyzeInput), error: null };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : "Analysis failed for the current input.",
      };
    }
  }, [analyzeInput, inputErrors]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header apiPath="POST /api/v1/analyze" apiState="live" />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Inputs */}
        <aside
          className="border-r p-4 space-y-3 overflow-y-auto"
          style={{ borderColor: "var(--rule)", maxHeight: "calc(100vh - 33px)" }}
        >
          <Section title="Section">
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="b" units="in" value={b} onChange={setB} />
              <NumberField label="h" units="in" value={h} onChange={setH} />
              <NumberField label="f'c" units="ksi" value={fc} onChange={setFc} />
              <NumberField label="fy" units="ksi" value={fy} onChange={setFy} step={5} />
            </div>
          </Section>

          <Section title="Cover (clear)">
            <div className="grid grid-cols-3 gap-2">
              <NumberField label="bottom" units="in" value={bottomCover} onChange={setBottomCover} step={0.25} />
              <NumberField label="top" units="in" value={topCover} onChange={setTopCover} step={0.25} />
              <NumberField label="side" units="in" value={sideCover} onChange={setSideCover} step={0.25} />
            </div>
          </Section>

          <Section title="Bottom reinforcement">
            <div className="grid grid-cols-2 gap-2">
              <SelectField label="bar size" options={REBAR_SIZES} value={bot.bar_size}
                onChange={(v) => setBot({ ...bot, bar_size: v })} />
              <IntField label="# bars / layer" value={bot.num_bars}
                onChange={(v) => setBot({ ...bot, num_bars: v })} min={0} />
            </div>
            <CheckboxField label="multiple layers" value={bot.multi_layers}
              onChange={(v) => setBot({ ...bot, multi_layers: v })} />
            {bot.multi_layers && (
              <div className="grid grid-cols-2 gap-2">
                <IntField label="# layers" value={bot.num_layers}
                  onChange={(v) => setBot({ ...bot, num_layers: v })} min={1} />
                <NumberField label="C/C spacing" units="in" value={bot.spacing}
                  onChange={(v) => setBot({ ...bot, spacing: v })} step={0.25} />
              </div>
            )}
            <NumberField label="bot face → first bar" units="in" value={bot.start_dist}
              onChange={(v) => setBot({ ...bot, start_dist: v })} step={0.25} />
          </Section>

          <Section title="Top reinforcement">
            <div className="grid grid-cols-2 gap-2">
              <SelectField label="bar size" options={REBAR_SIZES} value={top.bar_size}
                onChange={(v) => setTop({ ...top, bar_size: v })} />
              <IntField label="# bars / layer" value={top.num_bars}
                onChange={(v) => setTop({ ...top, num_bars: v })} min={0} />
            </div>
            <CheckboxField label="multiple layers" value={top.multi_layers}
              onChange={(v) => setTop({ ...top, multi_layers: v })} />
            {top.multi_layers && (
              <div className="grid grid-cols-2 gap-2">
                <IntField label="# layers" value={top.num_layers}
                  onChange={(v) => setTop({ ...top, num_layers: v })} min={1} />
                <NumberField label="C/C spacing" units="in" value={top.spacing}
                  onChange={(v) => setTop({ ...top, spacing: v })} step={0.25} />
              </div>
            )}
            <NumberField label="top face → first bar" units="in" value={top.start_dist}
              onChange={(v) => setTop({ ...top, start_dist: v })} step={0.25} />
          </Section>

          <Section title="Shear reinforcement">
            <div className="grid grid-cols-2 gap-2">
              <SelectField label="stirrup size" options={REBAR_SIZES} value={stirrupSize}
                onChange={setStirrupSize} />
              <IntField label="# legs" value={stirrupLegs} onChange={setStirrupLegs} min={2} />
            </div>
            <NumberField label="spacing s" units="in" value={stirrupSpacing}
              onChange={setStirrupSpacing} step={0.5} />
          </Section>

          <Section title="Demands (optional)">
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Mu⁺" units="k·ft" value={muPos} onChange={setMuPos} step={50} />
              <NumberField label="Mu⁻" units="k·ft" value={muNeg} onChange={setMuNeg} step={50} />
              <NumberField label="Vu" units="kips" value={vu} onChange={setVu} step={10} />
              <NumberField label="Ma⁺" units="k·ft" value={maPos} onChange={setMaPos} step={50} />
              <NumberField label="Ma⁻" units="k·ft" value={maNeg} onChange={setMaNeg} step={50} />
            </div>
          </Section>
        </aside>

        {/* Visualization + results */}
        <main className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 33px)" }}>
          {inputErrors.length > 0 || analysis.error ? (
            <InputErrorPanel errors={analysis.error ? [...inputErrors, analysis.error] : inputErrors} />
          ) : (
            <>
              <BeamSvg b={b} h={h} layers={layers} sideCover={sideCover} />
              {analysis.result && <ResultsPanel result={analysis.result} />}
            </>
          )}
          <ApiPreview body={analyzeInput} />
        </main>
      </div>
    </div>
  );
}

function InputErrorPanel({ errors }: { errors: string[] }) {
  return (
    <div
      className="border p-4 text-sm"
      style={{ borderColor: "var(--err)", background: "var(--panel)" }}
      role="alert"
    >
      <h2 className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--err)" }}>
        Input error
      </h2>
      <ul className="space-y-1">
        {errors.map((error, index) => (
          <li key={`${error}-${index}`}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

function ApiPreview({ body }: { body: unknown }) {
  const [open, setOpen] = useState(false);
  const json = JSON.stringify(body, null, 2);
  return (
    <div className="border" style={{ borderColor: "var(--rule)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-3 py-2 text-xs flex items-center justify-between"
        style={{ color: "var(--dim)" }}
      >
        <span>POST /api/v1/analyze — request body</span>
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <pre
          className="p-3 text-xs overflow-x-auto"
          style={{ background: "var(--panel)", color: "var(--foreground)", borderTop: "1px solid var(--rule)" }}
        >{json}</pre>
      )}
    </div>
  );
}
