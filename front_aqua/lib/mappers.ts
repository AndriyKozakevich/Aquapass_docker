import { Order, Ticket } from "@/types/orders"; 
import { StaffMember } from "@/types/staff";

export const mapBackendStaffToFrontend = (raw: any): StaffMember => {
  const rawRole = raw.role || raw.Role || "Cashier";
  
  return {
    id: raw.id || raw.Id || "",
    fullName: raw.fullName || raw.FullName || "Невідомий",
    email: raw.email || raw.Email || "",
    role: rawRole === "Admin" ? "Admin" : "Cashier",
    createdAt: (raw.createdAt || raw.CreatedAt) 
      ? new Date(raw.createdAt || raw.CreatedAt) 
      : new Date(),
  };
};

const formatTicketName = (rawName: string = ""): string => {
  const lower = rawName.toLowerCase();
  if (lower.includes("дит") || lower.includes("child")) return "Дитячий квиток";
  if (lower.includes("дор") || lower.includes("adult")) return "Дорослий квиток";
  if (lower.includes("бунгало") || lower.includes("bungalow")) return "Бунгало";
  if (lower.includes("лежак") || lower.includes("sunbed")) return "Шезлонг";
  return rawName.replace(/\s*\(.*?\)\s*/g, "").trim() || "Вхідний квиток";
};

export const mapBackendOrderToFrontend = (raw: any): Order => {
  const rawTickets: any[] = raw.tickets || raw.Tickets || [];
  const rawStatus = (raw.status || raw.Status || "Created").toLowerCase();

  let presentationType: "paid" | "validated" | "cancelled" = "paid";
  let presentationLabel = "Оплачено";

  if (rawStatus === "cancelled") {
    presentationType = "cancelled";
    presentationLabel = "Скасовано";
  } else {
    const hasValidated = rawTickets.some((t: any) => (t.status || t.Status) === "Used");
    if (hasValidated || rawStatus === "completed") {
      presentationType = "validated";
      presentationLabel = "Валідовано";
    }
  }

  const fName = raw.customerFirstName || raw.CustomerFirstName || raw.firstName || raw.FirstName || "";
  const lName = raw.customerLastName || raw.CustomerLastName || raw.lastName || raw.LastName || "";
  const fullName = [lName, fName].filter(Boolean).join(" ") || raw.customerName || raw.CustomerName || "Гість без імені";

  const mappedTickets: Ticket[] = rawTickets.map((t: any) => {
    const rawName = t.tariffName || t.TariffName || t.entranceType || t.EntranceType || "";
    return {
      id: t.id || t.Id || Math.random().toString(),
      ticketCode: t.ticketCode || t.TicketCode || "",
      displayName: formatTicketName(rawName),
      tariffName: formatTicketName(rawName), // <--- ДОДАЙ ОСЬ ЦЕЙ РЯДОК
      price: t.price ?? t.Price ?? t.totalPrice ?? t.TotalPrice ?? t.entrancePrice ?? t.EntrancePrice ?? 0,
      status: t.status || t.Status || "Created",
      sunbedInfo: t.sunbedInfo || t.SunbedInfo || t.sunbedDetails || t.SunbedDetails || null,
      isChild: rawName.toLowerCase().includes("дит") || rawName.toLowerCase().includes("child"),
      isBungalow: rawName.toLowerCase().includes("бунгало") || rawName.toLowerCase().includes("bungalow"),
    };
  });

  return {
    id: raw.id || raw.Id || raw.orderId || raw.OrderId ,
    orderNumber: raw.orderNumber || raw.OrderNumber || raw.id || raw.Id || "N/A",
    visitDate: (raw.visitDate || raw.VisitDate) ? new Date(raw.visitDate || raw.VisitDate) : null,
    createdAt: (raw.createdAt || raw.CreatedAt) ? new Date(raw.createdAt || raw.CreatedAt) : null,
    customerFullName: fullName,
    customerEmail: raw.customerEmail || raw.CustomerEmail || "Не вказано",
    customerPhone: raw.customerPhone || raw.CustomerPhone || "—",
    totalAmount: raw.totalAmount ?? raw.TotalAmount ?? 0,
    tickets: mappedTickets,
    presentation: {
      label: presentationLabel,
      type: presentationType,
    }
  };
};