import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Budget {
  id: string;
  usuario_id: string;
  categoria_id: string;
  category?: string; // Para compatibilidad
  limit_amount: number;
  period: 'weekly' | 'monthly';
  type: 'income' | 'expense';
}

function getUsuarioId(): string | null {
  return localStorage.getItem('usuario_id');
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBudgets = async () => {
    const usuarioId = getUsuarioId();
    
    if (!usuarioId) {
      setBudgets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get categories with budget limits
      const { data, error } = await supabase
        .from('categorias')
        .select('id, usuario_id, nombre, limite_gastos')
        .eq('usuario_id', usuarioId)
        .gt('limite_gastos', 0);

      if (error) throw error;
      
      // Convert to Budget format
      const budgetData: Budget[] = (data || []).map(cat => ({
        id: cat.id,
        usuario_id: cat.usuario_id,
        categoria_id: cat.id,
        category: cat.nombre, // Include category name for compatibility
        limit_amount: cat.limite_gastos,
        period: 'monthly' as const,
        type: 'expense' as const,
      }));

      setBudgets(budgetData);
    } catch (err) {
      console.error('Error fetching budgets:', err);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  const addBudget = async (budget: Omit<Budget, 'id' | 'usuario_id' | 'category'>) => {
    const usuarioId = getUsuarioId();
    if (!usuarioId) throw new Error('Debes iniciar sesión');

    const { data, error } = await supabase
      .from('categorias')
      .update({ limite_gastos: budget.limit_amount })
      .eq('id', budget.categoria_id)
      .eq('usuario_id', usuarioId)
      .select()
      .single();

    if (error) throw error;
    await fetchBudgets();
    return data;
  };

  const updateBudget = async (id: string, updates: Partial<Budget>) => {
    if (updates.limit_amount !== undefined) {
      const { error } = await supabase
        .from('categorias')
        .update({ limite_gastos: updates.limit_amount })
        .eq('id', id);

      if (error) throw error;
    }
    await fetchBudgets();
  };

  const deleteBudget = async (id: string) => {
    const { error } = await supabase
      .from('categorias')
      .update({ limite_gastos: 0 })
      .eq('id', id);

    if (error) throw error;
    await fetchBudgets();
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  return {
    budgets,
    loading,
    addBudget,
    updateBudget,
    deleteBudget,
    refetch: fetchBudgets,
  };
}
