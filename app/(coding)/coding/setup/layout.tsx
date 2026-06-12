import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Abigail AI - Project Setup",
  description: "Configure and initialize your development projects with Abigail.",
};

export default function CodingSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
