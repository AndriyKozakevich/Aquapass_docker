"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Ticket {
  id?: string;
  ticketCode?: string;
  tariffName?: string;
  sunbedInfo?: string;
  price?: number;
  totalPrice?: number;
  totalTicketPrice?: number;
  TotalTicketPrice?: number;
}

interface OrderDetails {
  id: string;
  orderNumber?: string;
  visitDate: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail: string;
  totalAmount: number;
  status: string;
  tickets: Ticket[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:5000/api";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId");
  const isPaid = searchParams.get("paid") === "true";

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmingPayment, setConfirmingPayment] = useState<boolean>(isPaid);
  const [error, setError] = useState<string | null>(null);

  // Запобігаємо подвійному виклику в React StrictMode
  const confirmationAttempted = useRef<boolean>(false);

  useEffect(() => {
    if (!orderId) {
      setError("Ідентифікатор замовлення не знайдено");
      setLoading(false);
      return;
    }

    const processOrderFlow = async () => {
      try {
        // 1. Якщо прийшли після успішної оплати (paid=true), викликаємо бекенд для фіксації та відправки PDF
        if (isPaid && !confirmationAttempted.current) {
          confirmationAttempted.current = true;
          setConfirmingPayment(true);

          try {
            await fetch(`${API_BASE}/payments/confirm/${orderId}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            });
          } catch (confirmErr) {
            console.warn("Попередження: помилка автопідтвердження оплати:", confirmErr);
          } finally {
            setConfirmingPayment(false);
          }
        }

        // 2. Підтягуємо актуальні дані замовлення з оновленим статусом і квитками
        const res = await fetch(`${API_BASE}/Orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        } else {
          setError("Не вдалося завантажити деталі замовлення");
        }
      } catch (err) {
        console.error(err);
        setError("Помилка підключення до сервера");
      } finally {
        setLoading(false);
      }
    };

    processOrderFlow();
  }, [orderId, isPaid]);

  if (loading || confirmingPayment) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center text-sm font-sans gap-3">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span>Підтверджуємо оплату та генеруємо квитки...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            ✕
          </div>
          <h2 className="text-xl font-bold text-white">Сталася помилка</h2>
          <p className="text-xs text-slate-400">{error || "Замовлення не знайдено"}</p>
          <button
            onClick={() => router.push("/booking")}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-xs font-semibold transition"
          >
            Повернутися до бронювання
          </button>
        </div>
      </div>
    );
  }

  const tickets = order.tickets || [];
  const orderNumber = order.orderNumber || order.id.substring(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex items-center justify-center font-sans">
      <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-white">Оплата успішна!</h1>
          <p className="text-xs text-slate-400">
            Замовлення: <span className="font-mono text-sky-400 font-bold">{orderNumber}</span>
          </p>
          <p className="text-xs text-slate-400">
            Дата візиту: {new Date(order.visitDate).toLocaleDateString("uk-UA")}
          </p>
          <p className="text-xs text-slate-400">
            Квитки також надіслано на <span className="text-slate-200 font-medium">{order.customerEmail}</span>
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Ваші квитки:</h2>
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {tickets.map((t, idx) => {
              const code = t.ticketCode || "";
              const price = t.totalTicketPrice ?? t.TotalTicketPrice ?? t.price ?? t.totalPrice ?? 0;

              return (
                <div
                  key={t.id || idx}
                  className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-200 text-sm">
                      {t.tariffName || "Вхідний квиток"}
                    </div>
                    {t.sunbedInfo && (
                      <div className="text-xs text-emerald-400 font-medium">
                        🏖️ {t.sunbedInfo}
                      </div>
                    )}
                    <div className="text-xs text-slate-400">
                      Ціна: <span className="font-bold text-slate-200">{price} ₴</span>
                    </div>
                    {code && (
                      <div className="text-[11px] font-mono text-sky-400 truncate max-w-[200px]">
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
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm font-sans">
          Завантаження сторінки...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}