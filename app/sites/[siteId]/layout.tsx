import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Loading..." };

export default function PublicSiteLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}