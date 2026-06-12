"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  EllipsisVerticalIcon,
  CircleUserRoundIcon,
  CreditCardIcon,
  BellIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
} from "lucide-react";

import { ModeToggle } from "@/components/mode-toggle";

export function NavUser({
  user,
  variant = "sidebar",
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  variant?: "sidebar" | "topbar";
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  const ThemeIcon =
    theme === "dark" ? MoonIcon : theme === "system" ? MonitorIcon : SunIcon;

  if (variant === "topbar") {
    return (
      <div className="flex items-center gap-2">
        <ModeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 outline-none">
                <div className="hidden grid-1 text-left text-sm leading-tight md:grid">
                  <span className="truncate font-medium text-foreground">
                    {user.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
                <EllipsisVerticalIcon className="ml-1 size-3.5 text-muted-foreground" />
              </button>
            }
          />
          <DropdownMenuContent
            className="min-w-56"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/account")}>
                <CircleUserRoundIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/billing")}>
                <CreditCardIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/notifications")}>
                <BellIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ThemeIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <SunIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <MoonIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <MonitorIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={() => router.push("/logout")}>
                <LogOutIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex items-center gap-1">
        <ModeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="aria-expanded:bg-muted flex-1"
              />
            }
          >
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
            <EllipsisVerticalIcon className="ml-auto size-3.5 text-muted-foreground" data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/account")}>
                <CircleUserRoundIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/billing")}>
                <CreditCardIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/notifications")}>
                <BellIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ThemeIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <SunIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <MoonIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <MonitorIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={() => router.push("/logout")}>
                <LogOutIcon className="size-3.5 text-muted-foreground" data-icon="inline-start" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
