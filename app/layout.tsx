import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "concrete-beam",
  description: "ACI 318 doubly-reinforced concrete beam — capacity, stiffness, design.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
