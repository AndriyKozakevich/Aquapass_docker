export interface StaffSession {
  token: string;
  fullName: string;
  email: string;
  role: "Admin" | "Cashier";
  expiresAt: string;
}

const TOKEN_KEY = "staff_token";
const USER_KEY = "staff_user";

export const saveStaffSession = (data: StaffSession) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      expiresAt: data.expiresAt,
    })
  );

  const expires = data.expiresAt
    ? `; expires=${new Date(data.expiresAt).toUTCString()}`
    : "";
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(data.token)}; path=/${expires}`;
  document.cookie = `staff_role=${encodeURIComponent(data.role)}; path=/${expires}`;
};

export const getStaffToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const getStaffUser = (): { fullName: string; email: string; role: string } | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearStaffSession = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  document.cookie = "staff_role=; path=/; max-age=0";
};