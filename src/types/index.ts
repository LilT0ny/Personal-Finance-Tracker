export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  note?: string;
  created_at: string;
}

export type Category = string;

export interface CategoryConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  is_default?: boolean;
}

// Start with empty categories - user must add all from scratch
export const DEFAULT_CATEGORIES: CategoryConfig[] = [];

export const CATEGORIES: CategoryConfig[] = [...DEFAULT_CATEGORIES];

export const getCategoryConfig = (categoryId: string): CategoryConfig => {
  const found = CATEGORIES.find(c => c.id === categoryId);
  if (found) return found;
  return { id: categoryId, label: categoryId, icon: 'Circle', color: '#6b7280' };
};
