import api from "@/lib/api";
import type { SiteConfigResponse } from "@/types/website-builder";

interface ApiEnvelope<T> { data: T; statusCode: number; timestamp: string; }

const unwrap = <T>(res: ApiEnvelope<T> | T): T =>
  typeof res === "object" && res !== null && "data" in (res as object) && "statusCode" in (res as object)
    ? (res as ApiEnvelope<T>).data
    : (res as T);

export async function getSiteConfig(siteId: string): Promise<SiteConfigResponse> {
  const res = await api.get<ApiEnvelope<SiteConfigResponse>>(`/website-builder/sites/${siteId}/config`);
  return unwrap(res.data);
}

export async function updateSiteConfig(siteId: string, payload: {
  templateId?: string;
  theme?: { primaryColor: string; fontFamily: string; darkMode: boolean };
  puckData?: Record<string, unknown>;
  seo?: { title: string; description: string; ogImage?: string };
  subdomain?: string;
}): Promise<SiteConfigResponse> {
  const res = await api.patch<ApiEnvelope<SiteConfigResponse>>(`/website-builder/sites/${siteId}/config`, payload);
  return unwrap(res.data);
}

export const generateSite = async (siteId: string, templateFamily: "classic" | "modern", merchantHint?: string): Promise<SiteConfigResponse> => {
  const res = await api.post<ApiEnvelope<SiteConfigResponse>>(`/website-builder/sites/${siteId}/generate`, {
    siteId, templateFamily, merchantHint,
  });
  return unwrap(res.data);
};

export const publishSite = async (siteId: string): Promise<SiteConfigResponse> => {
  const res = await api.post<ApiEnvelope<SiteConfigResponse>>(`/website-builder/sites/${siteId}/publish`, {});
  return unwrap(res.data);
};

export const getPublicSite = async (subdomain: string): Promise<SiteConfigResponse> => {
  const res = await api.get<ApiEnvelope<SiteConfigResponse>>(`/public/sites/${subdomain}`);
  return unwrap(res.data);
};

export const websiteBuilderApi = {
  getSiteConfig,
  updateSiteConfig,
  generateSite,
  publishSite,
  getPublicSite,
};
