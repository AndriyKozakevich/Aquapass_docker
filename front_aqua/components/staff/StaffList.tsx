"use client";

import React from "react";
import { StaffMember } from "@/types/staff";

interface StaffListProps {
  staffList: StaffMember[];
  isLoading: boolean;
  onDelete: (id: string, name: string) => void; // Делегат для видалення
}

export default function StaffList({ staffList, isLoading, onDelete }: StaffListProps) {
  return (
    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
      <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
        Штат співробітників ({staffList.length})
      </h2>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500 text-xs">Завантаження списку...</div>
      ) : staffList.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs">Працівників не знайдено.</div>
      ) : (
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {staffList.map((member) => (
            <div
              key={member.id}
              className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">
                    {member.fullName}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      member.role === "Admin"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    }`}
                  >
                    {member.role === "Admin" ? "Адміністратор" : "Касир"}
                  </span>
                </div>
                {/* Виправлено злипання тексту */}
                <div className="text-slate-400 font-mono text-[11px] flex items-center gap-2">
                  <span>✉️ {member.email}</span>
                  <span className="text-slate-600">|</span>
                  <span>Додано: {member.createdAt.toLocaleDateString("uk-UA")}</span>
                </div>
              </div>

              <button
                onClick={() => onDelete(member.id, member.fullName)}
                className="text-slate-500 hover:text-rose-400 text-xs p-2 rounded-lg hover:bg-slate-900 transition"
                title="Видалити співробітника"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}