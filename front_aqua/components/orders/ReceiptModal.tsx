import React from "react";
import { Order } from "@/types/orders";

interface ReceiptModalProps {
  order: Order;
  onClose: () => void;
  apiBaseUrl: string; // Передамо URL бекенду для QR-кодів
}

export default function ReceiptModal({ order, onClose, apiBaseUrl }: ReceiptModalProps) {
  // Щоб закривати модалку кліком по темному фону, ми можемо перевірити, 
  // чи клік був саме по фону (e.target === e.currentTarget)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-150">
        
        {/* Хедер модалки */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Чек замовлення</h3>
            <p className="text-xs text-sky-400 font-mono mt-0.5">
              № {order.orderNumber}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg px-2">
            ✕
          </button>
        </div>

        {/* Інформація про гостя */}
        <div className="text-xs text-slate-300 space-y-1.5 bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="flex justify-between">
            <span className="text-slate-500">Дата події (візит):</span>
            <span className="font-semibold text-white">
              {order.visitDate ? order.visitDate.toLocaleDateString("uk-UA") : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Гість:</span>
            <span className="text-white font-semibold">{order.customerFullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email:</span>
            <span className="text-white">{order.customerEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Телефон:</span>
            <span className="text-white">{order.customerPhone}</span>
          </div>
        </div>

        {/* Список квитків з QR-кодами */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Квитки та QR-коди для входу:
          </h4>

          <div className="space-y-3">
            {order.tickets.map((t) => (
              <div key={t.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-slate-200 text-sm">
                    {t.displayName}
                  </div>
                  {t.sunbedInfo && (
                    <div className="text-xs text-emerald-400 font-bold">
                      🏖️ Шезлонг: {t.sunbedInfo}
                    </div>
                  )}
                  <div className="text-xs text-slate-400">
                    Ціна: <span className="font-bold text-emerald-400">{t.price} ₴</span>
                  </div>
                  {t.ticketCode && (
                    <div className="text-[10px] font-mono text-slate-500">
                      Код: {t.ticketCode}
                    </div>
                  )}
                </div>

                {/* Отримуємо QR-код з бекенду */}
                {t.ticketCode && (
                  <img
                    src={`${apiBaseUrl}/Tickets/${t.ticketCode}/qr`}
                    alt={`QR-${t.ticketCode}`}
                    className="w-20 h-20 bg-white p-1 rounded-xl shadow shrink-0"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Підсумок */}
        <div className="border-t border-slate-800 pt-4 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-300">Сума до сплати:</span>
          <span className="text-2xl font-black text-emerald-400">
            {order.totalAmount.toLocaleString("uk-UA")} ₴
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-sky-600 hover:bg-sky-500 text-white py-3 rounded-xl text-xs font-bold transition shadow-lg shadow-sky-600/20"
        >
          Закрити чек
        </button>
      </div>
    </div>
  );
}