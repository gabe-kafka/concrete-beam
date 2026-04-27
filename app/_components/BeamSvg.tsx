"use client";

// Pure-SVG cross-section drawing — the React analogue of the matplotlib
// `visualize_beam` from the Streamlit prototype. Coordinates are in
// "section-inch" space; the SVG viewBox carries everything else.

import type { RebarLayer } from "@/lib/concrete/section";
import { barDiameter } from "@/lib/concrete/rebar";

interface BeamSvgProps {
  b: number;
  h: number;
  layers: RebarLayer[];
  sideCover: number;
}

export default function BeamSvg({ b, h, layers, sideCover }: BeamSvgProps) {
  // Padding around the section in inch units, for dimensions/leaders.
  const padL = 1.5;
  const padR = 5;       // room for leader lines
  const padT = 1;
  const padB = 2.5;     // room for width dim line
  const W = b + padL + padR;
  const H = h + padT + padB;

  // Origin in SVG: section bottom-left at (padL, padT + h)  → SVG y grows down.
  const xOf = (x: number) => padL + x;
  const yOf = (yFromBottom: number) => padT + (h - yFromBottom);

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--rule)",
        height: "min(70vh, calc(100vh - 33px - 32px))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* Beam outline */}
      <rect
        x={xOf(0)}
        y={yOf(h)}
        width={b}
        height={h}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth={0.06}
      />

      {/* Rebars */}
      {layers.map((layer, idx) => {
        if (layer.num_bars <= 0) return null;
        const d = barDiameter(layer.bar_size);
        const r = d / 2;
        const yBottom = layer.side === "bottom" ? layer.dist : h - layer.dist;
        const xs: number[] =
          layer.num_bars === 1
            ? [b / 2]
            : (() => {
                const cs = (b - 2 * sideCover) / (layer.num_bars - 1);
                return Array.from({ length: layer.num_bars }, (_, i) => sideCover + i * cs);
              })();
        return (
          <g key={idx}>
            {xs.map((x, j) => (
              <circle
                key={j}
                cx={xOf(x)}
                cy={yOf(yBottom)}
                r={r}
                fill="var(--accent)"
                stroke="var(--foreground)"
                strokeWidth={0.04}
              />
            ))}
            {/* Leader to right edge */}
            <line
              x1={xOf(b)}
              y1={yOf(yBottom)}
              x2={xOf(b) + 2}
              y2={yOf(yBottom)}
              stroke="var(--dim)"
              strokeWidth={0.04}
            />
            <text
              x={xOf(b) + 2.2}
              y={yOf(yBottom) + 0.25}
              fontSize={0.6}
              fill="var(--dim)"
              fontFamily="ui-monospace, monospace"
            >
              {layer.num_bars}-{layer.bar_size} @ {layer.dist.toFixed(2)}″
            </text>
          </g>
        );
      })}

      {/* Width dimension below */}
      <line
        x1={xOf(0)} x2={xOf(b)}
        y1={yOf(0) + 0.9} y2={yOf(0) + 0.9}
        stroke="var(--dim)" strokeWidth={0.04}
      />
      <line x1={xOf(0)} x2={xOf(0)} y1={yOf(0) + 0.7} y2={yOf(0) + 1.1} stroke="var(--dim)" strokeWidth={0.04} />
      <line x1={xOf(b)} x2={xOf(b)} y1={yOf(0) + 0.7} y2={yOf(0) + 1.1} stroke="var(--dim)" strokeWidth={0.04} />
      <text
        x={xOf(b / 2)} y={yOf(0) + 1.7}
        textAnchor="middle"
        fontSize={0.7}
        fill="var(--dim)"
        fontFamily="ui-monospace, monospace"
      >
        b = {b.toFixed(2)}″
      </text>

      {/* Height dimension on left */}
      <line
        x1={xOf(0) - 0.7} x2={xOf(0) - 0.7}
        y1={yOf(0)} y2={yOf(h)}
        stroke="var(--dim)" strokeWidth={0.04}
      />
      <text
        x={xOf(0) - 1.0}
        y={yOf(h / 2)}
        textAnchor="end"
        dominantBaseline="middle"
        fontSize={0.7}
        fill="var(--dim)"
        fontFamily="ui-monospace, monospace"
        transform={`rotate(-90 ${xOf(0) - 1.0} ${yOf(h / 2)})`}
      >
        h = {h.toFixed(2)}″
      </text>
    </svg>
    </div>
  );
}
