"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { BookingService } from "@/lib/api/bookingService";
import { useSunbedHub } from "@/hooks/useSunbedHub";

import { Sunbed } from "@/types/sunbeds";
import { Tariff } from "@/types/tariffs";
import { SelectedSunbedItem, ExtraItem } from "@/types/booking";

import BookingCart from "@/components/booking/BookingCart";
import SunbedMap from "@/components/booking/SunbedMap";
import OrderSuccessCard from "@/components/booking/OrderSuccessCard"; // Виправили імпорт

function getOrCreateHoldToken(): string {
  if (typeof window === "undefined") return "";
  let token = sessionStorage.getItem("aquapass_hold_token");
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem("aquapass_hold_token", token);
  }
  return token;
}

export default function BookingPage() {
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString().split("T")[0]);
  
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [sunbeds, setSunbeds] = useState<Sunbed[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedSunbeds, setSelectedSunbeds] = useState<SelectedSunbedItem[]>([]);
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  const holdToken = getOrCreateHoldToken();
  const holdTokenRef = useRef<string>(holdToken);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number | null>(null);

  useSunbedHub(visitDate, holdTokenRef, setSunbeds);

  useEffect(() => {
    BookingService.getTariffs().then(setTariffs).catch(console.error);
  }, []);

  const loadSunbeds = async (date: string) => {
    setIsLoading(true);
    try {
      const data = await BookingService.getSunbeds(date, holdToken);
      setSunbeds(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSunbeds(visitDate);
  }, [visitDate, holdToken]);

  // Обчислення тарифів
  const currentDayType = useMemo(() => {
    const day = new Date(visitDate).getDay();
    return day === 0 || day === 6 ? "Weekend" : "Weekday";
  }, [visitDate]);

  const activeTariffs = useMemo(() => tariffs.filter((t) => t.dayType === currentDayType), [tariffs, currentDayType]);
  const adultTariff = activeTariffs.find((t) => t.serviceType === "EntranceTicketAdult");
  const childTariff = activeTariffs.find((t) => t.serviceType === "EntranceTicketChild");
  const sunbedTariff = activeTariffs.find((t) => t.serviceType === "Sunbed");

  const totalAmount = useMemo(() => {
    let sum = 0;
    selectedSunbeds.forEach((item) => {
      sum += (sunbedTariff?.price || 0) + (item.isChild ? (childTariff?.price || 0) : (adultTariff?.price || 0));
    });
    extraItems.forEach((extra) => {
      // Тепер тут чисте порівняння рядків
      const t = activeTariffs.find((tariff) => tariff.id === extra.tariffId);
      if (t) sum += t.price * extra.quantity;
    });
    return sum;
  }, [selectedSunbeds, extraItems, sunbedTariff, adultTariff, childTariff, activeTariffs]);

  // ================= ФУНКЦІЇ УПРАВЛІННЯ КОШИКОМ ТА КАРТОЮ ================= //

  const toggleSunbed = async (sunbed: Sunbed) => {
    const exists = selectedSunbeds.some((item) => item.sunbed.id === sunbed.id);

    if (!exists && !sunbed.isAvailable) return;

    if (exists) {
      try {
        await BookingService.releaseSunbed(sunbed.id, visitDate, holdToken);
      } catch (err) {
        console.error("Помилка release-hold:", err);
      }
      const updated = selectedSunbeds.filter((item) => item.sunbed.id !== sunbed.id);
      setSelectedSunbeds(updated);
      if (updated.length === 0) setHoldSecondsLeft(null);
    } else {
      try {
        await BookingService.holdSunbed(sunbed.id, visitDate, holdToken);
        setSelectedSunbeds((prev) => [...prev, { sunbed, isChild: false }]);
        setHoldSecondsLeft(300);
      } catch (err: any) {
        alert(err.message || "Цей шезлонг щойно обрав інший користувач!");
        loadSunbeds(visitDate);
      }
    }
  };

  const toggleTicketType = (sunbedId: string) => {
    setSelectedSunbeds((prev) =>
      prev.map((item) => item.sunbed.id === sunbedId ? { ...item, isChild: !item.isChild } : item)
    );
  };

  const addExtra = (tariffId: string) => {
    setExtraItems((prev) => {
      // tariffId у нас приходить як string з UI, але в інтерфейсі ExtraItem ми домовилися про number. 
      // Приводимо до числа, щоб не було конфліктів типів.
      const numTariffId = Number(tariffId);
      const existing = prev.find((e) => e.tariffId === numTariffId);
      if (existing) {
        return prev.map((e) => e.tariffId === numTariffId ? { ...e, quantity: e.quantity + 1 } : e);
      }
      return [...prev, { tariffId: numTariffId, quantity: 1 }];
    });
  };

  const removeExtra = (tariffId: string) => {
    const numTariffId = Number(tariffId);
    setExtraItems((prev) =>
      prev.map((e) => (e.tariffId === numTariffId ? { ...e, quantity: e.quantity - 1 } : e)).filter((e) => e.quantity > 0)
    );
  };

  // ========================================================================= //

  const handleCheckout = async (formData: any) => {
    if (!sunbedTariff || !adultTariff) return alert("Тарифи ще завантажуються.");
    setIsSubmitting(true);

    const items = [
      ...selectedSunbeds.map(item => ({
        tariffId: item.isChild ? childTariff!.id : adultTariff!.id,
        quantity: 1,
        sunbedId: item.sunbed.id,
      })),
      ...extraItems
    ];

    try {
      const order = await BookingService.createOrder({
        visitDate: new Date(visitDate).toISOString(),
        ...formData,
        items,
        holdToken,
      });

      setHoldSecondsLeft(null);

      if (formData.paymentMethod === "Monobank") {
        const paymentUrl = await BookingService.createMonobankCheckout(order.id);
        if (paymentUrl) {
          window.location.href = paymentUrl;
          return;
        }
      }
      setCreatedOrder(order);
    } catch (err: any) {
      alert(err.message || "Помилка при створенні замовлення");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Відображення успіху (компонент сам має кнопку "Повернутися до бронювання" через Next.js Router)
  if (createdOrder) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center font-sans">
        <OrderSuccessCard order={createdOrder} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-slate-900/90 border border-slate-800 p-6 rounded-3xl">
          <div>
            <h1 className="text-2xl font-bold text-sky-400">Бронювання</h1>
          </div>
          <input
            type="date" value={visitDate} min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setVisitDate(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2 text-sm focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SunbedMap 
              sunbeds={sunbeds} 
              isLoading={isLoading} 
              selectedSunbeds={selectedSunbeds}
              holdSecondsLeft={holdSecondsLeft}
              onToggleSunbed={toggleSunbed} 
            />
          </div>

          <BookingCart 
            selectedSunbeds={selectedSunbeds}
            extraItems={extraItems}
            activeTariffs={activeTariffs}
            adultTariff={adultTariff}
            childTariff={childTariff}
            sunbedTariff={sunbedTariff}
            totalAmount={totalAmount}
            isSubmitting={isSubmitting}
            onToggleSunbed={toggleSunbed} 
            onToggleTicketType={toggleTicketType}
            onAddExtra={addExtra}
            onRemoveExtra={removeExtra}
            onSubmit={handleCheckout}
          />
        </div>
      </div>
    </div>
  );
}