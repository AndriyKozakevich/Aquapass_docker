"use client";

import React, { useState } from "react";
import { SelectedSunbedItem, ExtraItem } from "@/types/booking";
import { Tariff } from "@/types/tariffs";
import { Sunbed } from "@/types/sunbeds";

interface BookingCartProps {
  selectedSunbeds: SelectedSunbedItem[];
  extraItems: ExtraItem[];
  activeTariffs: Tariff[];
  adultTariff?: Tariff;
  childTariff?: Tariff;
  sunbedTariff?: Tariff;
  totalAmount: number;
  isSubmitting: boolean;
  onToggleSunbed: (sunbed: Sunbed) => void;
  onToggleTicketType: (sunbedId: string) => void;
  onAddExtra: (tariffId: string) => void;
  onRemoveExtra: (tariffId: string) => void;
  onSubmit: (formData: any) => void;
}

export default function BookingCart(props: BookingCartProps) {
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Monobank" | "Cashier">("Monobank");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    props.onSubmit({
      customerFirstName,
      customerLastName,
      customerEmail,
      customerPhone,
      paymentMethod,
    });
  };

  const hasItems = props.selectedSunbeds.length > 0 || props.extraItems.length > 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl sticky top-6 space-y-5">
      <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Деталі замовлення</h2>

      {!hasItems ? (
        <div className="text-center py-8 text-slate-500 text-xs">
          Оберіть шезлонг або додайте послугу, щоб продовжити.
        </div>
      ) : (
        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
          {/* Рендер обраних шезлонгів */}
          {props.selectedSunbeds.map((item) => {
            const entrancePrice = (item.isChild ? props.childTariff?.price : props.adultTariff?.price) || 0;
            const sunbedPrice = props.sunbedTariff?.price || 0;

            return (
              <div key={item.sunbed.id} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold text-sky-400">
                      Шезлонг №{item.sunbed.number} (Ряд {item.sunbed.row})
                    </div>
                    <div className="text-[11px] text-slate-400">Оренда: {sunbedPrice} ₴</div>
                  </div>
                  <button onClick={() => props.onToggleSunbed(item.sunbed)} className="...">✕</button>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px]">Вхідний квиток:</div>
                    <div className="font-bold text-emerald-400 text-[11px]">
                      {item.isChild ? "Дитячий" : "Дорослий"} (+{entrancePrice} ₴)
                    </div>
                  </div>
                  <button onClick={() => props.onToggleTicketType(item.sunbed.id)} className="bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] px-2.5 py-1 rounded-lg transition">
                    Змінити на {item.isChild ? "Дорослий" : "Дитячий"}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Рендер додаткових послуг */}
          {props.extraItems.map((extra) => {
            const t = props.activeTariffs.find((tariff) => tariff.id === extra.tariffId);
            if (!t) return null;
            return (
              <div key={extra.tariffId} className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 flex justify-between items-center text-xs">
                <div>
                  <div className="font-semibold text-slate-200">{t.name}</div>
                  <div className="text-slate-400 text-[11px]">{t.price} ₴ × {extra.quantity}</div>
                </div>
                <div className="font-bold text-sky-400">{t.price * extra.quantity} ₴</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
        <span className="text-slate-400 text-xs">Загальна сума:</span>
        <span className="text-xl font-black text-emerald-400">{props.totalAmount} ₴</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 pt-1">
        {/* Форма вводу контактних даних */}
        <div className="grid grid-cols-2 gap-2">
          <input type="text" required placeholder="Ім'я" value={customerFirstName} onChange={(e) => setCustomerFirstName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-sky-500 focus:outline-none" />
          <input type="text" required placeholder="Прізвище" value={customerLastName} onChange={(e) => setCustomerLastName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-sky-500 focus:outline-none" />
        </div>
        <input type="email" required placeholder="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-sky-500 focus:outline-none" />
        <input type="tel" required placeholder="Телефон" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-sky-500 focus:outline-none" />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" onClick={() => setPaymentMethod("Monobank")} className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${paymentMethod === "Monobank" ? "bg-slate-800 border-sky-400 text-sky-400" : "bg-slate-950 border-slate-800 text-slate-400"}`}>
            💳 Monobank
          </button>
          <button type="button" disabled className="p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed">
            💵 На вході
          </button>
        </div>

        <button type="submit" disabled={props.isSubmitting || !hasItems} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-xs transition">
          {props.isSubmitting ? "Обробка..." : paymentMethod === "Monobank" ? `Оплатити ${props.totalAmount} ₴` : `Забронювати`}
        </button>
      </form>
    </div>
  );
}