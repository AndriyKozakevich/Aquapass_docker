"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { OrderDetails } from "@/types/orders";
import { OrderService } from "@/lib/api/orderService";
import OrderSuccessCard from "@/components/booking/OrderSuccessCard";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId");
  const isPaid = searchParams.get("paid") === "true";

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmingPayment, setConfirmingPayment] = useState<boolean>(isPaid);
  const [error, setError] = useState<string | null>(null);

  const confirmationAttempted = useRef<boolean>(false);

  useEffect(() => {
    if (!orderId) {
      setError("Ідентифікатор замовлення не знайдено");
      setLoading(false);
      return;
    }

    const processOrderFlow = async () => {
      try {
        if (isPaid && !confirmationAttempted.current) {
          confirmationAttempted.current = true;
          setConfirmingPayment(true);
          try {
            await OrderService.confirmPayment(orderId);
          } catch (confirmErr) {
            console.warn("Попередження: помилка автопідтвердження оплати", confirmErr);
          } finally {
            setConfirmingPayment(false);
          }
        }

        const data = await OrderService.getOrderById(orderId);
        setOrder(data);
      } catch (err: any) {
        console.error(err);
        setError("Не вдалося завантажити деталі замовлення. Можливо, сервер тимчасово недоступний.");
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex items-center justify-center font-sans">
      <OrderSuccessCard order={order} />
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