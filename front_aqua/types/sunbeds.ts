export interface Sunbed {
  id: string;
  number: number;
  row: string;
  zoneId?: string;
  description?: string;
  isAvailable?: boolean;
}

export interface CreateSingleSunbedDto {
  row: string;
  number: number;
  zoneId: string;
}

export interface CreateRangeSunbedDto {
  row: string;
  count: number;
}