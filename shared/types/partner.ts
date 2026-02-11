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
