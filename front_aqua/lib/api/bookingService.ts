import { fetchClient } from "./fetchClient";
import { Sunbed } from "@/types/sunbeds";
import { Tariff } from "@/types/tariffs";

export const BookingService = {
  // Отримання списку тарифів
  async getTariffs(): Promise<Tariff[]> {
    const res = await fetchClient("/Tariffs");
    const data = await res.json();
    return data.map((t: any) => ({
      id: t.id || t.Id,
      name: t.name || t.Name,
      serviceType: t.serviceType || t.ServiceType,
      dayType: t.dayType || t.DayType,
      price: t.price || t.Price,
    }));
  },

  // Отримання шезлонгів на конкретну дату
  async getSunbeds(date: string, token: string): Promise<Sunbed[]> {
    const url = token 
      ? `/Sunbed/available?visitDate=${date}&holdToken=${token}`
      : `/Sunbed/available?visitDate=${date}`;
    const res = await fetchClient(url);
    const data = await res.json();
    return data.map((s: any) => ({
      id: s.id || s.Id,
      number: s.number || s.Number,
      row: s.row || s.Row,
      isAvailable: s.isAvailable ?? true,
    }));
  },

  // Заблокувати шезлонг (Redis Hold)
  async holdSunbed(id: string, date: string, token: string): Promise<void> {
    await fetchClient(`/Sunbed/${id}/hold`, {
      method: "POST",
      body: JSON.stringify({ visitDate: date, holdToken: token }),
    });
  },

  // Розблокувати шезлонг
  async releaseSunbed(id: string, date: string, token: string): Promise<void> {
    await fetchClient(`/Sunbed/${id}/release-hold`, {
      method: "POST",
      body: JSON.stringify({ visitDate: date, holdToken: token }),
    });
  },

  async createOrder(payload: any): Promise<any> {
    const res = await fetchClient("/Orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    
    const data = await res.json();
    
    return {
      ...data,
      id: data.id || data.Id || data.orderId || data.OrderId,
      orderNumber: data.orderNumber || data.OrderNumber,
      totalAmount: data.totalAmount ?? data.TotalAmount ?? 0,
      tickets: data.tickets || data.Tickets || []
    };
  },

  async createMonobankCheckout(orderId: string): Promise<string> {
    const res = await fetchClient(`/Payments/create-checkout/${orderId}`, {
      method: "POST"
    });
    const data = await res.json();
    return data.paymentUrl;
  }
};