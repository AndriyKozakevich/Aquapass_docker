import { fetchClient } from "./fetchClient";
import { OrderDetails } from "@/types/orders";

export const OrderService = {
  async confirmPayment(orderId: string): Promise<void> {
    await fetchClient(`/payments/confirm/${orderId}`, { method: "POST" });
  },

  async getOrderById(orderId: string): Promise<OrderDetails> {
    const response = await fetchClient(`/Orders/${orderId}`);
    const raw = await response.json();

    const tickets = (raw.tickets || []).map((t: any) => ({
      id: t.id || Math.random().toString(),
      ticketCode: t.ticketCode || "",
      tariffName: t.tariffName || "Вхідний квиток",
      sunbedInfo: t.sunbedInfo || null,
      price: t.totalTicketPrice ?? t.TotalTicketPrice ?? t.price ?? t.totalPrice ?? 0,
    }));

    return {
      id: raw.id,
      orderNumber: raw.orderNumber || raw.id.substring(0, 8).toUpperCase(),
      visitDate: new Date(raw.visitDate || raw.VisitDate),
      customerEmail: raw.customerEmail || raw.CustomerEmail || "Не вказано",
      totalAmount: raw.totalAmount ?? raw.TotalAmount ?? 0,
      status: raw.status || raw.Status || "Unknown",
      tickets,
    };
  }
};