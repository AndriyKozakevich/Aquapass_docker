export interface Ticket {
  id: string;
  ticketCode: string;
  tariffName: string;
  price: number;
  status: string;
  sunbedInfo: string | null;
  isChild: boolean;
  isBungalow: boolean;
}

export interface OrderDetails {
  id: string;
  orderNumber: string;
  visitDate: Date;
  customerEmail: string;
  totalAmount: number;
  status: string;
  tickets: Ticket[];
}

export interface Order {
  id: string;
  orderNumber: string;
  visitDate: Date | null;
  createdAt: Date | null;
  customerFullName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  tickets: Ticket[];
  
  presentation: {
    label: string;
    type: "paid" | "validated" | "cancelled";
  };
}