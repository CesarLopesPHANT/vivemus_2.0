export type UserRole = 'PF' | 'PJ' | 'ADM' | 'MASTER';
export type PlanStatus = 'ACTIVE' | 'BLOCKED';

export interface UserData {
  id: string;
  name: string;
  email: string;
  type: UserRole;
  avatar: string;
  planStatus: PlanStatus;
  planId: string;
  cpf: string;
  cellPhone: string;
  birthDate: string;
  timezone: string;
  tagId: string;
  mustChangePassword?: boolean;
  healthProfile?: HealthProfile;
  isValidated?: boolean;
}

export interface HealthProfile {
  bloodType: string;
  age: number;
  height: number;
  weight: number;
  medicalHistory: string;
  allergies: string;
  cpf?: string;
  birthDate?: string;
  phone?: string;
  planId?: string;
}

export type View = 'start' | 'dashboard' | 'schedule' | 'records' | 'consultation' | 'aichat' | 'pharmacy' | 'partner' | 'partners_list' | 'profile' | 'health' | 'admin' | 'company';
