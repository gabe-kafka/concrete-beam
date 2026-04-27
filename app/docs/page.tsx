// Renders /api/v1/openapi.json into a flat, no-JS docs page. Replace
// this with Redoc / Stoplight / your own renderer if you outgrow it.

type OpenApi = {
  info: { title: string; version: string; description?: string };
  paths: Record<string, Record<string, OperationObj>>;
};

type OperationObj = {
  summary?: string;
  requestBody?: { content: Record<string, { schema: unknown }> };
  responses: Record<string, { description: string }>;
};

async function fetchSpec(): Promise<OpenApi> {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  const res = await fetch(`${base}/api/v1/openapi.json`, { cache: "no-store" });
  return res.json();
}

export default async function Docs() {
  const spec = await fetchSpec();
  const entries = Object.entries(spec.paths);

  return (
    <main className="mx-auto max-w-3xl p-8 font-mono text-sm">
      <h1 className="text-xl mb-1">{spec.info.title}</h1>
      <p style={{ color: "var(--dim)" }}>v{spec.info.version}</p>
      {spec.info.description && <p className="mt-3">{spec.info.description}</p>}

      <h2 className="text-base mt-8 mb-3">Endpoints</h2>
      {entries.map(([path, methods]) => (
        <section key={path} className="mb-6 border border-zinc-700 p-4">
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
  );
}
