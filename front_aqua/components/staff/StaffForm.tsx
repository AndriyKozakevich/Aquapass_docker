"use client";

import React, { useState } from "react";
import { CreateStaffDto, StaffRole } from "@/types/staff";

interface StaffFormProps {
  onSubmit: (data: CreateStaffDto) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
  successMessage: string | null;
}

export default function StaffForm({ onSubmit, isSubmitting, errorMessage, successMessage }: StaffFormProps) {
  // Локальний стейт форми. Зміни тут НЕ перемальовують список працівників!
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("Cashier");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Викликаємо функцію, передану з батьківського компонента
    await onSubmit({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      role,
    });

    // Очищаємо форму після успішної відправки (якщо немає помилки)
    if (!errorMessage) {
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("Cashier");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
      <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
        Новий співробітник
      </h2>

      {errorMessage && (
        <div className="bg-rose-950/50 border border-rose-600/50 text-rose-300 p-3 rounded-xl text-xs">
          ⚠️ {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-950/50 border border-emerald-600/50 text-emerald-300 p-3 rounded-xl text-xs">
          ✓ {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            ПІБ
          </label>
          <input
            type="text"
            required
            placeholder="Олексій Гончар"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Корпоративний Email
          </label>
          <input
            type="email"
            required
            placeholder="cashier1@aquapass.ua"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Тимчасовий Пароль
          </label>
          <input
            type="password"
            required
            placeholder="Мінімум 6 символів"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Посада
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("Cashier")}
              className={`py-2 rounded-xl border text-xs font-semibold transition ${
                role === "Cashier" ? "bg-sky-500/20 border-sky-500 text-sky-300" : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              🎫 Касир
            </button>
            <button
              type="button"
              onClick={() => setRole("Admin")}
              className={`py-2 rounded-xl border text-xs font-semibold transition ${
                role === "Admin" ? "bg-purple-500/20 border-purple-500 text-purple-300" : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              👑 Адмін
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-emerald-600/20 mt-2"
        >
          {isSubmitting ? "Створення..." : "Зберегти співробітника"}
        </button>
      </form>
    </div>
  );
}