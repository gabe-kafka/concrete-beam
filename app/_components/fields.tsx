"use client";

// Tiny set of cockpit-flat input primitives so the page file isn't
// drowning in className soup.

import type { ChangeEvent } from "react";

interface NumberFieldProps {
  label: string;
  units?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  width?: string;
}

const inputCls =
  "w-full bg-transparent border px-2 py-1 text-sm focus:outline-none";

export function NumberField({ label, units, value, onChange, step = 0.5, min = 0, width }: NumberFieldProps) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v)) onChange(v);
  };
  return (
    <label className="block text-xs" style={{ color: "var(--dim)" }}>
      <div className="flex items-baseline justify-between mb-1">
        <span>{label}</span>
        {units && <span className="opacity-60">{units}</span>}
      </div>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        onChange={handle}
        step={step}
        min={min}
        className={inputCls}
        style={{ borderColor: "var(--rule)", color: "var(--foreground)", width }}
      />
    </label>
  );
}

interface IntFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}

export function IntField({ label, value, onChange, min = 0 }: IntFieldProps) {
  return (
    <NumberField
      label={label}
      value={value}
      onChange={(v) => onChange(Math.max(min, Math.round(v)))}
      step={1}
      min={min}
    />
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}

export function SelectField<T extends string>({ label, options, value, onChange }: SelectFieldProps<T>) {
  return (
    <label className="block text-xs" style={{ color: "var(--dim)" }}>
      <div className="mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={inputCls}
        style={{ borderColor: "var(--rule)", color: "var(--foreground)", background: "var(--background)" }}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

interface CheckboxFieldProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export function CheckboxField({ label, value, onChange }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--dim)" }}>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border p-3" style={{ borderColor: "var(--rule)" }}>
      <h3 className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
