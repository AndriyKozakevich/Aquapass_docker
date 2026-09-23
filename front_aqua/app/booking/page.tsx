"use client";

import * as signalR from "@microsoft/signalr";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

interface Sunbed {
  id: string;
  number: number;
  row: string;
  isAvailable?: boolean;
}

interface Tariff {
  id: string;
  name: string;
  serviceType: string;
  dayType: "Weekday" | "Weekend";
  price: number;
  zoneId?: string;
}

interface SelectedSunbedItem {
  sunbed: Sunbed;
  isChild: boolean;
}

interface ExtraItem {
  tariffId: string;
  quantity: number;
}

interface TicketResponse {
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
  entrancePrice?: number;
  EntrancePrice?: number;
  sunbedInfo?: string;
  SunbedInfo?: string;
}

interface OrderResponse {
  id?: string;
  Id?: string;
  orderId?: string;
  OrderId?: string;
  orderNumber?: string;
  OrderNumber?: string;
  visitDate?: string;
  VisitDate?: string;
  customerFirstName?: string;
  CustomerFirstName?: string;
  customerLastName?: string;
  CustomerLastName?: string;
  customerEmail: string;
  customerPhone?: string;
  totalAmount?: number;
  TotalAmount?: number;
  status: string;
  tickets?: TicketResponse[];
  Tickets?: TicketResponse[];
}

