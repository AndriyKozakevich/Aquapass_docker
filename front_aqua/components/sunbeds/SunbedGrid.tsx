"use client";

import React, { useMemo } from "react";
import { Sunbed } from "@/types/sunbeds";

interface Props {
  sunbeds: Sunbed[];
  isLoading: boolean;
  isStatusMode: boolean;
  viewDate: string;
  onDelete: (id: string) => void;
}

export default function SunbedGrid({ sunbeds, isLoading, isStatusMode, viewDate, onDelete }: Props) {
  const sortedSunbeds = useMemo(() => {
    return [...sunbeds].sort((a, b) => {
      if (a.row === b.row) return a.number - b.number;
      return (a.row || "").localeCompare(b.row || "");
    });
  }, [sunbeds]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Карта шезлонгів ({sortedSunbeds.length})
        </h2>
        {isStatusMode && (
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md">
            Режим перегляду дати: {viewDate}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Завантаження...</div>
      ) : sortedSunbeds.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">Шезлонгів не знайдено.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
          {sortedSunbeds.map((s) => {
            const isAvailable = s.isAvailable ?? true;
            const statusStyle = isStatusMode
              ? isAvailable
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-rose-500 bg-rose-50 text-rose-600"
              : "border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400";

            return (
              <div key={s.id} className={`border rounded-xl p-3 flex flex-col items-center justify-between relative group transition ${statusStyle}`}>
                <div className="text-[10px] uppercase font-bold text-gray-500">Ряд {s.row || "-"}</div>
                <div className="text-xl font-extrabold my-1">№{s.number}</div>
                {isStatusMode && (
                  <div className="text-[10px] font-medium">{isAvailable ? "Вільний" : "Зайнятий"}</div>
                )}
                <button
                  onClick={() => onDelete(s.id)}
                  title="Видалити"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center shadow"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}