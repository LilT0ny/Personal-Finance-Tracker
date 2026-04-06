// =====================================================
// TIPOS PARA EL NUEVO SCHEMA DE SUPABASE
// =====================================================

// Usuario del sistema
export interface Usuario {
  id: string;
  auth_user_id?: string; // Opcional - ahora no usamos Supabase Auth
  cedula: string;
  email: string;
  password_hash: string; // Hash de contraseña
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  telefono?: string;
  fecha_nacimiento: string;
  edad?: number; // Calculado dinámicamente
  created_at: string;
  updated_at: string;
}

// Transacciones (ingresos/egresos)
export interface Transaction {
  id: string;
  usuario_id: string;
  categoria_id: string;
  monto: number;
  tipo: 'Ingreso' | 'Egreso' | 'income' | 'expense'; //兼容新旧格式
  fecha: string;
  descripcion?: string;
  created_at: string;
  // Campos adicionales para visualización
  category?: string;
  category_icon?: string;
  category_color?: string;
}

// Categoría del usuario
export interface Categoria {
  id: string;
  usuario_id: string;
  nombre: string;
  icono: string;
  limite_gastos: number;
  color: string;
  fecha_creacion: string;
}

// Tipos para categorías (configuración local)
export interface CategoryConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  is_default?: boolean;
  limit_monthly?: number;
}

// Categorías predefinidas (para onboarding)
export const PREDEFINED_CATEGORIES: CategoryConfig[] = [
  { id: 'food', label: 'Comida', icon: 'UtensilsCrossed', color: '#f97316', is_default: true },
  { id: 'transport', label: 'Transporte', icon: 'Car', color: '#3b82f6', is_default: true },
  { id: 'entertainment', label: 'Entretenimiento', icon: 'Gamepad2', color: '#a855f7', is_default: true },
  { id: 'shopping', label: 'Compras', icon: 'ShoppingBag', color: '#ec4899', is_default: true },
  { id: 'health', label: 'Salud', icon: 'Heart', color: '#ef4444', is_default: true },
  { id: 'utilities', label: 'Servicios', icon: 'Zap', color: '#eab308', is_default: true },
  { id: 'savings', label: 'Ahorros', icon: 'PiggyBank', color: '#22c55e', is_default: true },
  { id: 'other', label: 'Otros', icon: 'MoreHorizontal', color: '#6b7280', is_default: true },
];
