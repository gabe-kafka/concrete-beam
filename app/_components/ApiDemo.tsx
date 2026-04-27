"use client";

// Web UI that POSTs to its own API. The pattern: keep state for the
// inputs, fire-and-debounce a fetch, render `idle | loading | ok |
// error`. This mirrors what statics' Diagrams component does.

import { useState } from "react";
import type { ApiError, EchoRequest, EchoResponse } from "@/lib/api/types";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: EchoResponse }
  | { kind: "error"; message: string };

export function ApiDemo() {
  const [message, setMessage] = useState("hello");
  const [repeat, setRepeat] = useState(3);
  const [state, setState] = useState<State>({ kind: "idle" });

  async function send() {
    setState({ kind: "loading" });
    const req: EchoRequest = { message, repeat };
    try {
      const res = await fetch("/api/v1/echo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const json = (await res.json()) as EchoResponse | ApiError;
      if (!json.ok) {
        setState({ kind: "error", message: json.message });
        return;
      }
      setState({ kind: "ok", data: json });
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    }
  }

  return (
    <section className="border border-zinc-700 p-4">
      <h2 className="text-base mb-3">POST /api/v1/echo</h2>

      <label className="block mb-2 text-xs">
        message
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="block w-full mt-1 bg-black border border-zinc-700 px-2 py-1"
        />
      </label>

      <label className="block mb-3 text-xs">
        repeat
        <input
          type="number"
          min={1}
          max={100}
          value={repeat}
          onChange={(e) => setRepeat(Number(e.target.value) || 1)}
          className="block w-24 mt-1 bg-black border border-zinc-700 px-2 py-1"
        />
      </label>

      <button
        onClick={send}
        className="border border-zinc-500 px-3 py-1 hover:bg-zinc-900"
      >
        send
      </button>

      <StatusPill state={state} />
    </section>
  );
}

function StatusPill({ state }: { state: State }) {
  let label: string;
  let color: string;
  switch (state.kind) {
    case "idle":
      label = "idle";
      color = "var(--dim)";
      break;
    case "loading":
      label = "solving…";
      color = "var(--accent)";
      break;
    case "ok":
      label = `200 · ${state.data.echoes.length} echoes`;
      color = "var(--ok)";
      break;
    case "error":
      label = state.message;
      color = "var(--err)";
      break;
  }
  return (
    <div className="mt-3 text-xs" style={{ color }}>
      {label}
      {state.kind === "ok" && (
        <pre className="mt-2 bg-black border border-zinc-800 p-2 overflow-auto text-[11px]">
          {JSON.stringify(state.data, null, 2)}
        </pre>
      )}
    </div>
  );
}
