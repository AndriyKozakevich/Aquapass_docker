"use client";

import React, { useState, useEffect } from "react";

interface Sunbed {
  id: string;
  number: number;
  row: string;
  zoneId?: string;
  description?: string;
  isAvailable?: boolean;
}

// Статичний GUID стандартної зони з AppDbContext Seed Data
const DEFAULT_ZONE_ID = "22222222-2222-2222-2222-222222222222";
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/Sunbed`
  : "http://localhost:5000/api/Sunbed";

export default function AdminSunbedsPage() {
  const [sunbeds, setSunbeds] = useState<Sunbed[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [viewDate, setViewDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isStatusMode, setIsStatusMode] = useState<boolean>(false);

  // Стан для форми одиночного шезлонга
  const [singleRow, setSingleRow] = useState<string>("");
  const [singleNumber, setSingleNumber] = useState<string>("");

  // Стан для форми ряду
  const [rangeRow, setRangeRow] = useState<string>("");
  const [rangeCount, setRangeCount] = useState<string>("");

  // Завантажити всі шезлонги
  const loadSunbeds = async () => {
    setIsLoading(true);
    setIsStatusMode(false);
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(`Помилка ${res.status}`);
      const data: Sunbed[] = await res.json();
      setSunbeds(data);
    } catch (err) {
      console.error(err);
      alert("Не вдалося завантажити список шезлонгів.");
    } finally {
      setIsLoading(false);
    }
  };

  // Завантажити доступність на обрану дату
  const loadSunbedsByDate = async () => {
    if (!viewDate) return;
    setIsLoading(true);
    setIsStatusMode(true);
    try {
      const res = await fetch(`${API_BASE}/available?visitDate=${viewDate}`);
      if (!res.ok) throw new Error(`Помилка ${res.status}`);
      const data: Sunbed[] = await res.json();
      setSunbeds(data);
    } catch (err) {
      console.error(err);
      alert("Не вдалося отримати статус шезлонгів на цю дату.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSunbeds();
  }, []);

  // Створити один шезлонг
  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleRow || !singleNumber) return;

    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          row: singleRow.trim().toUpperCase(),
          number: parseInt(singleNumber, 10),
          zoneId: DEFAULT_ZONE_ID,
          price: 0,
          isAvailable: true,
        }),
      });

      if (res.ok) {
        setSingleNumber("");
        isStatusMode ? loadSunbedsByDate() : loadSunbeds();
      } else {
        let errorMessage = "Помилка при створенні";
        try {
          const text = await res.text();
          if (text) {
            const err = JSON.parse(text);
            errorMessage = err.message || text;
          } else {
            errorMessage = `Помилка сервера: статус ${res.status}`;
          }
        } catch {
          errorMessage = `Помилка сервера: статус ${res.status}`;
        }
        alert(errorMessage);
      }
    } catch (err) {
      console.error(err);
      alert("Не вдалося відправити запит до сервера.");
    }
  };

  // Створити діапазон
  const handleCreateRange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rangeRow || !rangeCount) return;

    try {
      const rowParam = encodeURIComponent(rangeRow.trim().toUpperCase());
      const countParam = parseInt(rangeCount, 10);

      const res = await fetch(
        `${API_BASE}/range?row=${rowParam}&count=${countParam}`,
        {
          method: "POST",
        }
      );

      if (res.ok) {
        setRangeRow("");
        setRangeCount("");
        isStatusMode ? loadSunbedsByDate() : loadSunbeds();
      } else {
        const text = await res.text();
        alert(text || "Помилка при генерації ряду шезлонгів");
      }
    } catch (err) {
      console.error(err);
      alert("Не вдалося згенерувати ряд");
    }
  };

  // Видалити шезлонг
  const handleDelete = async (id: string) => {
    if (!confirm("Видалити цей шезлонг?")) return;

    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSunbeds((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert("Помилка під час видалення");
      }
    } catch (err) {
      console.error(err);
      alert("Не вдалося видалити шезлонг");
    }
  };

  // Сортування перед рендером
  const sortedSunbeds = [...sunbeds].sort((a, b) => {
    if (a.row === b.row) return a.number - b.number;
    return (a.row || "").localeCompare(b.row || "");
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              Адміністрування шезлонгів
            </h1>
            <p className="text-sm text-gray-600">
              Створення структури шезлонгів та перегляд статусу зайнятості
            </p>
          </div>
          <button
            onClick={loadSunbeds}
            className="self-start sm:self-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm transition"
          >
            🔄 Всі шезлонги (базовий список)
          </button>
        </div>

        {/* Форми додавання */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Створити один */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-sm">
            <h2 className="text-base font-semibold text-blue-600">
              Додати один шезлонг
            </h2>
            <form onSubmit={handleCreateSingle} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">
                    Ряд (Row)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Наприклад: A"
                    value={singleRow}
                    onChange={(e) => setSingleRow(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">
                    Номер (Number)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="1"
                    value={singleNumber}
                    onChange={(e) => setSingleNumber(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-sm font-medium transition"
              >
                Створити шезлонг
              </button>
            </form>
          </div>

          {/* Створити ряд */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-sm">
            <h2 className="text-base font-semibold text-emerald-700">
              Створити цілий ряд
            </h2>
            <form onSubmit={handleCreateRange} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">
                    Ряд
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="B"
                    value={rangeRow}
                    onChange={(e) => setRangeRow(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm uppercase focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">
                    К-сть
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    placeholder="10"
                    value={rangeCount}
                    onChange={(e) => setRangeCount(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition"
              >
                Згенерувати ряд
              </button>
            </form>
          </div>
        </div>

        {/* Панель перевірки дати */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              Статус на дату:
            </span>
            <input
              type="date"
              value={viewDate}
              onChange={(e) => setViewDate(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={loadSunbedsByDate}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition"
            >
              Завантажити зайнятість
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-500" />
              Вільний
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-500" />
              Зайнятий
            </div>
          </div>
        </div>

        {/* Сітка шезлонгів */}
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
            <div className="text-center py-12 text-gray-400 text-sm">
              Завантаження...
            </div>
          ) : sortedSunbeds.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              Шезлонгів не знайдено.
            </div>
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
                  <div
                    key={s.id}
                    className={`border rounded-xl p-3 flex flex-col items-center justify-between relative group transition ${statusStyle}`}
                  >
                    <div className="text-[10px] uppercase font-bold text-gray-500">
                      Ряд {s.row || "-"}
                    </div>
                    <div className="text-xl font-extrabold my-1">
                      №{s.number}
                    </div>

                    {isStatusMode && (
                      <div className="text-[10px] font-medium">
                        {isAvailable ? "Вільний" : "Зайнятий"}
                      </div>
                    )}

                    <button
                      onClick={() => handleDelete(s.id)}
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

      </div>
    </div>
  );
}