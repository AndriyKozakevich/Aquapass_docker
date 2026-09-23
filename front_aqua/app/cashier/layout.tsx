import React from "react";
import StaffProfileHeader from "@/components/StaffProfileHeader";
import AppSidebar, { type SidebarItem } from "@/components/AppSidebar";

const cashierSidebarItems: SidebarItem[] = [
  { href: "/cashier/scanner", label: "Сканер", icon: "scanner" },
  { href: "/cashier/orders", label: "Дашборд", icon: "dashboard" },
];

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <StaffProfileHeader />

      <div className="flex flex-1 overflow-hidden">
        <AppSidebar title="Каса" items={cashierSidebarItems} />

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}