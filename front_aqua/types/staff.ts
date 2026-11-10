export type StaffRole = "Admin" | "Cashier";

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  createdAt: Date; 
}

export interface CreateStaffDto {
  fullName: string;
  email: string;
  password?: string;
  role: StaffRole;
}