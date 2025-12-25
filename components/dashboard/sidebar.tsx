"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { MessageCircle, Moon, Sun, Monitor, Settings } from "lucide-react";
import { ChevronUpDown } from "@/components/animate-ui/icons/chevron-up-down";
import { MessageCircleMore } from "@/components/animate-ui/icons/message-circle-more";
import { Users } from "@/components/animate-ui/icons/users";
import { ChartLine } from "@/components/animate-ui/icons/chart-line";
import { SlidersHorizontal } from "@/components/animate-ui/icons/sliders-horizontal";
import { MessageCircleQuestion } from "@/components/animate-ui/icons/message-circle-question";
import { MessageSquareMore } from "@/components/animate-ui/icons/message-square-more";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navigation = [
  {
    name: "שיחות",
    href: "/",
    icon: MessageCircleMore,
  },
  {
    name: "נציגים",
    href: "/agents",
    icon: Users,
  },
  {
    name: "סטטיסטיקות",
    href: "/analytics",
    icon: ChartLine,
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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <AnimateIcon animateOnHover asChild>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip={isCollapsed ? "נציג" : undefined}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="size-8 border-2 border-sidebar-border">
                  <AvatarFallback className="bg-brand-gradient text-white text-xs font-medium">
                    W
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-right text-sm leading-tight">
                  <span className="truncate font-semibold">נציג WhizChat</span>
                  <span className="truncate text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                    </span>
                    מחובר
                  </span>
                </div>
                <ChevronUpDown className="mr-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
          </AnimateIcon>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
          >
            <DropdownMenuItem>
              <Settings className="ml-2 size-4" />
              הגדרות חשבון
            </DropdownMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <DropdownMenuItem>
                  <ThemeIcon className="ml-2 size-4" />
                  ערכת נושא
                </DropdownMenuItem>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="left" align="start" className="w-40">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="ml-2 size-4" />
                  בהיר
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="ml-2 size-4" />
                  כהה
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Monitor className="ml-2 size-4" />
                  מערכת
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenuItem className="text-destructive">
              התנתק
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [unreadCount, setUnreadCount] = useState(0);

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
    <Sidebar side="right" collapsible="icon">
      {/* Header with Logo - same height as main navbar (h-14 = 56px) */}
      <SidebarHeader className="h-14 flex items-center p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip={isCollapsed ? "WhizChat" : undefined}
              className="h-10"
            >
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-sm">
                  <MessageCircle className="size-4" />
                </div>
                <div className="grid flex-1 text-right text-sm leading-tight">
                  <span className="truncate font-semibold text-brand-gradient">
                    WhizChat
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    מערכת צ'אט חכמה
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Content */}
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>ניווט ראשי</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
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
                      >
                        <Link href={item.href} className="flex items-center gap-2 w-full">
                          <div className="relative shrink-0">
                            <item.icon className="size-4" />
                            {showBadge && isCollapsed && (
                              <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white text-[10px] font-medium shadow-sm">
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            )}
                          </div>
                          <span>{item.name}</span>
                          {showBadge && !isCollapsed && (
                            <span className="mr-auto h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white text-xs font-medium shadow-sm">
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
        <SidebarGroup>
          <SidebarGroupLabel>הגדרות</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNav.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <SidebarMenuItem key={item.name}>
                    <AnimateIcon animateOnHover asChild>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={isCollapsed ? item.name : undefined}
                      >
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.name}</span>
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
      <SidebarFooter>
        <UserNav />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
