"use client";

import * as React from "react";
import { BriefcaseIcon } from "lucide-react";
import api from "@/lib/api";

import { useBusinessContextStore } from "@/lib/business-context-store";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

export function BusinessContextSelector() {
  const {
    activeBusinessId,
    activeSiteId,
    activeStoreId,
    setActiveBusinessId,
    setActiveSiteId,
    setActiveStoreId,
  } = useBusinessContextStore();
  const { state, setOpenCollapsed } = useSidebar();

  // Fetch all businesses for the current user
  const { data: businessesData } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.get(`/businesses`).then(r => r.data),
  });

  const businesses = React.useMemo(() => {
    const payload = businessesData?.data;
    const allBusinesses = Array.isArray(payload) ? payload : payload?.data || [];
    // Only show businesses that are submitted (or beyond)
    return allBusinesses.filter((b: any) => 
      b.status === 'SUBMITTED' || 
      b.status === 'PENDING_REVIEW' || 
      b.status === 'PENDING' || 
      b.status === 'ACTIVE'
    );
  }, [businessesData]);

  const { data: business } = useQuery({
    queryKey: ['business', activeBusinessId],
    queryFn: () => api.get(`/businesses/${activeBusinessId}`).then(r => r.data),
    enabled: !!activeBusinessId,
  });

  const sites = React.useMemo(() => {
    const payload = business?.data;
    return Array.isArray(payload?.sites) ? payload.sites : payload?.data?.sites || [];
  }, [business]);

  const stores = React.useMemo(() => {
    const payload = business?.data;
    return Array.isArray(payload?.stores) ? payload.stores : payload?.data?.stores || [];
  }, [business]);

  // Auto-select first business if none active
  React.useEffect(() => {
    if (!activeBusinessId && businesses.length > 0) {
      setActiveBusinessId(businesses[0].id);
    }
  }, [activeBusinessId, businesses, setActiveBusinessId]);

  // Auto-select first site/store if none active or if current active is not in the list
  React.useEffect(() => {
    if (sites.length > 0) {
      const isSiteValid = sites.some((s: any) => s.id === activeSiteId);
      if (!isSiteValid) {
        setActiveSiteId(sites[0].id);
      }
    } else if (activeSiteId) {
      setActiveSiteId(null);
    }

    if (stores.length > 0) {
      const isStoreValid = stores.some((s: any) => s.id === activeStoreId);
      if (!isStoreValid) {
        setActiveStoreId(stores[0].id);
      }
    } else if (activeStoreId) {
      setActiveStoreId(null);
    }
  }, [activeSiteId, activeStoreId, setActiveSiteId, setActiveStoreId, sites, stores]);

  const businessOptions = React.useMemo(() => {
    const opts = businesses.map((b: { id: string; name: string }) => ({
      value: b.id,
      label: b.name || "Unnamed Business",
    }));
    return [{ value: null, label: "Select Business" }, ...opts];
  }, [businesses]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex flex-col gap-2 p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:items-center">
          {/* Business Selector */}
          <div className="flex flex-col gap-1 w-full group-data-[collapsible=icon]:w-fit">
            <span className="text-xs font-medium text-muted-foreground ml-1 uppercase tracking-widest group-data-[collapsible=icon]:hidden">
              Business
            </span>
            <Select
              value={activeBusinessId || null}
              onValueChange={setActiveBusinessId}
              items={businessOptions}
            >
              <SelectTrigger 
                className="w-full bg-background group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center [&>svg:last-child]:group-data-[collapsible=icon]:hidden"
                onClick={(e) => {
                  if (state === "collapsed") {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenCollapsed(true);
                  }
                }}
              >
                <div className="flex items-center justify-center truncate">
                  <BriefcaseIcon className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden ml-2 truncate">
                    <SelectValue />
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {businessOptions.map((option) => (
                    <SelectItem key={option.value || "placeholder"} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
