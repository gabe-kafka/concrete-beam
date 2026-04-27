import { ApiDemo } from "./_components/ApiDemo";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8 font-mono text-sm">
      <h1 className="text-xl mb-1">api-template</h1>
      <p style={{ color: "var(--dim)" }} className="mb-6">
        Lean Next.js scaffold: web app + typed JSON API in one repo.
      </p>

      <ApiDemo />

      <p className="mt-6 text-xs" style={{ color: "var(--dim)" }}>
        Spec: <a className="underline" href="/api/v1/openapi.json">/api/v1/openapi.json</a>
        {" · "}
        Docs: <a className="underline" href="/docs">/docs</a>
      </p>
    </main>
  );
}
