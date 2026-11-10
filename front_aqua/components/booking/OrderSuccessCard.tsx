"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { OrderDetails } from "@/types/orders";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:5000/api";

interface Props {
  order: OrderDetails;
}

export default function OrderSuccessCard({ order }: Props) {
  const router = useRouter();

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-white">Оплата успішна!</h1>
        <p className="text-xs text-slate-400">
          Замовлення: <span className="font-mono text-sky-400 font-bold">{order.orderNumber}</span>
        </p>
        <p className="text-xs text-slate-400">
          Дата візиту: {order.visitDate.toLocaleDateString("uk-UA")}
        </p>
        <p className="text-xs text-slate-400">
          Квитки також надіслано на <span className="text-slate-200 font-medium">{order.customerEmail}</span>
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">Ваші квитки:</h2>
        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
          {order.tickets.map((t) => (
            <div key={t.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-slate-200 text-sm">
                  {t.tariffName}
                </div>
                {t.sunbedInfo && (
                  <div className="text-xs text-emerald-400 font-medium">
                     {t.sunbedInfo}
                  </div>
                )}
                <div className="text-xs text-slate-400">
                  Ціна: <span className="font-bold text-slate-200">{t.price} ₴</span>
                </div>
                {t.ticketCode && (
                  <div className="text-[11px] font-mono text-sky-400 truncate max-w-[200px]">
                    Код: {t.ticketCode}
                  </div>
                )}
              </div>

              {t.ticketCode && (
                <img
                  src={`${API_BASE}/Tickets/${t.ticketCode}/qr`}
                  alt={`QR-${t.ticketCode}`}
                  className="w-20 h-20 rounded-xl bg-white p-1 shadow-md shrink-0"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4 flex justify-between items-center text-sm">
        <span className="text-slate-400">Сплачено:</span>
        <span className="text-xl font-bold text-emerald-400">
          {order.totalAmount} ₴
        </span>
      </div>

      <button
        onClick={() => router.push("/booking")}
        className="w-full bg-sky-600 hover:bg-sky-500 text-white py-3 rounded-xl font-medium transition text-xs"
      >
        Оформити нове бронювання
      </button>
    </div>
  );
}