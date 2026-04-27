"use client";

import Link from "next/link";

interface HeaderProps {
  apiPath: string;        // e.g. "POST /api/v1/analyze"
  apiState: "idle" | "live" | "error";
}

export default function Header({ apiPath, apiState }: HeaderProps) {
  const dot =
    apiState === "live" ? "var(--ok)" :
    apiState === "error" ? "var(--err)" : "var(--dim)";
  return (
    <header
      className="flex items-center justify-between px-4 py-2 border-b text-xs"
      style={{ borderColor: "var(--rule)" }}
    >
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold tracking-wider text-sm">
          CONCRETE-BEAM
        </Link>
        <nav className="flex items-center gap-4" style={{ color: "var(--dim)" }}>
          <Link href="/" className="hover:text-white">DESIGN</Link>
          <Link href="/api/v1/openapi.json" className="hover:text-white">API</Link>
          <Link href="/docs" className="hover:text-white">DOCS</Link>
        </nav>
      </div>
      <div className="flex items-center gap-2" style={{ color: "var(--dim)" }}>
        <span
          aria-hidden
          style={{
            width: 6, height: 6, background: dot,
            display: "inline-block",
          }}
        />
        <span>{apiPath}</span>
        <span>·</span>
        <span>{apiState}</span>
      </div>
    </header>
  );
}
