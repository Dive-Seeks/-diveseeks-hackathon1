"use client";

import * as React from "react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { BusinessContextSelector } from "@/components/business-context-selector";
import { useAuthStore } from "@/lib/auth-store";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboardIcon,
  ListIcon,
  ChartBarIcon,
  FolderIcon,
  UsersIcon,
  CameraIcon,
  FileTextIcon,
  Settings2Icon,
  CircleHelpIcon,
  SearchIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  FileIcon,
  CreditCardIcon,
  PackageIcon,
  ShoppingCartIcon,
  Users2Icon,
  BriefcaseIcon,
  Landmark,
  GlobeIcon,
  MegaphoneIcon,
  StoreIcon,
  SmartphoneIcon,
  Globe,
  Apple,
  Play,
  SparklesIcon,
  TrendingUpIcon,
  WorkflowIcon,
  ZapIcon,
  CpuIcon,
  VideoIcon,
  MessageSquareIcon,
  DnaIcon,
  PlusCircleIcon,
  ActivityIcon,
  CodeIcon,
  FlaskConicalIcon,
  BookOpenIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { SiGooglemarketingplatform } from "react-icons/si";
import { cn } from "@/lib/utils";
import { useCoordinator } from "@/hooks/useCoordinator";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon data-icon="inline-start" />,
    },
    {
      title: "Lifecycle",
      url: "#",
      icon: <ListIcon data-icon="inline-start" />,
    },
    {
      title: "Analytics",
      url: "#",
      icon: <ChartBarIcon data-icon="inline-start" />,
    },
    {
      title: "Projects",
      url: "#",
      icon: <FolderIcon data-icon="inline-start" />,
    },
    {
      title: "Team",
      url: "#",
      icon: <UsersIcon data-icon="inline-start" />,
    },
    {
      title: "Setup Business",
      url: "/setup-business",
      icon: <Settings2Icon data-icon="inline-start" />,
    },
  ],
  tenantNav: [
    {
      title: "Business Management",
      icon: <StoreIcon data-icon="inline-start" />,
      items: [
        { title: "Incomplete Businesses", url: "/store/incomplete" },
        { title: "Submitted Businesses", url: "/store/submitted" },
        { title: "Business Dashboard", url: "/store/live" },
        { title: "Closed Businesses", url: "/store/closed" },
        { title: "Blocked Businesses", url: "/store/blocked" },
      ],
    },
    {
      title: "AI Work-Force",
      icon: <SparklesIcon data-icon="inline-start" />,
      items: [
        { title: "Abigail AI", url: "/ai-workforce/abigail" },
        { title: "Framework Docs", url: "/abigail-docs" },
        { title: "Agent Fleet", url: "/ai-workforce/agents" },
        { title: "Task Automation", url: "/ai-workforce/tasks" },
        { title: "Performance", url: "/ai-workforce/performance" },
      ],
    },
    {
      title: "Locations & Channels",
      icon: <Globe className="h-4 w-4" data-icon="inline-start" />,
      items: [
        { title: "Physical Stores", url: "/store/live" }, // Temporary route until new ones are created
        { title: "Sales Channels (Sites)", url: "/menu" }, // Temporary route
      ],
    },
    {
      title: "Menu",
      icon: <PackageIcon data-icon="inline-start" />,
      items: [
        { title: "Live Menu", url: "/menu" },
        { title: "Deals", url: "/menu/deals" },
        { title: "Offers", url: "/menu/offers" },
        { title: "Gallery", url: "/menu/gallery" },
      ],
    },
    {
      title: "App Builder",
      icon: <SmartphoneIcon data-icon="inline-start" />,
      items: [
        {
          title: "Website",
          url: "/app-builder/website",
          icon: <Globe className="h-4 w-4" />,
        },
        {
          title: "Android App",
          url: "/app-builder/android",
          icon: <Play className="h-4 w-4" />,
        },
        {
          title: "iOS App",
          url: "/app-builder/ios",
          icon: <Apple className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Sales",
      icon: <ShoppingCartIcon data-icon="inline-start" />,
      items: [
        { title: "POS", url: "/sales/pos" },
        { title: "Orders", url: "/sales/orders" },
        { title: "Sales History", url: "/sales/history" },
      ],
    },
    {
      title: "Inventory",
      icon: <DatabaseIcon data-icon="inline-start" />,
      items: [
        { title: "Inventory", url: "/inventory" },
        { title: "Purchase Orders", url: "/inventory/purchase-orders" },
        { title: "Vendors", url: "/inventory/vendors" },
      ],
    },
    {
      title: "Customers",
      icon: <Users2Icon data-icon="inline-start" />,
      items: [
        { title: "Customers", url: "/customers" },
        { title: "Loyalty", url: "/customers/loyalty" },
      ],
    },
    {
      title: "Staff",
      icon: <BriefcaseIcon data-icon="inline-start" />,
      items: [
        { title: "Employees", url: "/staff/employees" },
        { title: "Roles", url: "/staff/roles" },
        { title: "Tills", url: "/staff/tills" },
      ],
    },
    {
      title: "Finance",
      icon: <Landmark data-icon="inline-start" />,
      items: [
        { title: "Expenses", url: "/finance/expenses" },
        { title: "Reports", url: "/finance/reports" },
      ],
    },
    {
      title: "Online",
      icon: <GlobeIcon data-icon="inline-start" />,
      items: [{ title: "Online Orders", url: "/online/orders" }],
    },
    {
      title: "Marketing",
      icon: <SiGooglemarketingplatform data-icon="inline-start" />,
      items: [{ title: "Discounts", url: "/marketing/discounts" }],
    },
    {
      title: "Social Media Campaign",
      icon: <MegaphoneIcon data-icon="inline-start" />,
      items: [
        { title: "Google", url: "/marketing/google" },
        { title: "Facebook", url: "/marketing/facebook" },
        { title: "Instagram", url: "/marketing/instagram" },
      ],
    },
    {
      title: "Integrate Payment",
      icon: <CreditCardIcon data-icon="inline-start" />,
      items: [{ title: "Payment Methods", url: "/integrate-payment/methods" }],
    },
    {
      title: "Settings",
      icon: <Settings2Icon data-icon="inline-start" />,
      items: [
        { title: "Stores", url: "/settings/stores" },
        { title: "Hardware", url: "/settings/hardware" },
        { title: "Taxes", url: "/settings/taxes" },
        { title: "Integrations", url: "/settings/integrations" },
        { title: "Business Settings", url: "/settings/business" },
      ],
    },
    {
      title: "AI Features",
      icon: <SparklesIcon data-icon="inline-start" />,
      items: [
        { title: "AI Settings", url: "/ai-features/settings" },
        { title: "Marketing Builder", url: "/ai-features/marketing" },
        { title: "Store Analytics", url: "/ai-features/analytics" },
      ],
    },
    {
      title: "Support",
      url: "/support",
      icon: <CircleHelpIcon data-icon="inline-start" />,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: <CameraIcon data-icon="inline-start" />,
      isActive: true,
      url: "/dashboard",
      items: [
        {
          title: "Active Proposals",
          url: "/dashboard",
        },
        {
          title: "Archived",
          url: "/dashboard",
        },
      ],
    },
    {
      title: "Proposal",
      icon: <FileTextIcon data-icon="inline-start" />,
      url: "/dashboard",
      items: [
        {
          title: "Active Proposals",
          url: "/dashboard",
        },
        {
          title: "Archived",
          url: "/dashboard",
        },
      ],
    },
  ],
  codingNav: [
    {
      title: "Workflows",
      url: "/coding/workflows",
      icon: <WorkflowIcon data-icon="inline-start" />,
    },
    {
      title: "Skills",
      icon: <ZapIcon data-icon="inline-start" />,
      items: [
        { title: "Rules", url: "/coding/skills/rules" },
        { title: "Plans", url: "/coding/skills/plans" },
        { title: "Specs", url: "/coding/skills/specs" },
      ],
    },
    {
      title: "Automation",
      url: "/coding/automation",
      icon: <WorkflowIcon data-icon="inline-start" />,
    },
    {
      title: "Activity Feed",
      url: "/coding/activity",
      icon: <ActivityIcon data-icon="inline-start" />,
    },
    {
      title: "Specialist Team",
      icon: <UsersIcon data-icon="inline-start" />,
      items: [
        { title: "Team Chat", url: "/coding/team" },
        { title: "Manage Team", url: "/coding/team/manage" },
      ],
    },
    {
      title: "Execution Engine",
      icon: <CpuIcon data-icon="inline-start" />,
      items: [
        { title: "Goal Tracker", url: "/coding/engine/goals" },
        { title: "Task Queue", url: "/coding/engine/queue" },
        { title: "Gap Analysis", url: "/coding/engine/gap" },
      ],
    },
    {
      title: "Meeting Room",
      url: "/coding/meeting",
      icon: <VideoIcon data-icon="inline-start" />,
    },
    {
      title: "Separate Talk",
      url: "/coding/talk",
      icon: <MessageSquareIcon data-icon="inline-start" />,
    },
    {
      title: "Budget & Efficiency",
      url: "/coding/budget",
      icon: <TrendingUpIcon data-icon="inline-start" />,
    },
    {
      title: "Evolve Engine Progress",
      url: "/coding/evolve",
      icon: <DnaIcon data-icon="inline-start" />,
    },
    {
      title: "Settings",
      icon: <Settings2Icon data-icon="inline-start" />,
      items: [
        { title: "LLM Settings", url: "/coding/settings/llm" },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Search",
      url: "/dashboard",
      icon: <SearchIcon data-icon="inline-start" />,
    },
    {
      title: "History",
      url: "/dashboard",
      icon: <DatabaseIcon data-icon="inline-start" />,
    },
    {
      title: "Insights",
      url: "/dashboard",
      icon: <FileChartColumnIcon data-icon="inline-start" />,
    },
    {
      title: "Settings",
      url: "/dashboard",
      icon: <Settings2Icon data-icon="inline-start" />,
    },
    {
      title: "Help",
      url: "/dashboard",
      icon: <CircleHelpIcon data-icon="inline-start" />,
    },
  ],
  documents: [
    {
      name: "Strategy_Planning.pdf",
      url: "/dashboard",
      icon: <FileIcon data-icon="inline-start" />,
    },
    {
      name: "Project_Proposal.docx",
      url: "/dashboard",
      icon: <FileIcon data-icon="inline-start" />,
    },
    {
      name: "Financial_Report.xlsx",
      url: "/dashboard",
      icon: <FileIcon data-icon="inline-start" />,
    },
  ],
};
const TEAMS = [
  { id: "coding",   label: "Coding",   icon: CodeIcon,          href: "/coding" },
  { id: "general",  label: "General",  icon: BookOpenIcon,      href: "/general" },
  { id: "research", label: "Research", icon: FlaskConicalIcon,  href: "/research" },
] as const;

type TeamId = (typeof TEAMS)[number]["id"];


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();
  const router = useRouter();
  const isTenant = user?.role === "tenant";
  const isCoding = pathname.startsWith("/coding") || pathname.startsWith("/general") || pathname.startsWith("/research");
  const { coordinator } = useCoordinator();
  const aiName = coordinator?.name ?? "Abigail AI";

  const activeTeam: TeamId = pathname.startsWith("/general")
    ? "general"
    : pathname.startsWith("/research")
    ? "research"
    : "coding";

  // Trimmed nav — the AI workspace sidebar shows only: Projects (button),
  // Workflows, My Projects (inserted at render), Meeting Room, Settings.
  // Other tools are reachable from inside the workflow pages.
  const codingNav = React.useMemo(() => {
    const t = activeTeam;
    return [
      {
        title: "Workflows",
        url: `/${t}/workflows`,
        icon: <WorkflowIcon data-icon="inline-start" />,
      },
      {
        title: "Meeting Room",
        url: `/${t}/meeting`,
        icon: <VideoIcon data-icon="inline-start" />,
      },
      {
        title: "Settings",
        icon: <Settings2Icon data-icon="inline-start" />,
        items: [
          { title: "LLM Settings", url: `/${t}/settings/llm` },
        ],
      },
    ];
  }, [activeTeam]);

  const myProjectsItem = {
    title: "My Projects",
    url: `/${activeTeam}/projects/chat`,
    icon: <FolderIcon data-icon="inline-start" />,
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-12 data-[slot=sidebar-menu-button]:p-0! hover:bg-transparent"
              render={<a href={isCoding ? `/${activeTeam}` : "/dashboard"} />}
            >
              <div className="flex items-center gap-3">
                <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  {isCoding
                    ? <img src="/Abigail-gen-1/Abigail-gen-1.png" alt="Abigail Logo" className="size-full object-cover" />
                    : <StoreIcon className="size-5 text-foreground/70" />
                  }
                </div>
                <div className="flex flex-col gap-0 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="text-base font-semibold tracking-tight text-foreground">
                    {isCoding ? aiName : "Dive Seeks"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {isCoding ? "AI Framework" : "Management"}
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Team toggle — only visible in the AI framework workspace */}
        {isCoding && (
          <div className="px-3 pb-2 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-1 gap-0.5 shadow-inner">
              {TEAMS.map(({ id, label, icon: Icon, href }) => (
                <button
                  key={id}
                  onClick={() => router.push(href)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all duration-200",
                    activeTeam === id
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md scale-[1.02]"
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                  )}
                >
                  <Icon className="size-3 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {!isCoding && isTenant && <BusinessContextSelector />}
        {isCoding ? (
          <NavMain
            items={[codingNav[0], myProjectsItem, ...codingNav.slice(1)]}
            buttonLabel="Projects"
            buttonUrl={`/${activeTeam}/projects`}
            hideInbox={true}
          />
        ) : isTenant ? (
          <NavMain items={data.tenantNav} />
        ) : (
          <>
            <NavMain items={data.navMain} />
            <NavDocuments items={data.documents} />
          </>
        )}
        {!isTenant && !isCoding && (
          <NavSecondary items={data.navSecondary} className="mt-auto" />
        )}
      </SidebarContent>
    </Sidebar>
  );
}
