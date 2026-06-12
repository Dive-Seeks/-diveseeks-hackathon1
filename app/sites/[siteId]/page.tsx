import { notFound } from "next/navigation";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/dist/index.css";
import { classicConfig } from "@/app/(dashboard)/app-builder/website/[siteId]/editor/_components/puck-config/classic-blocks";
import { modernConfig } from "@/app/(dashboard)/app-builder/website/[siteId]/editor/_components/puck-config/modern-blocks";
import type { SiteConfig } from "@/types/website-builder";
import type { Data } from "@puckeditor/core";

type Props = { params: Promise<{ siteId: string }> };

async function fetchPublicSite(siteId: string): Promise<{ websiteConfig: SiteConfig; name: string } | null> {
  const res = await fetch(`http://127.0.0.1:7771/api/public/sites/${siteId}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export async function generateMetadata({ params }: Props) {
  const resolvedParams = await params;
  const site = await fetchPublicSite(resolvedParams.siteId);
  if (!site) return { title: "Not Found" };
  return {
    title: site.websiteConfig.seo.title,
    description: site.websiteConfig.seo.description,
  };
}

export default async function PublicSitePage({ params }: Props) {
  const resolvedParams = await params;
  const site = await fetchPublicSite(resolvedParams.siteId);
  if (!site?.websiteConfig) notFound();

  const { templateFamily, theme, puckData } = site.websiteConfig;
  const config = templateFamily === "modern" ? modernConfig : classicConfig;

  const cssVars = `
    :root {
      --primary: ${theme.primaryColor};
      --primary-alpha: ${theme.primaryColor}22;
      --bg: ${theme.darkMode ? "#0d0d0d" : "#ffffff"};
      --bg2: ${theme.darkMode ? "#111111" : "#f9f9f9"};
    }
    body { background: var(--bg); font-family: ${theme.fontFamily}, sans-serif; }
  `;

  return (
    <>
      <style>{cssVars}</style>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Render config={config as any} data={puckData as unknown as Data} />
      <footer style={{ padding: "2rem", textAlign: "center", fontSize: "0.8rem", color: "#888", borderTop: "1px solid #eee" }}>
        Powered by Dive POS
      </footer>
    </>
  );
}