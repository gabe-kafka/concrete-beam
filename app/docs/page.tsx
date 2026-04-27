// Renders the OpenAPI spec as a flat docs page. No JS, no fetch — the
// spec is imported directly from lib/api/openapi.ts.

import { openApiSpec } from "@/lib/api/openapi";
import Header from "../_components/Header";

interface OperationObj {
  summary?: string;
  responses: Record<string, { description: string }>;
}

export default function Docs() {
  const spec = openApiSpec;
  const entries = Object.entries(spec.paths) as Array<[
    string,
    Record<string, OperationObj>,
  ]>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header apiPath="GET /api/v1/openapi.json" apiState="idle" />
      <main className="mx-auto max-w-3xl p-8 text-sm w-full">
        <h1 className="text-xl mb-1">{spec.info.title}</h1>
        <p style={{ color: "var(--dim)" }}>v{spec.info.version}</p>
        {spec.info.description && <p className="mt-3">{spec.info.description}</p>}

        <h2 className="text-base mt-8 mb-3">Endpoints</h2>
        {entries.map(([path, methods]) => (
          <section key={path} className="mb-6 border p-4" style={{ borderColor: "var(--rule)" }}>
            <code className="text-base">{path}</code>
            {Object.entries(methods).map(([method, op]) => (
              <div key={method} className="mt-3">
                <span className="uppercase font-bold mr-2" style={{ color: "var(--accent)" }}>
                  {method}
                </span>
                {op.summary}
                <ul className="mt-2 ml-4">
                  {Object.entries(op.responses).map(([code, r]) => (
                    <li key={code}>
                      <span style={{ color: "var(--dim)" }}>{code}</span> — {r.description}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}

        <p style={{ color: "var(--dim)" }} className="mt-8">
          Raw spec:{" "}
          <a href="/api/v1/openapi.json" className="underline">
            /api/v1/openapi.json
          </a>
        </p>
      </main>
    </div>
  );
}
