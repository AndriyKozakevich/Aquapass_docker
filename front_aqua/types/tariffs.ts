export type ServiceType = "EntranceTicketAdult" | "EntranceTicketChild" | "Sunbed" | "Bungalow";
export type DayType = "Weekday" | "Weekend";

export interface Zone {
  id: number;
  name?: string;
}

export interface Tariff {
  id?: number;
  name: string;
  price: number;
  serviceType: ServiceType;
  dayType: DayType;
  zoneId: number;
  zone?: Zone;
}