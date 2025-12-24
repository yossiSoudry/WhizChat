"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Settings,
  Users,
  HelpCircle,
  Zap,
  BarChart3,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "שיחות", href: "/", icon: MessageSquare },
  { name: "נציגים", href: "/agents", icon: Users },
  { name: "הגדרות", href: "/settings", icon: Settings },
  { name: "שאלות נפוצות", href: "/settings/faq", icon: HelpCircle },
  { name: "תשובות מהירות", href: "/settings/quick-replies", icon: Zap },
  { name: "ארכיון", href: "/archive", icon: Archive },
  { name: "סטטיסטיקות", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-l bg-card flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-brand-gradient">
            WhizChat
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Status indicator */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>אונליין</span>
        </div>
      </div>
    </aside>
  );
}
