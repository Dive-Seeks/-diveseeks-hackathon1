import "./globals.css";
import "../public/demo-bold/demo-bold.css";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { AppInitializer } from "@/components/providers/app-initializer";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export const metadata = {
  title: "Dive POS - Secure Login",
  description: "Advanced authentication for your SaaS POS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="theme-bold font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AppInitializer />
            <ErrorBoundary>
              <TooltipProvider>{children}</TooltipProvider>
            </ErrorBoundary>
          </QueryProvider>
          <Toaster position="top-right" closeButton richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
