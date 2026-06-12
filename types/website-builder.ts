export type TemplateFamily = 'classic' | 'modern';

export type BlockType =
  | 'hero'
  | 'menu'
  | 'about'
  | 'contact'
  | 'ordering_cta'
  | 'opening_hours';

export type PuckData = {
  content: Array<{
    type: string;
    props: Record<string, unknown> & { id: string };
  }>;
  root: { props: Record<string, unknown> };
  zones?: Record<string, Array<{ type: string; props: Record<string, unknown> & { id: string } }>>;
};

export type SiteConfig = {
  templateFamily: TemplateFamily;
  templateId: string;
  theme: {
    primaryColor: string;
    fontFamily: string;
    darkMode: boolean;
  };
  puckData: PuckData;
  seo: {
    title: string;
    description: string;
    ogImage?: string;
  };
  generatedAt: string;
};

export type WebsiteStatus = 'draft' | 'published' | 'generating';

export interface SiteConfigResponse {
  id: string;
  name: string;
  type: string;
  subdomain: string | null;
  websiteStatus: WebsiteStatus;
  websiteConfig: SiteConfig | null;
  updatedAt: string;
}
