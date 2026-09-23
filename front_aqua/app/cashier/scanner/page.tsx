"use client";

import React, { useState, useRef, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface TicketScanItem {
  id: string;
  ticketCode: string;
  tariffName: string;
  sunbedInfo?: string | null;
  price: number;
  status: "Created" | "Used" | string;
}

interface OrderData {
  orderId: string;
  orderNumber: string;
  visitDate: string;
  guestName: string;
  customerPhone: string;
  customerEmail: string;
  orderStatus: string;
  tickets: TicketScanItem[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:5000/api";

export default function ScannerPage() {
  const [ticketCodeInput, setTicketCodeInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [currentOrder, setCurrentOrder] = useState<OrderData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  // 1. Пошук ордера за QR-кодом (без зміни статусу квитка)
  const fetchOrderByCode = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    setActionSuccessMessage(null);

    try {
      const res = await fetch(`${API_BASE}/Tickets/by-code/${cleanCode}/order`);
      const data = await res.json();

      if (res.ok) {
        setCurrentOrder(data);
      } else {
        setErrorMessage(data.message || "Квиток або замовлення не знайдено");
      }
    } catch (err) {
      setErrorMessage("Помилка зв'язку з бекендом");
    } finally {
      setIsLoading(false);
      setTicketCodeInput("");
      setTimeout(() => {
        isFetchingRef.current = false;
      }, 1500);
      inputRef.current?.focus();
    }
  };

  // 2. Валідація ОДНОГО конкретного квитка
  const handleValidateSingle = async (ticketCode: string) => {
    setIsLoading(true);
    setActionSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE}/Tickets/${ticketCode}/validate`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        setActionSuccessMessage(`Квиток ${ticketCode} успішно валідовано!`);
        // Оновлюємо статус локально в стейті
        setCurrentOrder((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            tickets: prev.tickets.map((t) =>
              t.ticketCode === ticketCode ? { ...t, status: "Used" } : t
            ),
          };
        });
      } else {
        setErrorMessage(data.message || "Помилка валідації квитка");
      }
    } catch (err) {
      setErrorMessage("Не вдалося валідувати квиток");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Валідація ВСІХ квитків замовлення
  const handleValidateAll = async () => {
    if (!currentOrder) return;

    setIsLoading(true);
    setActionSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE}/Tickets/orders/${currentOrder.orderId}/validate-all`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        setActionSuccessMessage(data.message || "Усі квитки успішно валідовано!");
        setCurrentOrder((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            tickets: prev.tickets.map((t) => ({ ...t, status: "Used" })),
          };
        });
      } else {
        setErrorMessage(data.message || "Не вдалося валідувати всі квитки");
      }
    } catch (err) {
      setErrorMessage("Помилка під час групової валідації");
    } finally {
      setIsLoading(false);
    }
  };

  // Керування камерою
  useEffect(() => {
    if (isCameraActive) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          fetchOrderByCode(decodedText);
        },
        () => {}
      );

      scannerRef.current = scanner;
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [isCameraActive]);

  const pendingCount = currentOrder?.tickets.filter((t) => t.status !== "Used").length || 0;
  const usedCount = currentOrder?.tickets.filter((t) => t.status === "Used").length || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Хедер */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 border border-slate-800 p-5 rounded-3xl gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-sky-400">
              Каса / Пропускний пункт
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Скануйте будь-який квиток для завантаження всього замовлення
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCameraActive((prev) => !prev)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
              isCameraActive
                ? "bg-rose-950 border-rose-800 text-rose-300 hover:bg-rose-900"
                : "bg-sky-950 border-sky-800 text-sky-300 hover:bg-sky-900"
            }`}
          >
            {isCameraActive ? "⏹️ Вимкнути камеру" : "📷 Увімкнути камеру"}
          </button>
        </div>

        {/* Вікно камери */}
        {isCameraActive && (
          <div className="bg-slate-900 border-2 border-sky-500/50 rounded-3xl p-4 flex flex-col items-center">
            <div className="w-full max-w-sm">
              <div id="reader" className="w-full rounded-2xl overflow-hidden bg-black text-slate-800" />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Наведіть камеру на QR-код
            </p>
          </div>
        )}

        {/* Введення коду / Сканер */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchOrderByCode(ticketCodeInput);
          }}
          className="flex gap-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={ticketCodeInput}
            onChange={(e) => setTicketCodeInput(e.target.value)}
            placeholder="Введіть код квитка або відскануйте сканером..."
            disabled={isLoading}
            className="flex-1 bg-slate-900 border-2 border-slate-800 focus:border-sky-500 text-white rounded-2xl px-5 py-3.5 text-sm md:text-base font-mono placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !ticketCodeInput.trim()}
            className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white px-6 py-3.5 rounded-2xl font-bold text-sm transition shrink-0"
          >
            {isLoading ? "Пошук..." : "Знайти ордер"}
          </button>
        </form>

        {/* Сповіщення */}
        {errorMessage && (
          <div className="bg-rose-950/50 border border-rose-600/60 p-4 rounded-2xl text-rose-300 text-sm font-semibold flex items-center justify-between animate-in fade-in">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {actionSuccessMessage && (
          <div className="bg-emerald-950/50 border border-emerald-600/60 p-4 rounded-2xl text-emerald-300 text-sm font-semibold flex items-center justify-between animate-in fade-in">
            <span>✓ {actionSuccessMessage}</span>
            <button onClick={() => setActionSuccessMessage(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Завантажене замовлення з можливістю валідації */}
        {currentOrder && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl animate-in fade-in">
            
            {/* Інфо шапка */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-sky-400">
                    № {currentOrder.orderNumber}
                  </span>
                  <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-full text-slate-300 font-semibold">
                    Дата візиту: {new Date(currentOrder.visitDate).toLocaleDateString("uk-UA")}
                  </span>
                </div>
                <div className="text-sm font-semibold text-white mt-1">
                  Гість: {currentOrder.guestName}
                </div>
                <div className="text-xs text-slate-400">
                  📞 {currentOrder.customerPhone} • ✉️ {currentOrder.customerEmail}
                </div>
              </div>

              {/* Кнопка "Валідувати всі" */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isLoading || pendingCount === 0}
                  onClick={handleValidateAll}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-5 py-3 rounded-2xl font-bold text-xs md:text-sm transition shadow-lg shadow-emerald-600/20"
                >
                  {pendingCount === 0 ? "Усі квитки валідовано" : `✓ Валідувати всі (${pendingCount})`}
                </button>
              </div>
            </div>

            {/* Статистика по групі */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Всього у групі:</span>
                <span className="text-base font-bold text-white">{currentOrder.tickets.length} квитків</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Очікують проходу:</span>
                <span className="text-base font-bold text-amber-400">{pendingCount} шт.</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-500 block">Вже зайшли:</span>
                <span className="text-base font-bold text-emerald-400">{usedCount} шт.</span>
              </div>
            </div>

            {/* Список квитків замовлення */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Склад квитків у замовленні:
              </h3>

              <div className="space-y-2">
                {currentOrder.tickets.map((t) => {
                  const isUsed = t.status === "Used";

                  return (
                    <div
                      key={t.ticketCode}
                      className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isUsed
                          ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {t.tariffName}
                          </span>
                          {t.sunbedInfo && (
                            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs px-2 py-0.5 rounded-md font-bold">
                              🏖️ {t.sunbedInfo}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-slate-500">
                          Код: {t.ticketCode}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                            isUsed
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {isUsed ? "Валідовано" : "Активний"}
                        </span>

                        {!isUsed && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleValidateSingle(t.ticketCode)}
                            className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition"
                          >
                            Валідувати
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setCurrentOrder(null)}
                className="text-xs text-slate-500 hover:text-slate-300 underline"
              >
                Очистити та сканувати наступного гостя
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}