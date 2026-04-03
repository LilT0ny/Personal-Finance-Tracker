export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  note?: string;
  created_at: string;
}

export type Category = 
  | 'food' 
  | 'transport' 
  | 'health' 
  | 'entertainment'
  | 'shopping' 
  | 'utilities' 
  | 'savings' 
  | 'other';

export interface CategoryConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  is_default?: boolean;
}

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { id: 'food', label: 'Comida', icon: 'UtensilsCrossed', color: '#f97316', is_default: true },
  { id: 'transport', label: 'Transporte', icon: 'Car', color: '#3b82f6', is_default: true },
  { id: 'health', label: 'Salud', icon: 'Heart', color: '#ef4444', is_default: true },
  { id: 'entertainment', label: 'Entretenimiento', icon: 'Gamepad2', color: '#a855f7', is_default: true },
  { id: 'shopping', label: 'Compras', icon: 'ShoppingBag', color: '#ec4899', is_default: true },
  { id: 'utilities', label: 'Servicios', icon: 'Zap', color: '#eab308', is_default: true },
  { id: 'savings', label: 'Ahorros', icon: 'PiggyBank', color: '#22c55e', is_default: true },
  { id: 'other', label: 'Otros', icon: 'MoreHorizontal', color: '#6b7280', is_default: true },
];

export const CATEGORIES: CategoryConfig[] = [...DEFAULT_CATEGORIES];

export const getCategoryConfig = (categoryId: string): CategoryConfig => {
  return CATEGORIES.find(c => c.id === categoryId) || { id: categoryId, label: 'Otros', icon: 'MoreHorizontal', color: '#6b7280' };
};
