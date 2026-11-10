import { Sunbed } from "./sunbeds";
import { Tariff } from "./tariffs";

export interface SelectedSunbedItem {
  sunbed: Sunbed;
  isChild: boolean;
}

export interface ExtraItem {
  tariffId: number; 
  quantity: number;
}