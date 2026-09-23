"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  Users,
  BedDouble,
  BadgeDollarSign,
  Mail,
  LayoutDashboard,
  ScanLine,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export type SidebarIconName =
  | "orders"
  | "staff"
  | "sunbeds"
  | "tariffs"
  | "test-email"
  | "dashboard"
  | "scanner";

export interface SidebarItem {
  href: string;
  label: string;
  icon?: SidebarIconName;
}

interface AppSidebarProps {
  title: string;
  items: SidebarItem[];
}

const sidebarIcons: Record<SidebarIconName, typeof BriefcaseBusiness> = {
  orders: BriefcaseBusiness,
  staff: Users,
  sunbeds: BedDouble,
  tariffs: BadgeDollarSign,
  "test-email": Mail,
  dashboard: LayoutDashboard,
  scanner: ScanLine,
};

export default function AppSidebar({ title, items }: AppSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={[
        "relative shrink-0 border-r border-slate-800 bg-slate-900/80 backdrop-blur-md transition-all duration-300",
        isCollapsed ? "w-20" : "w-64",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-4">
        {!isCollapsed && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Навігація</p>
            <h2 className="mt-2 text-lg font-bold text-white">{title}</h2>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-sky-500/40 hover:text-white"
          aria-label={isCollapsed ? "Розгорнути меню" : "Згорнути меню"}
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="space-y-2 p-3">
        {items.map(({ href, label, icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = icon ? sidebarIcons[icon] : null;

          return (
            <Link
              key={href}
              href={href}
              title={isCollapsed ? label : undefined}
              className={[
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isCollapsed ? "justify-center px-2" : "",
                isActive
                  ? "border-sky-500/40 bg-sky-500/10 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
                  : "border-transparent bg-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white",
              ].join(" ")}
            >
              {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
              {!isCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
