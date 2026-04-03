import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  period: 'weekly' | 'monthly';
  type: 'income' | 'expense';
  created_at: string;
  updated_at: string;
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchBudgets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('category');

      if (error) throw error;
      setBudgets(data || []);
    } catch (err) {
      console.error('Error fetching budgets:', err);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  const addBudget = async (budget: Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Debes iniciar sesión');

    const { data, error } = await supabase
      .from('budgets')
      .insert({
        user_id: user.id,
        ...budget,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchBudgets();
    return data;
  };

  const updateBudget = async (id: string, updates: Partial<Budget>) => {
    if (!user) throw new Error('Debes iniciar sesión');

    const { error } = await supabase
      .from('budgets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchBudgets();
  };

  const deleteBudget = async (id: string) => {
    if (!user) throw new Error('Debes iniciar sesión');

    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchBudgets();
  };

  const getBudgetForCategory = (category: string, type: 'income' | 'expense', period: 'weekly' | 'monthly') => {
    return budgets.find(b => b.category === category && b.type === type && b.period === period);
  };

  useEffect(() => {
    fetchBudgets();
  }, [user?.id]);

  return {
    budgets,
    loading,
    addBudget,
    updateBudget,
    deleteBudget,
    getBudgetForCategory,
    refetch: fetchBudgets,
  };
}
