"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStaffToken, getStaffUser, clearStaffSession } from "@/lib/auth";

import { StaffMember, CreateStaffDto } from "@/types/staff";
import { mapBackendStaffToFrontend } from "@/lib/mappers";
import StaffForm from "@/components/staff/StaffForm";
import StaffList from "@/components/staff/StaffList";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:5000/api";

export default function StaffManagementPage() {
  const router = useRouter();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<{ fullName: string; email: string; role: string } | null>(null);

  // Стейт виключно для результату відправки форми
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const fetchStaffList = async () => {
    const token = getStaffToken();
    if (!token) return router.push("/login");

    try {
      const res = await fetch(`${API_BASE}/Staff`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        clearStaffSession();
        router.push("/login");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        // Мапимо брудні дані у чистий масив
        setStaffList(data.map(mapBackendStaffToFrontend));
      }
    } catch (err) {
      console.error("Не вдалося завантажити список персоналу", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentUser(getStaffUser());
    fetchStaffList();
  }, []);

  const handleCreateStaff = async (dto: CreateStaffDto) => {
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
        body: JSON.stringify(dto), // DTO вже чисте і готове
      });

      if (res.ok) {
        setSuccessMessage(`Співробітника "${dto.fullName}" успішно зареєстровано!`);
        fetchStaffList(); // Оновлюємо список
      } else {
        const data = await res.json();
        setErrorMessage(data.message || "Помилка при створенні співробітника.");
      }
    } catch (err) {
      setErrorMessage("Помилка зв'язку з сервером.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Видалити співробітника "${name}"?`)) return;

    const token = getStaffToken();
    try {
      const res = await fetch(`${API_BASE}/Staff/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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

  const handleLogout = () => {
    clearStaffSession();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Хедер (Залишаємо тут, бо він специфічний для сторінки) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-sky-400">Управління персоналом</h1>
            <p className="text-xs text-slate-400 mt-0.5">Створення облікових записів касирів та адміністраторів</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
              Ви увійшли як: <strong className="text-white">{currentUser?.fullName}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="bg-rose-950/60 border border-rose-800/80 text-rose-300 hover:bg-rose-900 px-3.5 py-2 rounded-xl text-xs font-semibold transition"
            >
              Вийти
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <StaffForm 
            onSubmit={handleCreateStaff}
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
            successMessage={successMessage}
          />

          <StaffList 
            staffList={staffList} 
            isLoading={isLoading} 
            onDelete={handleDeleteStaff} 
          />
        </div>

      </div>
    </div>
  );
}