export interface Stats {
  franchise_count: number;
  career_count: number;
  contact_count: number;
  menu_count: number;
  product_count: number;
  job_opening_count: number;
  order_count: number;
  total_revenue: number;
  admin_count: number;
  pending_franchise: number;
  pending_careers: number;
  pending_contacts: number;
  submitted_franchise: number;
  under_process_franchise: number;
  approved_franchise: number;
  rejected_franchise: number;
  approved_careers: number;
  rejected_careers: number;
  pending_orders: number;
  preparing_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  today_orders: number;
  today_revenue: number;
  products_online: number;
  franchise_month_count: number;
}

export interface App {
  id: number;
  full_name?: string;
  name?: string;
  email: string;
  phone?: string;
  status: string;
  admin_notes?: string;
  created_at: string;
  preferred_location?: string;
  investment_capability?: string;
  position?: string;
  subject?: string;
  message?: string;
  resume_url?: string;
  aadhaar?: string;
  pan?: string;
  bank_statement?: string;
  id_proof?: string;
  address_proof?: string;
  other_docs?: string;
}

export interface MenuItem {
  id: number;
  category: string;
  name: string;
  description: string;
  price: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  original_price: number;
  category: string;
  image_url: string;
  stock: number;
  is_active: boolean;
  offer: string;
  sort_order: number;
}

export interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  description: string;
  requirements: string;
  salary_range: string;
  job_type: string;
  is_active: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  items: string;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface OrderStats {
  daily: Record<string, { orders: number; revenue: number }>;
  monthly: Record<string, { orders: number; revenue: number }>;
  today_orders: number;
  today_revenue: number;
  week_orders: number;
  week_revenue: number;
  month_orders: number;
  month_revenue: number;
  total_orders: number;
  total_revenue: number;
  pending: number;
  preparing: number;
  delivered: number;
  cancelled: number;
}

export type Tab =
  | "overview"
  | "franchise"
  | "careers"
  | "contacts"
  | "orders"
  | "charts"
  | "menu"
  | "products"
  | "jobs"
  | "admins"
  | "logs";

export interface OrderItem {
  id: string | number;
  name: string;
  quantity: number;
  price: number;
  image_url?: string;
}

export interface ContactItem {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export interface LogItem {
  id: number;
  admin_id: number;
  action: string;
  details: string;
  created_at: string;
}

export function parseOrderItems(items: string): OrderItem[] {
  try {
    return JSON.parse(items || "[]");
  } catch {
    return [];
  }
}