interface SunbedStatusEvent {
  sunbedId: string;
  isAvailable: boolean;
  heldByToken?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:5000/api";
const HUB_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/hubs/sunbed`
  : "http://localhost:5000/hubs/sunbed";

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
  const [visitDate, setVisitDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [sunbeds, setSunbeds] = useState<Sunbed[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [selectedSunbeds, setSelectedSunbeds] = useState<SelectedSunbedItem[]>([]);
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);

  // Стан для Redis Hold-блокування
  const [holdToken, setHoldToken] = useState<string>("");
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number | null>(null);

  const [customerFirstName, setCustomerFirstName] = useState<string>("");
  const [customerLastName, setCustomerLastName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  const [paymentMethod, setPaymentMethod] = useState<"Monobank" | "Cashier">("Monobank");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdOrder, setCreatedOrder] = useState<OrderResponse | null>(null);

  const selectedSunbedsRef = useRef<SelectedSunbedItem[]>(selectedSunbeds);
  selectedSunbedsRef.current = selectedSunbeds;

  const holdTokenRef = useRef<string>(holdToken);
  holdTokenRef.current = holdToken;

  const currentDayType: "Weekday" | "Weekend" = useMemo(() => {
    const day = new Date(visitDate).getDay();
    return day === 0 || day === 6 ? "Weekend" : "Weekday";
  }, [visitDate]);

  const activeTariffs = useMemo(() => {
    return tariffs.filter((t) => t.dayType === currentDayType);
  }, [tariffs, currentDayType]);

  const adultEntranceTariff = activeTariffs.find(
    (t) => t.serviceType === "EntranceTicketAdult"
  );
  const childEntranceTariff = activeTariffs.find(
    (t) => t.serviceType === "EntranceTicketChild"
  );
  const sunbedTariff = activeTariffs.find(
    (t) => t.serviceType === "Sunbed"
  );

  const loadTariffs = async () => {
    try {
      const res = await fetch(`${API_BASE}/Tariffs`);
      if (res.ok) {
        const data = await res.json();
        setTariffs(data);
      }
    } catch (err) {
      console.error("Не вдалося завантажити тарифи", err);
    }
  };

  const loadSunbeds = useCallback(async (date: string, token: string) => {
    setIsLoading(true);
    try {
      const url = token
        ? `${API_BASE}/Sunbed/available?visitDate=${date}&holdToken=${token}`
        : `${API_BASE}/Sunbed/available?visitDate=${date}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSunbeds(data);
      }
    } catch (err) {
      console.error("Помилка завантаження шезлонгів", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Ініціалізація токена сесії
  useEffect(() => {
    const token = getOrCreateHoldToken();
    setHoldToken(token);
    loadTariffs();
  }, []);

  // Підключення до SignalR WebSocket хабу
  useEffect(() => {
    if (!visitDate) return;

    let isCancelled = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        withCredentials: true,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Слухаємо подію оновлення статусу
    connection.on("SunbedStatusUpdated", (data: SunbedStatusEvent) => {
      setSunbeds((prevSunbeds) =>
        prevSunbeds.map((s) => {
          const sId = s.id || (s as any).Id;
          if (sId.toLowerCase() === data.sunbedId.toLowerCase()) {
            const isMyHold = Boolean(
              holdTokenRef.current &&
              data.heldByToken &&
              data.heldByToken === holdTokenRef.current
            );
            return {
              ...s,
              isAvailable: data.isAvailable || isMyHold,
            };
          }
          return s;
        })
      );
    });

    const startConnection = async () => {
      try {
        await connection.start();
        if (isCancelled) {
          await connection.stop();
          return;
        }
        await connection.invoke("JoinDateGroup", visitDate);
      } catch (err: any) {
        // Ігноруємо обрив від строгого режиму React під час розробки
        if (!isCancelled) {
          console.error("Помилка зв'язку з SignalR хабом:", err);
        }
      }
    };

    startConnection();

    return () => {
      isCancelled = true;
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.invoke("LeaveDateGroup", visitDate).catch(() => {});
        connection.stop();
      } else if (connection.state === signalR.HubConnectionState.Connecting) {
        // Якщо ще з'єднується — чекаємо завершення перед викликом stop
        connection.start().then(() => connection.stop()).catch(() => {});
      }
    };
  }, [visitDate]);

  // Таймер зворотного відліку для блокування шезлонгів
  useEffect(() => {
    if (holdSecondsLeft === null) return;

    if (holdSecondsLeft <= 0) {
      if (selectedSunbedsRef.current.length > 0) {
        selectedSunbedsRef.current.forEach((item) => {
          const sId = item.sunbed.id || (item.sunbed as any).Id;
          fetch(`${API_BASE}/Sunbed/${sId}/release-hold`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitDate, holdToken }),
          }).catch(console.error);
        });

        setSelectedSunbeds([]);
        setHoldSecondsLeft(null);
        alert("Час бронювання (5 хвилин) вичерпано. Будь ласка, оберіть шезлонг повторно.");
        loadSunbeds(visitDate, holdToken);
      }
      return;
    }

    const interval = setInterval(() => {
      setHoldSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [holdSecondsLeft, visitDate, holdToken, loadSunbeds]);

  // Зміна дати візиту
  useEffect(() => {
    if (selectedSunbedsRef.current.length > 0 && holdToken) {
      selectedSunbedsRef.current.forEach((item) => {
        const sId = item.sunbed.id || (item.sunbed as any).Id;
        fetch(`${API_BASE}/Sunbed/${sId}/release-hold`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitDate, holdToken }),
        }).catch(console.error);
      });
    }

    if (holdToken) {
      loadSunbeds(visitDate, holdToken);
    }
    setSelectedSunbeds([]);
    setExtraItems([]);
    setHoldSecondsLeft(null);
  }, [visitDate, holdToken, loadSunbeds]);

  // Клік по шезлонгу з Redis Hold Lock
  const toggleSunbed = async (sunbed: Sunbed) => {
    if (!sunbed.isAvailable) return;

    const sunbedId = sunbed.id || (sunbed as any).Id;
    const exists = selectedSunbeds.some(
      (item) => (item.sunbed.id || (item.sunbed as any).Id) === sunbedId
    );

    if (exists) {
      try {
        await fetch(`${API_BASE}/Sunbed/${sunbedId}/release-hold`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitDate, holdToken }),
        });
      } catch (err) {
        console.error("Помилка release-hold:", err);
      }

      const updated = selectedSunbeds.filter(
        (item) => (item.sunbed.id || (item.sunbed as any).Id) !== sunbedId
      );
      setSelectedSunbeds(updated);

      if (updated.length === 0) {
        setHoldSecondsLeft(null);
      }
    } else {
      try {
        const res = await fetch(`${API_BASE}/Sunbed/${sunbedId}/hold`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitDate, holdToken }),
        });

        if (res.status === 409) {
          const errData = await res.json().catch(() => ({}));
          alert(errData.message || "Цей шезлонг щойно обрав інший користувач!");
          loadSunbeds(visitDate, holdToken);
          return;
        }

        if (!res.ok) {
          alert("Не вдалося заблокувати шезлонг. Спробуйте ще раз.");
          return;
        }

        setSelectedSunbeds((prev) => [...prev, { sunbed, isChild: false }]);
        setHoldSecondsLeft(300);
      } catch (err) {
        console.error("Помилка hold:", err);
        alert("Помилка підключення до сервера.");
      }
    }
  };

  const toggleTicketType = (sunbedId: string) => {
    setSelectedSunbeds((prev) =>
      prev.map((item) =>
        (item.sunbed.id || (item.sunbed as any).Id) === sunbedId
          ? { ...item, isChild: !item.isChild }
          : item
      )
    );
  };

  const addExtra = (tariffId: string) => {
    setExtraItems((prev) => {
      const existing = prev.find((e) => e.tariffId === tariffId);
      if (existing) {
        return prev.map((e) =>
          e.tariffId === tariffId ? { ...e, quantity: e.quantity + 1 } : e
        );
      }
      return [...prev, { tariffId, quantity: 1 }];
    });
  };

  const removeExtra = (tariffId: string) => {
    setExtraItems((prev) =>
      prev
        .map((e) => (e.tariffId === tariffId ? { ...e, quantity: e.quantity - 1 } : e))
        .filter((e) => e.quantity > 0)
    );
  };

  const totalAmount = useMemo(() => {
    let sum = 0;
    const sPrice = sunbedTariff?.price || 0;
    const aPrice = adultEntranceTariff?.price || 0;
    const cPrice = childEntranceTariff?.price || 0;

    selectedSunbeds.forEach((item) => {
      sum += sPrice;
      sum += item.isChild ? cPrice : aPrice;
    });

    extraItems.forEach((extra) => {
      const t = activeTariffs.find(
        (tariff) => (tariff.id || (tariff as any).Id) === extra.tariffId
      );
      if (t) sum += t.price * extra.quantity;
    });

    return sum;
  }, [selectedSunbeds, extraItems, sunbedTariff, adultEntranceTariff, childEntranceTariff, activeTariffs]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSunbeds.length === 0 && extraItems.length === 0) {
      alert("Будь ласка, оберіть хоча б один шезлонг або додаткову послугу.");
      return;
    }

    if (!sunbedTariff || !adultEntranceTariff || !childEntranceTariff) {
      alert("Тарифи для цієї дати ще завантажуються.");
      return;
    }

    setIsSubmitting(true);

    const items: Array<{ tariffId: string; quantity: number; sunbedId?: string }> = [];

    selectedSunbeds.forEach((item) => {
      const sId = item.sunbed.id || (item.sunbed as any).Id;
      const entranceTariffId = item.isChild
        ? childEntranceTariff.id || (childEntranceTariff as any).Id
        : adultEntranceTariff.id || (adultEntranceTariff as any).Id;

      items.push({
        tariffId: entranceTariffId,
        quantity: 1,
        sunbedId: sId,
      });
    });

    extraItems.forEach((extra) => {
      items.push({
        tariffId: extra.tariffId,
        quantity: extra.quantity,
      });
    });

    const payload = {
      visitDate: new Date(visitDate).toISOString(),
      customerFirstName,
      customerLastName,
      customerEmail,
      customerPhone,
      items,
      paymentMethod,
      holdToken,
    };

    try {
      const res = await fetch(`${API_BASE}/Orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Помилка створення замовлення на бекенді:", text);
        alert(text || "Помилка при створенні замовлення");
        return;
      }

      const orderData: OrderResponse = await res.json();
      setHoldSecondsLeft(null);

      const validOrderId =
        orderData.id ||
        orderData.Id ||
        orderData.orderId ||
        orderData.OrderId;

      if (!validOrderId) {
        console.error("Бекенд не передав ID замовлення:", orderData);
        alert("Помилка: бекенд не повернув ID для створення платежу.");
        return;
      }

      if (paymentMethod === "Monobank") {
        try {
          const payRes = await fetch(`${API_BASE}/Payments/create-checkout/${validOrderId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          if (payRes.ok) {
            const payData = await payRes.json();
            if (payData?.paymentUrl) {
              window.location.href = payData.paymentUrl;
              return;
            }
          }

          const errBody = await payRes.text();
          console.error(`Помилка create-checkout (${payRes.status}):`, errBody);
          alert("Замовлення створено, але не вдалося підключити платіжну сесію Monobank. Зверніться до касира.");
        } catch (paymentErr) {
          console.error("Мережева помилка створення інвойсу:", paymentErr);
          alert("Помилка зв'язку з платіжним шлюзом.");
        }
      }

      setCreatedOrder(orderData);
    } catch (err) {
      console.error("Мережева помилка запиту замовлення:", err);
      alert("Не вдалося зв'язатися з сервером. Перевірте роботу бекенду.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedSunbeds = [...sunbeds].sort((a, b) => {
    if (a.row === b.row) return a.number - b.number;
    return (a.row || "").localeCompare(b.row || "");
  });

  if (createdOrder) {
    const rawTickets = createdOrder.tickets || createdOrder.Tickets || [];
    const orderNum = createdOrder.orderNumber || createdOrder.OrderNumber || createdOrder.id || createdOrder.Id;
    const vDate = createdOrder.visitDate || createdOrder.VisitDate || visitDate;
    const finalAmount = createdOrder.totalAmount ?? createdOrder.TotalAmount ?? totalAmount;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center font-sans">
        <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-white">Замовлення оформлено!</h2>
            <p className="text-xs text-slate-400">
              Номер замовлення: <span className="font-mono text-sky-400 font-bold">{orderNum}</span>
            </p>
            <p className="text-xs text-slate-400">
              Дата візиту: {new Date(vDate).toLocaleDateString("uk-UA")}
            </p>
            <div className="inline-block mt-2">
              <span className="text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Статус: {createdOrder.status === "Paid" ? "Оплачено" : "Очікує оплати на касі"}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Ваші квитки:</h3>
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
              {rawTickets.map((t, idx) => {
                const ticketKey = t.id || t.Id || t.ticketCode || t.TicketCode || `order-ticket-${idx}`;
                const name = t.tariffName || t.TariffName || t.entranceType || t.EntranceType || "Вхідний квиток";
                const ticketPrice = t.price ?? t.Price ?? t.totalPrice ?? t.TotalPrice ?? t.entrancePrice ?? t.EntrancePrice ?? 0;
                const code = t.ticketCode || t.TicketCode || "";
                const sunbedInfo = t.sunbedInfo || t.SunbedInfo;

                return (
                  <div
                    key={ticketKey}
                    className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-200 text-sm">{name}</div>
                      {sunbedInfo && (
                        <div className="text-xs text-emerald-400 font-medium">
                          🏖️ {sunbedInfo}
                        </div>
                      )}
                      <div className="text-xs text-slate-400">
                        Ціна: <span className="font-bold text-slate-200">{ticketPrice} ₴</span>
                      </div>
                      {code && (
                        <div className="text-[11px] font-mono text-sky-400">
                          Код: {code}
                        </div>
                      )}
                    </div>

                    {code && (
                      <img
                        src={`${API_BASE}/Tickets/${code}/qr`}
                        alt={`QR-${code}`}
                        className="w-20 h-20 rounded-xl bg-white p-1 shadow-md shrink-0"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 flex justify-between items-center text-sm">
            <span className="text-slate-400">Сума:</span>
            <span className="text-xl font-bold text-emerald-400">{finalAmount} ₴</span>
          </div>

          <button
            onClick={() => {
              setCreatedOrder(null);
              setSelectedSunbeds([]);
              setExtraItems([]);
              loadSunbeds(visitDate, holdToken);
            }}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white py-3 rounded-xl font-medium transition text-sm"
          >
            Оформити ще одне бронювання
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Хедер дати */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900/90 border border-slate-800 p-6 rounded-3xl gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-sky-400">
              Бронювання шезлонгів та квитків
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Оберіть дату відвідування та вкажіть потрібні шезлонги на схемі
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-300">Дата візиту:</label>
            <input
              type="date"
              value={visitDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setVisitDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-sky-500 [color-scheme:dark]"
            />
            <span className="text-xs px-3 py-1.5 rounded-lg bg-sky-950 text-sky-300 border border-sky-800 font-semibold">
              {currentDayType === "Weekend" ? "Вихідний" : "Будній"}
            </span>
          </div>
        </div>

        {/* Схема та кошик */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-200">
                    Схема шезлонгів
                  </h2>
                  <p className="text-xs text-slate-400">
                    При виборі шезлонга автоматично додається оренда + вхідний квиток
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500" />
                    Вільний
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-sky-500 border border-sky-400" />
                    Обрано
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-rose-500/20 border border-rose-500" />
                    Зайнятий
                  </div>
                </div>
              </div>

              {/* Таймер зворотного відліку блокування */}
              {holdSecondsLeft !== null && holdSecondsLeft > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-medium animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⏳</span>
                    <span>Шезлонг заброньовано за вами на час заповнення анкети:</span>
                  </div>
                  <span className="font-mono font-bold text-sm bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-lg text-amber-200">
                    {Math.floor(holdSecondsLeft / 60)}:
                    {(holdSecondsLeft % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              )}

              {isLoading ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  Оновлення карти...
                </div>
              ) : sortedSunbeds.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">
                  Шезлонгів на цю дату не знайдено.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {sortedSunbeds.map((s, idx) => {
                    const sunbedId = s.id || (s as any).Id || `sunbed-item-${idx}`;
                    const isSelected = selectedSunbeds.some(
                      (item) => (item.sunbed.id || (item.sunbed as any).Id) === sunbedId
                    );
                    const isAvailable = s.isAvailable ?? true;

                    let btnClass = "border-slate-800 bg-rose-950/20 text-rose-500 cursor-not-allowed opacity-50";
                    if (isSelected) {
                      btnClass = "border-sky-400 bg-sky-600 text-white shadow-lg shadow-sky-600/30 scale-105";
                    } else if (isAvailable) {
                      btnClass = "border-emerald-500/40 bg-emerald-950/20 text-emerald-300 hover:border-emerald-400 hover:scale-105";
                    }

                    return (
                      <button
                        key={sunbedId}
                        type="button"
                        disabled={!isAvailable && !isSelected}
                        onClick={() => toggleSunbed(s)}
                        className={`border rounded-2xl p-3 flex flex-col items-center justify-between aspect-square transition ${btnClass}`}
                      >
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                          Ряд {s.row}
                        </span>
                        <span className="text-lg font-extrabold my-1">
                          №{s.number}
                        </span>
                        <span className="text-[9px] font-medium">
                          {isSelected ? "В кошику" : isAvailable ? "Вільний" : "Зайнятий"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Додаткові послуги */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-200">
                  Додаткові послуги
                </h2>
                <p className="text-xs text-slate-400">
                  Бунгало або додаткові вхідні квитки без прив'язки до шезлонга
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeTariffs
                  .filter((t) => t.serviceType !== "Sunbed")
                  .map((t, idx) => {
                    const tariffId = t.id || (t as any).Id || `tariff-option-${idx}`;
                    const extra = extraItems.find((i) => i.tariffId === tariffId);
                    const count = extra?.quantity || 0;

                    return (
                      <div
                        key={tariffId}
                        className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{t.name}</div>
                          <div className="text-xs text-sky-400 font-bold mt-0.5">{t.price} ₴</div>
                        </div>

                        <div className="flex items-center gap-2">
                          {count > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() => removeExtra(tariffId)}
                                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center text-sm"
                              >
                                -
                              </button>
                              <span className="text-xs font-semibold w-4 text-center">{count}</span>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => addExtra(tariffId)}
                            className="w-7 h-7 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center justify-center text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>

          {/* Кошик */}
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl sticky top-6 space-y-5">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
                Деталі замовлення
              </h2>

              {selectedSunbeds.length === 0 && extraItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Оберіть шезлонг або додайте послугу, щоб продовжити.
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {selectedSunbeds.map((item, idx) => {
                    const entranceTariff = item.isChild ? childEntranceTariff : adultEntranceTariff;
                    const entrancePrice = entranceTariff?.price || 0;
                    const sunbedPrice = sunbedTariff?.price || 0;
                    const sunbedId = item.sunbed.id || (item.sunbed as any).Id || `cart-sunbed-${idx}`;

                    return (
                      <div
                        key={sunbedId}
                        className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 space-y-2.5"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs font-bold text-sky-400">
                              Шезлонг №{item.sunbed.number} (Ряд {item.sunbed.row})
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Оренда: {sunbedPrice} ₴
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleSunbed(item.sunbed)}
                            className="text-slate-500 hover:text-rose-400 text-xs"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="bg-slate-900 p-2 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <div className="text-slate-400 text-[10px]">Вхідний квиток:</div>
                            <div className="font-bold text-emerald-400 text-[11px]">
                              {item.isChild ? "Дитячий" : "Дорослий"} (+{entrancePrice} ₴)
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleTicketType(sunbedId)}
                            className="bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] px-2.5 py-1 rounded-lg transition"
                          >
                            Змінити на {item.isChild ? "Дорослий" : "Дитячий"}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {extraItems.map((extra, idx) => {
                    const t = activeTariffs.find(
                      (tariff) => (tariff.id || (tariff as any).Id) === extra.tariffId
                    );
                    if (!t) return null;

                    return (
                      <div
                        key={extra.tariffId || `cart-extra-${idx}`}
                        className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 flex justify-between items-center text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{t.name}</div>
                          <div className="text-slate-400 text-[11px]">
                            {t.price} ₴ × {extra.quantity}
                          </div>
                        </div>
                        <div className="font-bold text-sky-400">
                          {t.price * extra.quantity} ₴
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                <span className="text-slate-400 text-xs">Загальна сума:</span>
                <span className="text-xl font-black text-emerald-400">
                  {totalAmount} ₴
                </span>
              </div>

              {/* Форма замовлення */}
              <form onSubmit={handleCheckout} className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Ім'я</label>
                    <input
                      type="text"
                      required
                      placeholder="Тарас"
                      value={customerFirstName}
                      onChange={(e) => setCustomerFirstName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Прізвище</label>
                    <input
                      type="text"
                      required
                      placeholder="Шевченко"
                      value={customerLastName}
                      onChange={(e) => setCustomerLastName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Email для квитків</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Номер телефону</label>
                  <input
                    type="tel"
                    required
                    placeholder="+380..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                  />
                </div>

                {/* Спосіб оплати */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] text-slate-400 block">Спосіб оплати</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("Monobank")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition flex flex-col items-center justify-center gap-1 ${
                        paymentMethod === "Monobank"
                          ? "bg-slate-800 border-sky-400 text-sky-400 shadow-md shadow-sky-500/10"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <span className="text-sm">💳</span>
                      <span>Monobank / Картка</span>
                    </button>

                    <button
                      type="button"
                      disabled
                      aria-label="Оплата на касі недоступна"
                      className="p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                    >
                      <span className="text-sm">💵</span>
                      <span>На вході (касиру)</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || (selectedSunbeds.length === 0 && extraItems.length === 0)}
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl transition text-xs shadow-lg shadow-emerald-600/20"
                >
                  {isSubmitting
                    ? "Обробка замовлення..."
                    : paymentMethod === "Monobank"
                    ? `Оплатити ${totalAmount} ₴ через Monobank`
                    : `Забронювати за ${totalAmount} ₴`}
                </button>
              </form>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}