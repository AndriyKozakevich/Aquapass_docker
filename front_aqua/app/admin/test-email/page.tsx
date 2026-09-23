"use client";

import React, { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:5000/api";

export default function TestEmailPage() {
  const [recipientEmail, setRecipientEmail] = useState<string>("andriy7work@gmail.com");
  const [customerName, setCustomerName] = useState<string>("Андрій");
  const [orderNumber, setOrderNumber] = useState<string>("ORD-TEST-777");
  const [loading, setLoading] = useState<boolean>(false);
  const [statusResponse, setStatusResponse] = useState<{
    success: boolean;
    status?: number;
    data?: any;
    errorText?: string;
  } | null>(null);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusResponse(null);

    try {
      const res = await fetch(`${API_BASE}/Payments/test-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toEmail: recipientEmail,
          customerName,
          orderNumber,
        }),
      });

      const contentType = res.headers.get("content-type");
      let data: any = null;

      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      if (res.ok) {
        setStatusResponse({
          success: true,
          status: res.status,
          data,
        });
      } else {
        setStatusResponse({
          success: false,
          status: res.status,
          errorText: typeof data === "string" ? data : JSON.stringify(data, null, 2),
        });
      }
    } catch (err: any) {
      setStatusResponse({
        success: false,
        errorText: err?.message || "Помилка зв'язку з бекендом (перевірте чи запущений сервер на порту 7261)",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center font-sans">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">Діагностика SMTP / Email</h1>
          <p className="text-xs text-slate-400 mt-1">
            Відправка тестового PDF-квитка для перевірки налаштувань Gmail та MailKit
          </p>
        </div>

        <form onSubmit={handleSendTestEmail} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Одержувач (Email)
            </label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-sky-500 focus:outline-none"
              placeholder="andriy7work@gmail.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Ім'я в листі
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Номер замовлення
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Відправка листа через SMTP...</span>
            ) : (
              <span>Надіслати тестовий квиток</span>
            )}
          </button>
        </form>

        {statusResponse && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 ${
              statusResponse.success
                ? "bg-emerald-950/40 border-emerald-500 text-emerald-300"
                : "bg-rose-950/40 border-rose-500 text-rose-300"
            }`}
          >
            <div className="font-bold flex items-center gap-2 text-sm">
              <span>{statusResponse.success ? "✓ Успіх" : "✕ Помилка відправки"}</span>
              {statusResponse.status && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-black/40 border border-current">
                  HTTP {statusResponse.status}
                </span>
              )}
            </div>

            {statusResponse.success ? (
              <p>
                Лист відправлено! Перевірте пошту <b>{recipientEmail}</b> (зокрема папку «Спам» та «Оновлення»).
              </p>
            ) : (
              <pre className="p-2 bg-slate-950 rounded-xl overflow-x-auto text-[11px] font-mono text-rose-200">
                {statusResponse.errorText}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}