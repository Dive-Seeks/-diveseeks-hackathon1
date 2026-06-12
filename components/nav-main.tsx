"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSetupBusinessStore } from "@/lib/setup-business-store";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CirclePlusIcon, MailIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavMain({
  items,
  buttonLabel = "Create Store",
  buttonUrl = "/setup-business",
  hideInbox = false,
}: {
  items: {
    title: string;
    url?: string;
    icon?: React.ReactNode;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
  buttonLabel?: string;
  buttonUrl?: string;
  hideInbox?: boolean;
}) {
  const pathname = usePathname();
  const { reset } = useSetupBusinessStore();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu className="mt-2">
          <SidebarMenuItem className="flex items-center gap-1.5 group-data-[collapsible=icon]:gap-0">
            <SidebarMenuButton
              tooltip={buttonLabel}
              size="sm"
              className="min-w-8 bg-muted text-foreground border border-border/40 duration-200 ease-linear hover:bg-muted/80 active:bg-muted/60"
              render={<a href={buttonUrl} />}
              isActive={pathname === buttonUrl}
              onClick={() => reset()}
            >
              <CirclePlusIcon data-icon="inline-start" className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden font-medium">
                {buttonLabel}
              </span>
            </SidebarMenuButton>
            {!hideInbox && (
              <Button
                size="icon"
                className="size-8 group-data-[collapsible=icon]:hidden shrink-0"
                variant="outline"
              >
                <MailIcon data-icon="inline-start" className="size-3.5" />
                <span className="sr-only">Inbox</span>
              </Button>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
// ... existing code ...
            const hasSubItems = item.items && item.items.length > 0;

            if (hasSubItems) {
              return (
                <Collapsible
                  key={item.title}
                  defaultOpen={false}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip={item.title}
                      size="sm"
                      render={<CollapsibleTrigger />}
                    >
                      {item.icon && React.isValidElement(item.icon) && React.cloneElement(item.icon as React.ReactElement<any>, { className: "size-4" })}
                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                      <ChevronRightIcon className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                    <CollapsibleContent render={<SidebarMenuSub />}>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            render={<a href={subItem.url} />}
                            size="sm"
                            isActive={pathname === subItem.url}
                            className={cn(
                              pathname === subItem.url && "font-medium text-foreground"
                            )}
                          >
                            <span className="text-xs">{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  size="sm"
                  render={<a href={item.url} />}
                  isActive={pathname === item.url}
                  className={cn(
                    pathname === item.url && "bg-muted text-foreground font-medium"
                  )}
                >
                  {item.icon && React.isValidElement(item.icon) && React.cloneElement(item.icon as React.ReactElement<any>, { className: "size-4" })}
                  <span className="group-data-[collapsible=icon]:hidden">
                    {item.title}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
