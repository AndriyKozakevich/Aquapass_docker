"use client";

import React from "react";
import { Tariff } from "@/types/tariffs";
import { Loader2, Receipt, Edit2, Trash2 } from "lucide-react";

interface TariffListProps {
  tariffs: Tariff[];
  isLoading: boolean;
  onEdit: (tariff: Tariff) => void;
  onDelete: (id: number) => void;
}

export default function TariffList({ tariffs, isLoading, onEdit, onDelete }: TariffListProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="text-xl font-bold text-gray-800">Існуючі тарифи</h2>
        <span className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-sm font-semibold">
          Всього: {tariffs.length}
        </span>
      </div>

      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
          <p>Завантаження тарифів...</p>
        </div>
      ) : tariffs.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-lg">Тарифів ще немає</p>
          <p className="text-sm mt-1">Створіть свій перший тариф у формі зліва.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                <th className="py-4 px-6 font-semibold">Назва & Тип</th>
                <th className="py-4 px-6 font-semibold">День</th>
                <th className="py-4 px-6 font-semibold">Ціна</th>
                <th className="py-4 px-6 font-semibold text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tariffs.map((tariff) => (
                <tr key={tariff.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <p className="font-semibold text-gray-900">{tariff.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium bg-gray-100 inline-block px-2 py-0.5 rounded">
                      {tariff.serviceType}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tariff.dayType === "Weekend" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                      {tariff.dayType === "Weekend" ? "Вихідний" : "Будній"}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-bold text-gray-900">{tariff.price} ₴</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(tariff)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Редагувати">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => tariff.id && onDelete(tariff.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Видалити">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}