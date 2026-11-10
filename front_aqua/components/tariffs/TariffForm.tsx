"use client";

import React, { useState, useEffect } from "react";
import { Tariff } from "@/types/tariffs";
import { Plus, Edit2, Save, Loader2 } from "lucide-react";

interface TariffFormProps {
  initialData: Tariff | null;
  onSubmit: (data: Tariff) => Promise<void>;
  onCancel: () => void;
}

const defaultForm: Tariff = {
  name: "",
  price: 0,
  serviceType: "EntranceTicketAdult",
  dayType: "Weekday",
  zoneId: 1,
};

export default function TariffForm({ initialData, onSubmit, onCancel }: TariffFormProps) {
  const [formData, setFormData] = useState<Tariff>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData;

  useEffect(() => {
    setFormData(initialData || defaultForm);
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      if (!isEditing) setFormData(defaultForm);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-8">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        {isEditing ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-blue-500" />}
        {isEditing ? "Редагувати тариф" : "Новий тариф"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Назва тарифу</label>
          <input
            type="text" name="name" required placeholder="Напр., Дорослий (Вихідний)"
            value={formData.name} onChange={handleChange}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-black"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Вартість (грн)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₴</span>
            <input
              type="number" name="price" required min="0" step="0.01"
              value={formData.price || ""} onChange={handleChange}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-black"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Тип послуги</label>
          <select
            name="serviceType" value={formData.serviceType} onChange={handleChange}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer text-black"
          >
            <option value="EntranceTicketAdult">Вхідний квиток (Дорослий)</option>
            <option value="EntranceTicketChild">Вхідний квиток (Дитячий)</option>
            <option value="Sunbed">Шезлонг</option>
            <option value="Bungalow">Бунгало</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Тип дня</label>
          <select
            name="dayType" value={formData.dayType} onChange={handleChange}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer text-black"
          >
            <option value="Weekday">Будній день</option>
            <option value="Weekend">Вихідний / Свято</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">ID Зони</label>
          <input
            type="number" name="zoneId" required min="1"
            value={formData.zoneId || ""} onChange={handleChange}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-black"
          />
        </div>

        <div className="pt-4 flex gap-3">
          {isEditing && (
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors">
              Скасувати
            </button>
          )}
          <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isEditing ? "Зберегти" : "Створити"}
          </button>
        </div>
      </form>
    </div>
  );
}