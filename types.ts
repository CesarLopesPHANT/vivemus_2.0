
export enum Specialty {
  CARDIOLOGIA = 'Cardiologia',
  DERMATOLOGIA = 'Dermatologia',
  PEDIATRIA = 'Pediatria',
  CLINICO_GERAL = 'Clínica Geral',
  PSICOLOGIA = 'Psicologia',
  ORTOPEDIA = 'Ortopedia'
}

export interface Doctor {
  id: string;
  name: string;
  specialty: Specialty;
  avatar: string;
  rating: number;
}

export interface Appointment {
  id: string;
  date: string;
  time: string;
  doctorId: string;
  doctorName: string;
  specialty: Specialty;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  type: 'VIDEO' | 'PRESENTIAL';
}

export interface MedicalRecord {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  doctorCRM: string;
  specialty: string;
  type: string;
  status: string;
  protocol: string;
  channel: string;
  description: string;
  complaint: string;
  upshot: string;
  cid10: string;
  prescription: string[];
  files: { name: string; url: string }[];
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

export interface UserExam {
  id: string;
  name: string;
  date: string;
  laboratory: string;
  category: string;
  url: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Partner {
  id: string;
  name: string;
  category: string;
  whatsapp: string;
  coupon: string;
  discount: string;
  image: string;
  description: string;
  rating: number;
  is_active: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  time: string;
}
