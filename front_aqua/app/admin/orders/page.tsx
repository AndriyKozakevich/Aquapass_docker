"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getStaffToken, clearStaffSession } from "@/lib/auth";

// Імпортуємо наші чисті типи, маппер та нові компоненти
import { Order } from "@/types/orders";
import { mapBackendOrderToFrontend } from "@/lib/mappers";
import OrderCard from "@/components/orders/Ordercard";
import ReceiptModal from "@/components/orders/ReceiptModal";

type FilterType = "all" | "active" | "validated";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:5000/api";

  export default function OrdersDashboardPage() {
  const router = useRouter();
  const todayStr = new Date().toISOString().split("T")[0];

  // Стейт фільтрів та даних
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Стейт для модального вікна (яке саме замовлення зараз відкрито для чека)
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const token = getStaffToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(
        `${API_BASE}/Orders/period?from=${fromDate}&to=${toDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.ok) {
        const rawData = await res.json();
        // Пропускаємо брудний JSON через наш Anti-Corruption Layer
        const cleanOrders = rawData.map(mapBackendOrderToFrontend);
        setOrders(cleanOrders);
      } else if (res.status === 401 || res.status === 403) {
        clearStaffSession();
        router.push("/login");
      } else {
        console.error("Не вдалося завантажити замовлення", res.status);
      }
    } catch (err) {
      console.error("Помилка зв'язку з бекендом", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fromDate, toDate]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        // Фільтр по табах (використовуємо вже очищений presentation.type)
        if (activeFilter === "active" && (o.presentation.type === "cancelled" || o.presentation.type === "validated")) return false;
        if (activeFilter === "validated" && o.presentation.type !== "validated") return false;

        // Пошук по тексту (тепер поля завжди є, ніяких ||)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            o.orderNumber.toLowerCase().includes(q) ||
            o.customerFullName.toLowerCase().includes(q) ||
            o.customerEmail.toLowerCase().includes(q) ||
            o.customerPhone.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        // Сортування (Fallback на 0, якщо дати немає)
        const dateA = a.createdAt?.getTime() || a.visitDate?.getTime() || 0;
        const dateB = b.createdAt?.getTime() || b.visitDate?.getTime() || 0;
        return dateB - dateA;
      });
  }, [orders, activeFilter, searchQuery]);

  // 3. Агрегація статистики
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let validatedTicketsCount = 0;
    let activeOrdersCount = 0;

    orders.forEach((o) => {
      if (o.presentation.type !== "cancelled") {
        totalRevenue += o.totalAmount;
        activeOrdersCount++;
      }
      o.tickets.forEach((t) => {
        if (t.status === "Used") validatedTicketsCount++;
      });
    });

    return { totalRevenue, validatedTicketsCount, activeOrdersCount };
  }, [orders]);

  // 4. Представлення (Рендер)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Хедер (залишився без змін, просто верстка) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900/90 border border-slate-800 p-6 rounded-3xl gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-sky-400">Дашборд замовлень</h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Управління проходом, деталізація послуг та друк чеків
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">З:</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent text-white text-xs focus:outline-none" />
            </div>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">По:</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-transparent text-white text-xs focus:outline-none" />
            </div>
            <button onClick={fetchOrders} className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition">
              Оновити
            </button>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs text-slate-400 font-medium">Активних замовлень</span>
            <div className="text-2xl font-black text-sky-400 mt-1">{stats.activeOrdersCount}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs text-slate-400 font-medium">Валідованих квитків</span>
            <div className="text-2xl font-black text-purple-400 mt-1">{stats.validatedTicketsCount}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs text-slate-400 font-medium">Каса за період</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">{stats.totalRevenue.toLocaleString("uk-UA")} ₴</div>
          </div>
        </div>

        {/* Фільтри */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button onClick={() => setActiveFilter("all")} className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition ${activeFilter === "all" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"}`}>
              Всі ({orders.length})
            </button>
            <button onClick={() => setActiveFilter("active")} className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition ${activeFilter === "active" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}>
              Активні
            </button>
            <button onClick={() => setActiveFilter("validated")} className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition ${activeFilter === "validated" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}>
              Валідовані
            </button>
          </div>
          <div className="w-full sm:w-80">
            <input type="text" placeholder="Пошук за номером, гостем, телефоном..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 text-xs"/>
          </div>
        </div>

        {/* СПИСОК ЗАМОВЛЕНЬ - Ось де відбулася магія! */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 text-sm">Завантаження даних...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-sm">Замовлень не знайдено.</div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onOpenReceipt={() => setReceiptOrder(order)} 
              />
            ))}
          </div>
        )}

      </div>

      {/* МОДАЛЬНЕ ВІКНО ЧЕКА */}
      {receiptOrder && (
        <ReceiptModal 
          order={receiptOrder} 
          onClose={() => setReceiptOrder(null)} 
          apiBaseUrl={API_BASE} 
        />
      )}
    </div>
  );
}