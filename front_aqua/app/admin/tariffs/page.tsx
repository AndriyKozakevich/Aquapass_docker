"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Save,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Receipt,
  X
} from "lucide-react";

// === Типи даних на основі Swagger ===
type ServiceType = "EntranceTicketAdult" | "EntranceTicketChild" | "Sunbed" | "Bungalow";
type DayType = "Weekday" | "Weekend";

interface Zone {
  id: number;
  name?: string;
}

interface Tariff {
  id?: number;
  name: string;
  price: number;
  serviceType: ServiceType;
  dayType: DayType;
  zoneId: number;
  zone?: Zone;
}

// Початковий стан для форми
const initialFormState: Tariff = {
  name: "",
  price: 0,
  serviceType: "EntranceTicketAdult",
  dayType: "Weekday",
  zoneId: 1, // За замовчуванням зона 1
};

export default function AdminTariffPanel() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [formData, setFormData] = useState<Tariff>(initialFormState);
  const [isEditing, setIsEditing] = useState(false);

  // Стани UI
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/Tariffs`
    : "http://localhost:5000/api/Tariffs";

  // Функція для отримання токена та заголовків
  const getAuthHeaders = () => {
    // Перевіряємо, чи ми в браузері (через Next.js SSR)
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // 1. Отримання списку тарифів при завантаженні сторінки
  useEffect(() => {
    fetchTariffs();
  }, []);

  const fetchTariffs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_BASE_URL, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Не вдалося завантажити тарифи");

      const data = await response.json();
      setTariffs(data);
    } catch (error: any) {
      showMessage(error.message || "Помилка з'єднання з сервером", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Допоміжна функція для показу повідомлень
  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // 2. Обробка змін у формі
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  // 3. Створення або Оновлення тарифу
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = isEditing && formData.id ? `${API_BASE_URL}/${formData.id}` : API_BASE_URL;
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(`Помилка при ${isEditing ? "оновленні" : "створенні"} тарифу`);

      showMessage(`Тариф успішно ${isEditing ? "оновлено" : "створено"}!`, "success");
      setFormData(initialFormState);
      setIsEditing(false);
      fetchTariffs(); // Оновлюємо список
    } catch (error: any) {
      showMessage(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Підготовка до редагування
  const handleEdit = (tariff: Tariff) => {
    setFormData(tariff);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 5. Видалення тарифу
  const handleDelete = async (id: number) => {
    if (!window.confirm("Ви впевнені, що хочете видалити цей тариф?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Не вдалося видалити тариф");

      showMessage("Тариф видалено", "success");
      fetchTariffs();
    } catch (error: any) {
      showMessage(error.message, "error");
    }
  };

  const cancelEdit = () => {
    setFormData(initialFormState);
    setIsEditing(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Заголовок сторінки */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Управління тарифами</h1>
        <p className="text-gray-500 mt-2">Створення, редагування та видалення цінових планів</p>
      </div>

      {/* Повідомлення про статус (Toast-подібне) */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 shadow-sm border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="w-4 h-4 opacity-50 hover:opacity-100" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ЛІВА КОЛОНКА: Форма створення/редагування */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              {isEditing ? (
                <Edit2 className="w-5 h-5 text-blue-500" />
              ) : (
                <Plus className="w-5 h-5 text-blue-500" />
              )}
              {isEditing ? "Редагувати тариф" : "Новий тариф"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Назва */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Назва тарифу
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Напр., Дорослий (Вихідний)"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-black"
                />
              </div>

              {/* Ціна */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Вартість (грн)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    ₴
                  </span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price || ""}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-black"
                  />
                </div>
              </div>

              {/* Тип послуги */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Тип послуги
                </label>
                <select
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer text-black"
                >
                  <option value="EntranceTicketAdult">Вхідний квиток (Дорослий)</option>
                  <option value="EntranceTicketChild">Вхідний квиток (Дитячий)</option>
                  <option value="Sunbed">Шезлонг</option>
                  <option value="Bungalow">Бунгало</option>
                </select>
              </div>

              {/* Тип дня */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Тип дня</label>
                <select
                  name="dayType"
                  value={formData.dayType}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer text-black"
                >
                  <option value="Weekday">Будній день</option>
                  <option value="Weekend">Вихідний / Свято</option>
                </select>
              </div>

              {/* ID Зони */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ID Зони</label>
                <input
                  type="number"
                  name="zoneId"
                  value={formData.zoneId || ""}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-black"
                />
              </div>

              <div className="pt-4 flex gap-3">
                {isEditing && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                  >
                    Скасувати
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
                    isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {isEditing ? "Зберегти" : "Створити"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ПРАВА КОЛОНКА: Список тарифів */}
        <div className="lg:col-span-2">
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
                      <tr
                        key={tariff.id}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="py-4 px-6">
                          <p className="font-semibold text-gray-900">{tariff.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 font-medium bg-gray-100 inline-block px-2 py-0.5 rounded">
                            {tariff.serviceType}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              tariff.dayType === "Weekend"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {tariff.dayType === "Weekend" ? "Вихідний" : "Будній"}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-gray-900">{tariff.price} ₴</td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(tariff)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Редагувати"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => tariff.id && handleDelete(tariff.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Видалити"
                            >
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
        </div>
      </div>
    </div>
  );
}