"use client";

import React, { useState, useEffect } from "react";
import { Tariff } from "@/types/tariffs";
import { TariffService } from "@/lib/api/tariffService";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

import TariffForm from "@/components/tariffs/TariffForm";
import TariffList from "@/components/tariffs/TariffList";

export default function AdminTariffPanel() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadTariffs();
  }, []);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const loadTariffs = async () => {
    setIsLoading(true);
    try {
      const data = await TariffService.getAll();
      setTariffs(data);
    } catch (error: any) {
      showMessage(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (formData: Tariff) => {
    try {
      if (editingTariff && formData.id) {
        await TariffService.update(formData.id, formData);
        showMessage("Тариф успішно оновлено!", "success");
      } else {
        await TariffService.create(formData);
        showMessage("Тариф успішно створено!", "success");
      }
      setEditingTariff(null);
      loadTariffs();
    } catch (error: any) {
      showMessage(error.message, "error");
    }
  };

  const handleEdit = (tariff: Tariff) => {
    setEditingTariff(tariff);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Ви впевнені, що хочете видалити цей тариф?")) return;
    try {
      await TariffService.delete(id);
      showMessage("Тариф видалено", "success");
      loadTariffs();
    } catch (error: any) {
      showMessage(error.message, "error");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Управління тарифами</h1>
        <p className="text-gray-500 mt-2">Створення, редагування та видалення цінових планів</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 shadow-sm border ${message.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="w-4 h-4 opacity-50 hover:opacity-100" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <TariffForm 
            initialData={editingTariff} 
            onSubmit={handleFormSubmit} 
            onCancel={() => setEditingTariff(null)} 
          />
        </div>
        <div className="lg:col-span-2">
          <TariffList 
            tariffs={tariffs} 
            isLoading={isLoading} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        </div>
      </div>
    </div>
  );
}