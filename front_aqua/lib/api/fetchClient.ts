import { clearStaffSession } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:5000/api";

export const fetchClient = async (endpoint: string, options: RequestInit = {}) => {

  let token = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("token"); // або getStaffToken()
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 || res.status === 403) {
    console.warn("Токен протермінувався. Вихід...");
    clearStaffSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Неавторизовано");
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(errorText || `Помилка HTTP: ${res.status}`);
  }

  return res;
};