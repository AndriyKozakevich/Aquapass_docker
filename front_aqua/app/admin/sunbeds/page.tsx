"use client";

import React, { useState, useEffect } from "react";
import { Sunbed, CreateSingleSunbedDto, CreateRangeSunbedDto } from "@/types/sunbeds";
import { SunbedService } from "@/lib/api/sunbedService";

import CreateSingleForm from "@/components/sunbeds/CreateSingleForm";
import CreateRangeForm from "@/components/sunbeds/CreateRangeForm";
import SunbedGrid from "@/components/sunbeds/SunbedGrid";

export default function AdminSunbedsPage() {
  const [sunbeds, setSunbeds] = useState<Sunbed[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [viewDate, setViewDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isStatusMode, setIsStatusMode] = useState<boolean>(false);

  const loadSunbeds = async () => {
    setIsLoading(true);
    setIsStatusMode(false);
    try {
      const data = await SunbedService.getAll();
      setSunbeds(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSunbedsByDate = async () => {
    if (!viewDate) return;
    setIsLoading(true);
    setIsStatusMode(true);
    try {
      const data = await SunbedService.getByDate(viewDate);
      setSunbeds(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSunbeds();
  }, []);

  const refreshData = () => isStatusMode ? loadSunbedsByDate() : loadSunbeds();

  const handleCreateSingle = async (dto: CreateSingleSunbedDto) => {
    try {
      await SunbedService.createSingle(dto);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateRange = async (dto: CreateRangeSunbedDto) => {
    try {
      await SunbedService.createRange(dto);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Видалити цей шезлонг?")) return;
    try {
      await SunbedService.delete(id);
      setSunbeds((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Хедер */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Адміністрування шезлонгів</h1>
            <p className="text-sm text-gray-600">Створення структури шезлонгів та перегляд статусу зайнятості</p>
          </div>
          <button onClick={loadSunbeds} className="self-start sm:self-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm transition">
            🔄 Всі шезлонги (базовий список)
          </button>
        </div>

        {/* Форми */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CreateSingleForm onSubmit={handleCreateSingle} />
          <CreateRangeForm onSubmit={handleCreateRange} /> {/* Припускаємо, що ти створив цей компонент за аналогією */}
        </div>

        {/* Панель дати */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Статус на дату:</span>
            <input type="date" value={viewDate} onChange={(e) => setViewDate(e.target.value)} className="bg-white border border-gray-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            <button onClick={loadSunbedsByDate} className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition">
              Завантажити зайнятість
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-500" />Вільний</div>
            <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-500" />Зайнятий</div>
          </div>
        </div>

        {/* Сітка шезлонгів */}
        <SunbedGrid 
          sunbeds={sunbeds} 
          isLoading={isLoading} 
          isStatusMode={isStatusMode} 
          viewDate={viewDate} 
          onDelete={handleDelete} 
        />

      </div>
    </div>
  );
}