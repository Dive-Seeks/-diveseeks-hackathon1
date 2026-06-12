"use client";
import * as React from "react";
import { Puck, usePuck } from "@puckeditor/core";
import "@puckeditor/core/dist/index.css";
import type { Data } from "@puckeditor/core";
import { classicConfig } from "./puck-config/classic-blocks";
import { modernConfig } from "./puck-config/modern-blocks";
import type { TemplateFamily, PuckData, SiteConfig } from "@/types/website-builder";
import { Button } from "@/components/ui/button";
import { Globe, Save, Loader2, Smartphone, Tablet, Monitor } from "lucide-react";

type Props = {
  initialData: PuckData;
  templateFamily: TemplateFamily;
  theme: SiteConfig["theme"];
  siteName: string;
  isSaving: boolean;
  isPublishing: boolean;
  onSave: (data: PuckData) => void;
  onPublish: (data: PuckData) => void;
};

function CustomHeaderActions({
  isSaving,
  isPublishing,
  onSave,
  onPublish,
}: {
  isSaving: boolean;
  isPublishing: boolean;
  onSave: (data: PuckData) => void;
  onPublish: (data: PuckData) => void;
}) {
  const { appState } = usePuck();
  return (
    <>
      <Button size="sm" variant="outline" disabled={isSaving} onClick={() => onSave(appState.data as unknown as PuckData)}>
        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
        Save Draft
      </Button>
      <Button size="sm" className="bg-foreground hover:bg-foreground/90 text-background" disabled={isPublishing} onClick={() => onPublish(appState.data as unknown as PuckData)}>
        {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Globe className="h-3.5 w-3.5 mr-1" />}
        Publish
      </Button>
    </>
  );
}

function CustomIframe({ children, iframeDoc, cssVars }: { children: React.ReactNode; iframeDoc: Document | undefined; cssVars: string }) {
  React.useEffect(() => {
    if (!iframeDoc) return;
    const style = iframeDoc.createElement("style");
    style.textContent = cssVars;
    iframeDoc.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [iframeDoc, cssVars]);
  return <>{children}</>;
}

export function PuckWrapper({ initialData, templateFamily, theme, siteName, isSaving, isPublishing, onSave, onPublish }: Props) {
  const config = templateFamily === "modern" ? modernConfig : classicConfig;

  const cssVars = `
    :root {
      --primary: ${theme.primaryColor};
      --primary-alpha: ${theme.primaryColor}22;
      --bg: ${theme.darkMode ? "#0d0d0d" : "#ffffff"};
      --bg2: ${theme.darkMode ? "#111111" : "#f9f9f9"};
    }
  `;

  return (
    <div style={{ height: "calc(100dvh - 120px)" }}>
      <style>{cssVars}</style>
      <Puck
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config={config as any}
        data={initialData as unknown as Data}
        onPublish={(data) => onPublish(data as unknown as PuckData)}
        headerTitle={siteName}
        viewports={[
          { width: 375,  label: "Mobile",  icon: <Smartphone size={14} /> },
          { width: 768,  label: "Tablet",  icon: <Tablet size={14} /> },
          { width: 1280, label: "Desktop", icon: <Monitor size={14} /> },
        ]}
        overrides={{
          iframe: ({ children, document: iframeDoc }) => (
            <CustomIframe iframeDoc={iframeDoc} cssVars={cssVars}>
              {children}
            </CustomIframe>
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          header: ({ actions }: any) => (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderBottom: "1px solid var(--puck-color-grey-09)", background: "var(--puck-color-white)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "6px", height: "24px", borderRadius: "3px", background: "#3b82f6" }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.875rem" }}>Dive POS — Website Editor</p>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#888" }}>{siteName}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {actions}
              </div>
            </div>
          ),
          headerActions: () => (
            <CustomHeaderActions
              isSaving={isSaving}
              isPublishing={isPublishing}
              onSave={onSave}
              onPublish={onPublish}
            />
          ),
        }}
      />
    </div>
  );
}