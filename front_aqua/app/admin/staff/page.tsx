"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStaffToken, getStaffUser, clearStaffSession } from "@/lib/auth";

interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  role: "Admin" | "Cashier" | string;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:5000/api";

export default function StaffManagementPage() {
  const router = useRouter();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Поля для форми
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<"Cashier" | "Admin">("Cashier");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<{ fullName: string; email: string; role: string } | null>(null);

  const fetchStaffList = async () => {
    const token = getStaffToken();
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/Staff`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 || res.status === 403) {
        clearStaffSession();
        router.push("/login");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error("Не вдалося завантажити список персоналу", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  // Зчитуємо користувача ТІЛЬКИ на клієнті
  const user = getStaffUser();
  setCurrentUser(user);

  fetchStaffList();
}, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const token = getStaffToken();

    try {
      const res = await fetch(`${API_BASE}/Staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(`Співробітника "${fullName}" успішно зареєстровано!`);
        setFullName("");
        setEmail("");
        setPassword("");
        setRole("Cashier");
        fetchStaffList();
      } else {
        setErrorMessage(data.message || "Помилка при створенні співробітника.");
      }
    } catch (err) {
      setErrorMessage("Помилка зв'язку з сервером.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Видалити співробітника "${name}"?`)) return;

    const token = getStaffToken();
    try {
      const res = await fetch(`${API_BASE}/Staff/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        fetchStaffList();
      } else {
        const data = await res.json();
        alert(data.message || "Помилка видалення.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Хедер */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-sky-400">
              Управління персоналом
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Створення облікових записів касирів та адміністраторів
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
              Ви увійшли як: <strong className="text-white">{currentUser?.fullName}</strong>
            </span>
            <button
              onClick={() => {
                clearStaffSession();
                router.push("/login");
              }}
              className="bg-rose-950/60 border border-rose-800/80 text-rose-300 hover:bg-rose-900 px-3.5 py-2 rounded-xl text-xs font-semibold transition"
            >
              Вийти
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Форма додавання */}
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

            <form onSubmit={handleCreate} className="space-y-3">
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
                      role === "Cashier"
                        ? "bg-sky-500/20 border-sky-500 text-sky-300"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    🎫 Касир
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("Admin")}
                    className={`py-2 rounded-xl border text-xs font-semibold transition ${
                      role === "Admin"
                        ? "bg-purple-500/20 border-purple-500 text-purple-300"
                        : "bg-slate-950 border-slate-800 text-slate-400"
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

          {/* Список персоналу */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
              Штат співробітників ({staffList.length})
            </h2>

            {isLoading ? (
              <div className="text-center py-12 text-slate-500 text-xs">Завантаження списку...</div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">Працівників не знайдено.</div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {staffList.map((member) => (
                  <div
                    key={member.id}
                    className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {member.fullName}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            member.role === "Admin"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          }`}
                        >
                          {member.role === "Admin" ? "Адміністратор" : "Касир"}
                        </span>
                      </div>
                      <div className="text-slate-400 font-mono text-[11px]">
                        ✉️ {member.email} • Додано: {new Date(member.createdAt).toLocaleDateString("uk-UA")}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(member.id, member.fullName)}
                      className="text-slate-500 hover:text-rose-400 text-xs p-2 rounded-lg hover:bg-slate-900 transition"
                      title="Видалити співробітника"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}