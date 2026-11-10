import { getStaffToken } from "@/lib/auth";
import { Sunbed, CreateSingleSunbedDto, CreateRangeSunbedDto } from "@/types/sunbeds";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/Sunbed`
  : "http://localhost:5000/api/Sunbed";

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getStaffToken()}`,
});

export const SunbedService = {
  async getAll(): Promise<Sunbed[]> {
    const res = await fetch(API_BASE, { headers: getHeaders() });
    if (!res.ok) throw new Error("Не вдалося завантажити список шезлонгів.");
    return res.json();
  },

  async getByDate(date: string): Promise<Sunbed[]> {
    const res = await fetch(`${API_BASE}/available?visitDate=${date}`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Не вдалося отримати статус шезлонгів на цю дату.");
    return res.json();
  },

  async createSingle(dto: CreateSingleSunbedDto): Promise<void> {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        ...dto,
        price: 0,
        isAvailable: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      let errorMessage = `Помилка сервера: статус ${res.status}`;
      try {
        if (text) errorMessage = JSON.parse(text).message || text;
      } catch {
        errorMessage = text || errorMessage;
      }
      throw new Error(errorMessage);
    }
  },

  async createRange(dto: CreateRangeSunbedDto): Promise<void> {
    const rowParam = encodeURIComponent(dto.row);
    const res = await fetch(`${API_BASE}/range?row=${rowParam}&count=${dto.count}`, {
      method: "POST",
      headers: getHeaders(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Помилка при генерації ряду шезлонгів");
    }
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Помилка під час видалення");
  }
};