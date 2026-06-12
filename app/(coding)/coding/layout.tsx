import { HermesObserver } from "@/lib/hooks/useHermesSignal";

export default function CodingDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <HermesObserver />
      {children}
    </>
  );
}
