"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveStaffSession } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/api` 
  : "http://localhost:5000/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE}/Staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.ok) {
        saveStaffSession({
          token: data.token,
          fullName: data.fullName,
          email: data.email,
          role: data.role,
          expiresAt: data.expiresAt,
        });

        if (data.role === "Admin") {
          router.push("/admin/orders");
        } else {
          router.push("/cashier/scanner");
        }
      } else {
        setErrorMessage(data.message || "Невірний email або пароль.");
      }
    } catch (err) {
      setErrorMessage("Помилка підключення до сервера бекенду.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 text-2xl">
            🛡️
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            AquaPass Staff Portal
          </h1>
          <p className="text-xs text-slate-400">
            Вхід для персоналу комплексу
          </p>
        </div>

        {errorMessage && (
          <div className="bg-rose-950/50 border border-rose-600/50 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs font-semibold animate-in fade-in">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Корпоративний Email
            </label>
            <input
              type="email"
              required
              placeholder="admin@aquapass.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500 transition font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Пароль
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-xs transition shadow-lg shadow-sky-600/20 mt-2"
          >
            {isLoading ? "Перевірка доступу..." : "Увійти в систему"}
          </button>
        </form>

        <div className="text-center text-[11px] text-slate-600">
          Створення нових акаунтів здійснюється адміністратором комплексу
        </div>

      </div>
    </div>
  );
}