"use client";

import React from "react";
import { Sunbed } from "@/types/sunbeds";
import { SelectedSunbedItem } from "@/types/booking";

interface SunbedMapProps {
  sunbeds: Sunbed[];
  isLoading: boolean;
  selectedSunbeds: SelectedSunbedItem[];
  holdSecondsLeft: number | null;
  onToggleSunbed: (sunbed: Sunbed) => void;
}

export default function SunbedMap({ sunbeds, isLoading, selectedSunbeds, holdSecondsLeft, onToggleSunbed }: SunbedMapProps) {
  const sortedSunbeds = [...sunbeds].sort((a, b) => {
    if (a.row === b.row) return a.number - b.number;
    return (a.row || "").localeCompare(b.row || "");
  });

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">Схема шезлонгів</h2>
          <p className="text-xs text-slate-400">При виборі шезлонга автоматично додається оренда + вхідний квиток</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500" />Вільний</div>
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-sky-500 border border-sky-400" />Обрано</div>
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-rose-500/20 border border-rose-500" />Зайнятий</div>
        </div>
      </div>

      {holdSecondsLeft !== null && holdSecondsLeft > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-medium animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-base">⏳</span>
            <span>Шезлонг заброньовано за вами на час заповнення анкети:</span>
          </div>
          <span className="font-mono font-bold text-sm bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-lg text-amber-200">
            {Math.floor(holdSecondsLeft / 60)}:{(holdSecondsLeft % 60).toString().padStart(2, "0")}
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Оновлення карти...</div>
      ) : sortedSunbeds.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">Шезлонгів на цю дату не знайдено.</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {sortedSunbeds.map((s) => {
            const isSelected = selectedSunbeds.some((item) => item.sunbed.id === s.id);
            const isAvailable = s.isAvailable ?? true;
            let btnClass = "border-slate-800 bg-rose-950/20 text-rose-500 cursor-not-allowed opacity-50";
            
            if (isSelected) {
              btnClass = "border-sky-400 bg-sky-600 text-white shadow-lg shadow-sky-600/30 scale-105";
            } else if (isAvailable) {
              btnClass = "border-emerald-500/40 bg-emerald-950/20 text-emerald-300 hover:border-emerald-400 hover:scale-105";
            }

            return (
              <button
                key={s.id}
                type="button"
                disabled={!isAvailable && !isSelected}
                onClick={() => onToggleSunbed(s)}
                className={`border rounded-2xl p-3 flex flex-col items-center justify-between aspect-square transition ${btnClass}`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Ряд {s.row}</span>
                <span className="text-lg font-extrabold my-1">№{s.number}</span>
                <span className="text-[9px] font-medium">{isSelected ? "В кошику" : isAvailable ? "Вільний" : "Зайнятий"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}