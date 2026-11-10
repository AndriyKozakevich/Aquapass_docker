"use client";

import React, { useState } from "react";
import { Order } from "@/types/orders";

interface OrderCardProps {
  order: Order;
  onOpenReceipt: () => void;
}

export default function OrderCard({ order, onOpenReceipt }: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const opDateStr = order.createdAt 
    ? order.createdAt.toLocaleString("uk-UA", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
      })
    : "—";

    const eventDateStr = order.visitDate ? order.visitDate.toLocaleDateString("uk-UA") : "—";

    const isWeekend = order.visitDate 
    ? order.visitDate.getDay() === 0 || order.visitDate.getDay() === 6
    : false;
  const tariffDayLabel = isWeekend ? "Вихідний" : "Будній";

  const displayedTickets = isExpanded ? order.tickets : order.tickets.slice(0, 2);
  const remainingCount = order.tickets.length - 2;

  let statusBorderColor = "bg-emerald-500";
  let badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

  if (order.presentation.type === "validated") {
    statusBorderColor = "bg-purple-500";
    badgeColor = "bg-purple-500/20 text-purple-400 border-purple-500/30";
  } else if (order.presentation.type === "cancelled") {
    statusBorderColor = "bg-slate-500";
    badgeColor = "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
  return (
    <div className="bg-slate-900 border border-slate-800/90 rounded-2xl overflow-hidden shadow-lg flex flex-col lg:flex-row items-stretch">
      {/* Ліва лінія статусу */}
      <div className={`w-full lg:w-2 shrink-0 h-1.5 lg:h-auto ${statusBorderColor}`} />

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80 items-stretch">
        
        {/* 1. Інформація про замовлення */}
        <div className="p-4 lg:col-span-3 space-y-2 flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-sky-400">
              № {order.orderNumber}
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-medium">
              {tariffDayLabel}
            </span>
          </div>

          <div className="text-xs space-y-1 text-slate-300">
            <div>
              <span className="text-slate-500 text-[11px]">Операція: </span>
              <span className="text-slate-300">{opDateStr}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Подія: </span>
              <span className="font-semibold text-white">{eventDateStr}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Квитків: </span>
              <span className="font-bold text-sky-300">{order.tickets.length} шт.</span>
            </div>
          </div>
        </div>

        {/* 2. Гість (Дані вже чисті, ніяких ||) */}
        <div className="p-4 lg:col-span-2 space-y-1.5 flex flex-col justify-center">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
            Гість
          </span>
          <div className="text-xs font-bold text-slate-100 truncate" title={order.customerFullName}>
            {order.customerFullName}
          </div>
          <div className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
            <span className="text-rose-400">📞</span>
            <span className="truncate">{order.customerPhone}</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate" title={order.customerEmail}>
            <span>✉️</span>
            <span className="truncate">{order.customerEmail}</span>
          </div>
        </div>

        {/* 3. Послуги та місця */}
        <div className="p-4 lg:col-span-4 space-y-2 flex flex-col justify-center">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Послуги та місця
          </div>

          {order.tickets.length === 0 ? (
            <div className="text-xs text-slate-500 italic">Послуг немає</div>
          ) : (
            <div className="space-y-1.5">
              {displayedTickets.map((t) => (
                <div key={t.id} className="bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800/80 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    {t.isBungalow ? (
                      <span className="text-amber-400 font-medium">🛖 Бунгало</span>
                    ) : t.sunbedInfo ? (
                      <span className="text-emerald-400 font-bold">🏖️ {t.sunbedInfo}</span>
                    ) : (
                      <span className="text-slate-200 font-medium">🎟️ {t.displayName}</span>
                    )}

                    {t.isChild && !t.displayName.includes("Дитячий") && (
                      <span className="text-amber-300 text-[11px] font-semibold shrink-0">
                        (Дитячий)
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-emerald-400 font-bold shrink-0">
                    {t.price} ₴
                  </span>
                </div>
              ))}

              {remainingCount > 0 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-medium transition pt-1 flex items-center gap-1"
                >
                  {isExpanded ? "Згорнути список" : `Розгорнути ще +${remainingCount} позиції`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 4. Сума */}
        <div className="p-4 lg:col-span-1 flex flex-col justify-center items-start lg:items-center">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider">Сума</span>
          <span className="text-lg font-black text-emerald-400 mt-0.5">
            {order.totalAmount.toLocaleString("uk-UA")} ₴
          </span>
        </div>

        {/* 5. Статус */}
        <div className="p-4 lg:col-span-1 flex flex-col justify-center items-start lg:items-center">
          <span className={`text-[11px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider text-center ${badgeColor}`}>
            {order.presentation.label}
          </span>
        </div>

        {/* 6. Кнопка чека */}
        <div className="p-4 lg:col-span-1 flex items-center justify-center">
          <button
            onClick={onOpenReceipt} // Викликаємо делегат, переданий зверху!
            className="w-full bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white px-2.5 py-2.5 rounded-xl text-xs font-semibold transition border border-slate-700 hover:border-sky-500 shadow-sm text-center"
          >
            🧾 Чек
          </button>
        </div>
      </div>
    </div>
  );
}