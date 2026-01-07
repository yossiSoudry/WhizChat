"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { MessageCircle, Moon, Sun, Monitor, Settings, LogOut } from "lucide-react";
import { ChevronUpDown } from "@/components/animate-ui/icons/chevron-up-down";
import { MessageCircleMore } from "@/components/animate-ui/icons/message-circle-more";
import { Users } from "@/components/animate-ui/icons/users";
import { ChartLine } from "@/components/animate-ui/icons/chart-line";
import { SlidersHorizontal } from "@/components/animate-ui/icons/sliders-horizontal";
import { MessageCircleQuestion } from "@/components/animate-ui/icons/message-circle-question";
import { MessageSquareMore } from "@/components/animate-ui/icons/message-square-more";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { useAgent } from "@/contexts/agent-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigation = [
  {
    name: "שיחות",
    href: "/",
    icon: MessageCircleMore,
    adminOnly: false,
  },
  {
    name: "נציגים",
    href: "/agents",
    icon: Users,
    adminOnly: true,
  },
  {
    name: "סטטיסטיקות",
    href: "/analytics",
    icon: ChartLine,
    adminOnly: false,
  },
];

const settingsNav = [
  {
    name: "הגדרות",
    href: "/settings",
    icon: SlidersHorizontal,
  },
  {
    name: "שאלות נפוצות",
    href: "/settings/faq",
    icon: MessageCircleQuestion,
  },
  {
    name: "תשובות מהירות",
    href: "/settings/quick-replies",
    icon: MessageSquareMore,
  },
];

function UserNav() {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { agent, logout, isAdmin } = useAgent();
  const router = useRouter();
  const isCollapsed = state === "collapsed";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ThemeIcon = mounted
    ? theme === "dark"
      ? Moon
      : theme === "light"
      ? Sun
      : Monitor
    : Monitor;

  // Get initials from agent name
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.slice(0, 2);
  };

  const displayName = agent?.name || "נציג";
  const initials = agent ? getInitials(agent.name) : "W";
  const roleLabel = isAdmin ? "מנהל" : "נציג";

  // Only show tooltip after mount to avoid hydration mismatch with Radix IDs
  const showTooltip = mounted && isCollapsed ? displayName : undefined;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <AnimateIcon animateOnHover asChild>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip={showTooltip}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-xl hover:bg-muted/80 transition-all duration-200 group/user"
              >
                <Avatar className="size-9 ring-2 ring-offset-2 ring-offset-background ring-primary/20 group-hover/user:ring-primary/40 transition-all duration-200">
                  {agent?.avatarUrl && <AvatarImage src={agent.avatarUrl} alt={displayName} />}
                  <AvatarFallback className="bg-brand-gradient text-white text-xs font-bold">
                    {initials.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-right text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="relative flex size-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                    </span>
                    {roleLabel}
                  </span>
                </div>
                <ChevronUpDown className="mr-auto size-4 text-muted-foreground" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
          </AnimateIcon>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl shadow-lg"
          >
            <div className="px-3 py-2.5 text-sm border-b mb-1 bg-gradient-to-l from-muted/50 to-transparent rounded-t-xl">
              <p className="font-medium text-foreground">{displayName}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{agent?.email}</p>
            </div>
            <DropdownMenuItem onClick={() => router.push("/account")} className="gap-2 py-2 cursor-pointer">
              <div className="p-1.5 rounded-md bg-muted">
                <Settings className="size-3.5" />
              </div>
              הגדרות חשבון
            </DropdownMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <DropdownMenuItem className="gap-2 py-2 cursor-pointer">
                  <div className="p-1.5 rounded-md bg-muted">
                    <ThemeIcon className="size-3.5" />
                  </div>
                  ערכת נושא
                </DropdownMenuItem>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="left" align="start" className="w-40 rounded-xl">
                <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2 cursor-pointer">
                  <Sun className="size-4 text-amber-500" />
                  בהיר
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2 cursor-pointer">
                  <Moon className="size-4 text-indigo-400" />
                  כהה
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2 cursor-pointer">
                  <Monitor className="size-4 text-muted-foreground" />
                  מערכת
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="border-t mt-1 pt-1">
              <DropdownMenuItem
                className="gap-2 py-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => logout()}
              >
                <div className="p-1.5 rounded-md bg-destructive/10">
                  <LogOut className="size-3.5" />
                </div>
                התנתק
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { isAdmin } = useAgent();
  const isCollapsed = state === "collapsed";
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close sidebar on mobile when clicking a link
  const handleLinkClick = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/conversations/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return (
    <Sidebar side="right" collapsible="icon" className="border-l-0">
      {/* Header with Logo - same height as main navbar (h-14 = 56px) */}
      <SidebarHeader className="h-14 flex items-center p-2 border-b border-sidebar-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip={isCollapsed ? "WhizChat" : undefined}
              className="h-10 group/logo"
            >
              <Link href="/" onClick={handleLinkClick}>
                <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-md shadow-primary/25 group-hover/logo:shadow-lg group-hover/logo:shadow-primary/30 group-hover/logo:scale-105 transition-all duration-300">
                  <MessageCircle className="size-4" />
                </div>
                <div className="grid flex-1 text-right text-sm leading-tight">
                  <span className="truncate font-bold text-brand-gradient text-base">
                    WhizChat
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    מערכת צ'אט חכמה
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Content */}
      <SidebarContent className="py-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">ניווט ראשי</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {navigation
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                const showBadge = item.href === "/" && unreadCount > 0;

                return (
                  <SidebarMenuItem key={item.name}>
                    <AnimateIcon animateOnHover asChild>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={isCollapsed ? item.name : undefined}
                        className={`rounded-lg transition-all duration-200 ${isActive ? "bg-primary/10 text-primary shadow-sm before:absolute before:right-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-primary before:rounded-l-full" : "hover:bg-muted/80"}`}
                      >
                        <Link href={item.href} className="flex items-center gap-2.5 w-full relative" onClick={handleLinkClick}>
                          <div className={`relative shrink-0 p-1.5 rounded-md transition-colors ${isActive ? "bg-primary/10" : ""}`}>
                            <item.icon className={`size-4 ${isActive ? "text-primary" : ""}`} />
                            {showBadge && isCollapsed && (
                              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] font-bold shadow-md shadow-primary/30 animate-pulse">
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            )}
                          </div>
                          <span className={`font-medium ${isActive ? "text-primary" : ""}`}>{item.name}</span>
                          {showBadge && !isCollapsed && (
                            <span className="mr-auto h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[11px] font-bold shadow-md shadow-primary/30">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </AnimateIcon>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Navigation */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">הגדרות</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {settingsNav.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <SidebarMenuItem key={item.name}>
                    <AnimateIcon animateOnHover asChild>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={isCollapsed ? item.name : undefined}
                        className={`rounded-lg transition-all duration-200 ${isActive ? "bg-primary/10 text-primary shadow-sm before:absolute before:right-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-primary before:rounded-l-full" : "hover:bg-muted/80"}`}
                      >
                        <Link href={item.href} onClick={handleLinkClick} className="relative">
                          <div className={`p-1.5 rounded-md transition-colors ${isActive ? "bg-primary/10" : ""}`}>
                            <item.icon className={`size-4 ${isActive ? "text-primary" : ""}`} />
                          </div>
                          <span className={`font-medium ${isActive ? "text-primary" : ""}`}>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </AnimateIcon>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <UserNav />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
