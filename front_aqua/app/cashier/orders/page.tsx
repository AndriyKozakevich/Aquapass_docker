"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getStaffToken, clearStaffSession } from "@/lib/auth";

interface TicketDetail {
  id?: string;
  Id?: string;
  ticketCode?: string;
  TicketCode?: string;
  tariffName?: string;
  TariffName?: string;
  entranceType?: string;
  EntranceType?: string;
  price?: number;
  Price?: number;
  totalPrice?: number;
  TotalPrice?: number;
  totalTicketPrice?: number;
  TotalTicketPrice?: number;
  entrancePrice?: number;
  EntrancePrice?: number;
  status: string;
  Status?: string;
  hasSunbed?: boolean;
  HasSunbed?: boolean;
  sunbedInfo?: string;
  SunbedInfo?: string;
  sunbedDetails?: string;
  SunbedDetails?: string;
}

interface OrderItem {
  id?: string;
  Id?: string;
  orderNumber?: string;
  OrderNumber?: string;
  visitDate?: string;
  VisitDate?: string;
  customerFirstName?: string;
  CustomerFirstName?: string;
  customerLastName?: string;
  CustomerLastName?: string;
  customerName?: string;
  CustomerName?: string;
  firstName?: string;
  lastName?: string;
  FirstName?: string;
  LastName?: string;
  customerEmail?: string;
  CustomerEmail?: string;
  customerPhone?: string;
  CustomerPhone?: string;
  totalAmount?: number;
  TotalAmount?: number;
  status?: string;
  Status?: string;
  createdAt?: string;
  CreatedAt?: string;
  tickets?: TicketDetail[];
  Tickets?: TicketDetail[];
}

type FilterType = "all" | "active" | "validated";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:5000/api";

