import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types';
import { useAuth } from '../context/AuthContext';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar transacciones');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Add new transaction
  const addTransaction = async (
    amount: number,
    category: string,
    type: 'income' | 'expense',
    note?: string
  ) => {
    if (!user) {
      throw new Error('Debes iniciar sesión para agregar transacciones');
    }

    try {
      setError(null);

      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount,
          category,
          type,
          note,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        setTransactions(prev => [data, ...prev]);
      }

      return data;
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar transacción');
      throw err;
    }
  };

  // Calculate totals
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Fetch when user changes
  useEffect(() => {
    fetchTransactions();
  }, [user?.id]);

  return {
    transactions,
    loading,
    error,
    income,
    expenses,
    addTransaction,
    refetch: fetchTransactions,
  };
}
