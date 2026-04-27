import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Template",
  description: "Lean Next.js scaffold: typed POST /api/v1/<resource> + docs + dogfooding web UI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