export default function OrdersDashboardPage() {
  const router = useRouter();
  const todayStr = new Date().toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});
  const [receiptOrder, setReceiptOrder] = useState<OrderItem | null>(null);

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
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const data: OrderItem[] = await res.json();
        setOrders(data);
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

  const formatTicketName = (rawName?: string) => {
    if (!rawName) return "Вхідний квиток";
    const lower = rawName.toLowerCase();

    if (lower.includes("дит") || lower.includes("child")) {
      return "Дитячий квиток";
    }
    if (lower.includes("дор") || lower.includes("adult")) {
      return "Дорослий квиток";
    }
    if (lower.includes("бунгало") || lower.includes("bungalow")) {
      return "Бунгало";
    }
    if (lower.includes("лежак") || lower.includes("sunbed")) {
      return "Шезлонг";
    }

    return rawName.replace(/\s*\(.*?\)\s*/g, "").trim();
  };

  const getOrderPresentationStatus = (order: OrderItem) => {
    const rawStatus = (order.status || order.Status || "Created").toLowerCase();
    const rawTickets = order.tickets || order.Tickets || [];

    if (rawStatus === "cancelled") {
      return { label: "Скасовано", type: "cancelled" };
    }

    const hasValidated = rawTickets.some(
      (t) => (t.status || t.Status) === "Used"
    );

    if (hasValidated || rawStatus === "completed") {
      return { label: "Валідовано", type: "validated" };
    }

    return { label: "Оплачено", type: "paid" };
  };

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const pStatus = getOrderPresentationStatus(o);

        if (activeFilter === "active") {
          if (pStatus.type === "cancelled" || pStatus.type === "validated") {
            return false;
          }
        }

        if (activeFilter === "validated" && pStatus.type !== "validated") {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const num = (o.orderNumber || o.OrderNumber || o.id || o.Id || "").toLowerCase();
          const fName = (o.customerFirstName || o.CustomerFirstName || o.firstName || "").toLowerCase();
          const lName = (o.customerLastName || o.CustomerLastName || o.lastName || "").toLowerCase();
          const email = (o.customerEmail || o.CustomerEmail || "").toLowerCase();
          const phone = (o.customerPhone || o.CustomerPhone || "").toLowerCase();

          return (
            num.includes(q) ||
            fName.includes(q) ||
            lName.includes(q) ||
            email.includes(q) ||
            phone.includes(q)
          );
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(
          a.createdAt || a.CreatedAt || a.visitDate || a.VisitDate || 0
        ).getTime();
        const dateB = new Date(
          b.createdAt || b.CreatedAt || b.visitDate || b.VisitDate || 0
        ).getTime();
        return dateB - dateA;
      });
  }, [orders, activeFilter, searchQuery]);

  const toggleServices = (orderId: string) => {
    setExpandedServices((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Хедер */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900/90 border border-slate-800 p-6 rounded-3xl gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-sky-400">
              Дашборд замовлень
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Управління проходом, деталізація послуг та друк чеків
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">З:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-white text-xs focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">По:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-white text-xs focus:outline-none"
              />
            </div>
            <button
              onClick={fetchOrders}
              className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition"
            >
              Оновити
            </button>
          </div>
        </div>

        {/* Фільтри */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setActiveFilter("all")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeFilter === "all"
                  ? "bg-sky-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Всі ({orders.length})
            </button>
            <button
              onClick={() => setActiveFilter("active")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeFilter === "active"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Активні
            </button>
            <button
              onClick={() => setActiveFilter("validated")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeFilter === "validated"
                  ? "bg-purple-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Валідовані
            </button>
          </div>

          <div className="w-full sm:w-80">
            <input
              type="text"
              placeholder="Пошук за номером, гостем, телефоном..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Список замовлень з Grid-розподілом */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            Завантаження даних...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-sm">
            Замовлень не знайдено.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order, orderIdx) => {
              const rawTickets = order.tickets || order.Tickets || [];
              const rawOrderId = order.id || order.Id || order.orderNumber || order.OrderNumber;
              const uniqueKey = rawOrderId ? String(rawOrderId) : `order-${orderIdx}`;
              const orderNum = order.orderNumber || order.OrderNumber || rawOrderId || "N/A";
              const amount = order.totalAmount ?? order.TotalAmount ?? 0;

              const createdAtVal = order.createdAt || order.CreatedAt;
              const visitDateVal = order.visitDate || order.VisitDate;

              // Час операції
              const opDateStr = createdAtVal && !createdAtVal.startsWith("0001")
                ? new Date(createdAtVal).toLocaleString("uk-UA", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—";

              // Дата події
              const visitDateObj = visitDateVal ? new Date(visitDateVal) : null;
              const eventDateStr = visitDateObj
                ? visitDateObj.toLocaleDateString("uk-UA")
                : "—";

              const isWeekend = visitDateObj
                ? visitDateObj.getDay() === 0 || visitDateObj.getDay() === 6
                : false;
              const tariffDayLabel = isWeekend ? "Вихідний" : "Будній";

              const entranceTicketsCount = rawTickets.length;

              const pStatus = getOrderPresentationStatus(order);
              let statusBorderColor = "bg-emerald-500";
              let badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
              if (pStatus.type === "validated") {
                statusBorderColor = "bg-purple-500";
                badgeColor = "bg-purple-500/20 text-purple-400 border-purple-500/30";
              } else if (pStatus.type === "cancelled") {
                statusBorderColor = "bg-slate-500";
                badgeColor = "bg-slate-500/20 text-slate-400 border-slate-500/30";
              }

              // Прізвище та ім'я
              const lName = order.customerLastName || order.CustomerLastName || order.lastName || order.LastName || "";
              const fName = order.customerFirstName || order.CustomerFirstName || order.firstName || order.FirstName || "";
              const fullName = [lName, fName].filter(Boolean).join(" ") || order.customerName || order.CustomerName || "Гість без імені";

              const guestEmail = order.customerEmail || order.CustomerEmail || "Не вказано";
              const guestPhone = order.customerPhone || order.CustomerPhone || "—";

              const isExpanded = expandedServices[uniqueKey] || false;
              const displayedTickets = isExpanded ? rawTickets : rawTickets.slice(0, 2);
              const remainingCount = rawTickets.length - 2;

              return (
                <div
                  key={uniqueKey}
                  className="bg-slate-900 border border-slate-800/90 rounded-2xl overflow-hidden shadow-lg flex flex-col lg:flex-row items-stretch"
                >
                  {/* Ліва лінія статусу */}
                  <div className={`w-full lg:w-2 shrink-0 h-1.5 lg:h-auto ${statusBorderColor}`} />

                  {/* 12-колонковий Grid-контейнер для однакової ширини всіх карток */}
                  <div className="w-full grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80 items-stretch">
                    
                    {/* Колонка 1: Інформація про замовлення (3 колонки з 12) */}
                    <div className="p-4 lg:col-span-3 space-y-2 flex flex-col justify-center">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-sky-400">
                          № {orderNum}
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
                          <span className="text-slate-500 text-[11px]">Вхідних квитків: </span>
                          <span className="font-bold text-sky-300">{entranceTicketsCount} шт.</span>
                        </div>
                      </div>
                    </div>

                    {/* Колонка 2: Гість (2 колонки з 12) */}
                    <div className="p-4 lg:col-span-2 space-y-1.5 flex flex-col justify-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                        Гість
                      </span>

                      <div className="text-xs font-bold text-slate-100 truncate" title={fullName}>
                        {fullName}
                      </div>

                      <div className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                        <span className="text-rose-400">📞</span>
                        <span className="truncate">{guestPhone}</span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate" title={guestEmail}>
                        <span>✉️</span>
                        <span className="truncate">{guestEmail}</span>
                      </div>
                    </div>

                    {/* Колонка 3: Послуги та місця (4 повноцінні колонки з 12 - МАКСИМУМ МІСЦЯ) */}
                    <div className="p-4 lg:col-span-4 space-y-2 flex flex-col justify-center">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Послуги та місця
                      </div>

                      {rawTickets.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">Послуг немає</div>
                      ) : (
                        <div className="space-y-1.5">
                          {displayedTickets.map((t, tIdx) => {
                            const rawName = t.tariffName || t.TariffName || t.entranceType || t.EntranceType || "";
                            const sInfo = t.sunbedInfo || t.SunbedInfo || t.sunbedDetails || t.SunbedDetails;
                            const cleanName = formatTicketName(rawName);

                            const tPrice =
                              t.price ??
                              t.Price ??
                              t.totalPrice ??
                              t.TotalPrice ??
                              t.totalTicketPrice ??
                              t.TotalTicketPrice ??
                              t.entrancePrice ??
                              t.EntrancePrice ??
                              0;

                            const isChild =
                              rawName.toLowerCase().includes("дит") ||
                              rawName.toLowerCase().includes("child");
                            const isBungalow =
                              rawName.toLowerCase().includes("бунгало") ||
                              rawName.toLowerCase().includes("bungalow");

                            return (
                              <div
                                key={t.id || t.Id || t.ticketCode || t.TicketCode || `ticket-item-${tIdx}`}
                                className="bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800/80 text-xs flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  {isBungalow ? (
                                    <span className="text-amber-400 font-medium">🛖 Бунгало</span>
                                  ) : sInfo ? (
                                    <span className="text-emerald-400 font-bold">🏖️ {sInfo}</span>
                                  ) : (
                                    <span className="text-slate-200 font-medium">🎟️ {cleanName}</span>
                                  )}

                                  {isChild && !cleanName.includes("Дитячий") && (
                                    <span className="text-amber-300 text-[11px] font-semibold shrink-0">
                                      (Дитячий)
                                    </span>
                                  )}
                                </div>

                                <span className="text-xs text-emerald-400 font-bold shrink-0">
                                  {tPrice} ₴
                                </span>
                              </div>
                            );
                          })}

                          {remainingCount > 0 && (
                            <button
                              onClick={() => toggleServices(uniqueKey)}
                              className="text-[11px] text-sky-400 hover:text-sky-300 font-medium transition pt-1 flex items-center gap-1"
                            >
                              {isExpanded
                                ? "Згорнути список"
                                : `Розгорнути ще +${remainingCount} позиції`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Колонка 4: Сума (1 колонка з 12) */}
                    <div className="p-4 lg:col-span-1 flex flex-col justify-center items-start lg:items-center">
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider">Сума</span>
                      <span className="text-lg font-black text-emerald-400 mt-0.5">
                        {amount.toLocaleString("uk-UA")} ₴
                      </span>
                    </div>

                    {/* Колонка 5: Статус (1 колонка з 12) */}
                    <div className="p-4 lg:col-span-1 flex flex-col justify-center items-start lg:items-center">
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider text-center ${badgeColor}`}
                      >
                        {pStatus.label}
                      </span>
                    </div>

                    {/* Колонка 6: Кнопка чека (1 колонка з 12) */}
                    <div className="p-4 lg:col-span-1 flex items-center justify-center">
                      <button
                        onClick={() => setReceiptOrder(order)}
                        className="w-full bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white px-2.5 py-2.5 rounded-xl text-xs font-semibold transition border border-slate-700 hover:border-sky-500 shadow-sm text-center"
                      >
                        🧾 Чек
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Модальне вікно чека замовлення */}
      {receiptOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Чек замовлення</h3>
                <p className="text-xs text-sky-400 font-mono mt-0.5">
                  № {receiptOrder.orderNumber || receiptOrder.OrderNumber || receiptOrder.id || receiptOrder.Id}
                </p>
              </div>
              <button
                onClick={() => setReceiptOrder(null)}
                className="text-slate-400 hover:text-white text-lg px-2"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1.5 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Дата події (візит):</span>
                <span className="font-semibold text-white">
                  {receiptOrder.visitDate || receiptOrder.VisitDate
                    ? new Date(receiptOrder.visitDate || receiptOrder.VisitDate!).toLocaleDateString("uk-UA")
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Гість:</span>
                <span className="text-white font-semibold">
                  {[
                    receiptOrder.customerLastName || receiptOrder.CustomerLastName,
                    receiptOrder.customerFirstName || receiptOrder.CustomerFirstName,
                  ]
                    .filter(Boolean)
                    .join(" ") ||
                    receiptOrder.customerName ||
                    receiptOrder.CustomerName ||
                    "Гість без імені"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="text-white">
                  {receiptOrder.customerEmail || receiptOrder.CustomerEmail}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Телефон:</span>
                <span className="text-white">
                  {receiptOrder.customerPhone || receiptOrder.CustomerPhone || "—"}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Квитки та QR-коди для входу:
              </h4>

              <div className="space-y-3">
                {(receiptOrder.tickets || receiptOrder.Tickets || []).map((t, tIdx) => {
                  const tPrice =
                    t.price ??
                    t.Price ??
                    t.totalPrice ??
                    t.TotalPrice ??
                    t.totalTicketPrice ??
                    t.TotalTicketPrice ??
                    t.entrancePrice ??
                    t.EntrancePrice ??
                    0;

                  const rawName = t.tariffName || t.TariffName || t.entranceType || t.EntranceType || "Вхідний квиток";
                  const cleanName = formatTicketName(rawName);
                  const tCode = t.ticketCode || t.TicketCode || "";
                  const sInfo = t.sunbedInfo || t.SunbedInfo || t.sunbedDetails || t.SunbedDetails;

                  return (
                    <div
                      key={t.id || t.Id || tCode || `receipt-ticket-${tIdx}`}
                      className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-200 text-sm">
                          {cleanName}
                        </div>

                        {sInfo && (
                          <div className="text-xs text-emerald-400 font-bold">
                            🏖️ Шезлонг: {sInfo}
                          </div>
                        )}

                        <div className="text-xs text-slate-400">
                          Ціна: <span className="font-bold text-emerald-400">{tPrice} ₴</span>
                        </div>

                        {tCode && (
                          <div className="text-[10px] font-mono text-slate-500">
                            Код: {tCode}
                          </div>
                        )}
                      </div>

                      {tCode && (
                        <img
                          src={`${API_BASE}/Tickets/${tCode}/qr`}
                          alt={`QR-${tCode}`}
                          className="w-20 h-20 bg-white p-1 rounded-xl shadow shrink-0"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-300">Сума до сплати:</span>
              <span className="text-2xl font-black text-emerald-400">
                {(receiptOrder.totalAmount ?? receiptOrder.TotalAmount ?? 0).toLocaleString("uk-UA")} ₴
              </span>
            </div>

            <button
              onClick={() => setReceiptOrder(null)}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white py-3 rounded-xl text-xs font-bold transition shadow-lg shadow-sky-600/20"
            >
              Закрити чек
            </button>
          </div>
        </div>
      )}

    </div>
  );
}