import { Tariff } from "@/types/tariffs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/Tariffs`
  : "http://localhost:5000/api/Tariffs";

const getHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const TariffService = {
  async getAll(): Promise<Tariff[]> {
    const res = await fetch(API_BASE, { headers: getHeaders() });
    if (!res.ok) throw new Error("Не вдалося завантажити тарифи");
    return res.json();
  },

  async create(tariff: Tariff): Promise<void> {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(tariff),
    });
    if (!res.ok) throw new Error("Помилка при створенні тарифу");
  },

  async update(id: number, tariff: Tariff): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(tariff),
    });
    if (!res.ok) throw new Error("Помилка при оновленні тарифу");
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Не вдалося видалити тариф");
  },
};