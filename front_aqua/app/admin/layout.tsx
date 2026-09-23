import React from "react";
import StaffProfileHeader from "@/components/StaffProfileHeader";
import AppSidebar, { type SidebarItem } from "@/components/AppSidebar";

const adminSidebarItems: SidebarItem[] = [
  { href: "/admin/orders", label: "Замовлення", icon: "orders" },
  { href: "/admin/staff", label: "Персонал", icon: "staff" },
  { href: "/admin/sunbeds", label: "Шезлонги", icon: "sunbeds" },
  { href: "/admin/tariffs", label: "Тарифи", icon: "tariffs" },
  { href: "/admin/test-email", label: "Тест email", icon: "test-email" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <StaffProfileHeader />

      <div className="flex flex-1 overflow-hidden">
        <AppSidebar title="Адміністратор" items={adminSidebarItems} />

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}