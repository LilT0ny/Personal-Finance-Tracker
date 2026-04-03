import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types';

// Demo user ID for testing (replace with real auth)
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar transacciones');
      // Fallback to empty array if table doesn't exist yet
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
    try {
      setError(null);

      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: DEMO_USER_ID,
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

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, []);

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
