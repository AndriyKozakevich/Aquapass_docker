"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStaffToken, getStaffUser, clearStaffSession } from "@/lib/auth";

export default function StaffProfileHeader() {
  const router = useRouter();
  const [user, setUser] = useState<{ fullName: string; email: string; role: string } | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);

  useEffect(() => {
    const token = getStaffToken();
    const staff = getStaffUser();

    setHasToken(Boolean(token));
    setUser(staff);
  }, []);

  const handleLogout = () => {
    clearStaffSession();
    // Очищаємо cookies для middleware
    document.cookie = "staff_token=; path=/; max-age=0";
    document.cookie = "staff_role=; path=/; max-age=0";
    window.location.href = "/login";
  };

  return (
    <header className="w-full bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-6 py-3.5 flex items-center justify-between text-xs">
      <div className="flex items-center gap-3">
        <div className="font-bold text-sky-400 text-sm tracking-wide">
          AquaPass <span className="text-slate-500 font-normal">| Портал персоналу</span>
        </div>

        {/* Індикатор онлайн-статусу сесії */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-full text-[11px]">
          <span
            className={`w-2 h-2 rounded-full ${
              hasToken ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
            }`}
          />
          <span className="text-slate-400">
            {hasToken ? "Сесія активна" : "Не авторизовано"}
          </span>
        </div>
      </div>

      {user ? (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-semibold text-white">{user.fullName}</div>
            <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
              user.role === "Admin"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
            }`}
          >
            {user.role}
          </span>

          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 transition text-xs ml-2"
          >
            Вийти
          </button>
        </div>
      ) : (
        <button
          onClick={() => router.push("/login")}
          className="bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-1.5 rounded-xl transition text-xs font-semibold"
        >
          Увійти
        </button>
      )}
    </header>
  );
}