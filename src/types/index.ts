export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  category: Category;
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
  id: Category;
  label: string;
  icon: string;
  color: string;
}

export const CATEGORIES: CategoryConfig[] = [
  { id: 'food', label: 'Comida', icon: 'UtensilsCrossed', color: '#f97316' },
  { id: 'transport', label: 'Transporte', icon: 'Car', color: '#3b82f6' },
  { id: 'health', label: 'Salud', icon: 'Heart', color: '#ef4444' },
  { id: 'entertainment', label: 'Entretenimiento', icon: 'Gamepad2', color: '#a855f7' },
  { id: 'shopping', label: 'Compras', icon: 'ShoppingBag', color: '#ec4899' },
  { id: 'utilities', label: 'Servicios', icon: 'Zap', color: '#eab308' },
  { id: 'savings', label: 'Ahorros', icon: 'PiggyBank', color: '#22c55e' },
  { id: 'other', label: 'Otros', icon: 'MoreHorizontal', color: '#6b7280' },
];

export const getCategoryConfig = (categoryId: Category): CategoryConfig => {
  return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[7];
};
