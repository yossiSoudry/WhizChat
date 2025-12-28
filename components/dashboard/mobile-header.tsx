"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function MobileHeader({ title, subtitle, icon }: MobileHeaderProps) {
  const { setOpenMobile } = useSidebar();

  return (
    <div className="md:hidden shrink-0 h-14 border-b flex items-center px-4 gap-3">
      <button
        onClick={() => setOpenMobile(true)}
        className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
      >
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>
      {icon && (
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      )}
      <div>
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
