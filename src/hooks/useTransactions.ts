import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types';
import { useAuth } from '../context/AuthContext';

export type PeriodFilter = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';

export interface CustomDateRange {
  startDate: Date;
  endDate: Date;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
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

      // Obtener el usuario_id de la tabla usuarios
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (usuarioError) throw usuarioError;
      if (!usuarioData) throw new Error('Usuario no encontrado');

      const usuarioId = usuarioData.id;

      // Obtener transacciones con join de categorías
      const { data, error: fetchError } = await supabase
        .from('transacciones')
        .select(`
          id,
          usuario_id,
          categoria_id,
          monto,
          tipo,
          fecha,
          descripcion,
          created_at,
          categorias (
            nombre,
            icono,
            color
          )
        `)
        .eq('usuario_id', usuarioId)
        .order('fecha', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      // Transformar datos para compatibilidad
      const transformedData: Transaction[] = (data || []).map((t: any) => ({
        id: t.id,
        usuario_id: t.usuario_id,
        categoria_id: t.categoria_id,
        monto: t.monto,
        tipo: (t.tipo === 'Ingreso' ? 'Ingreso' : 'Egreso') as Transaction['tipo'],
        category: t.categorias?.nombre || 'Otros',
        category_icon: t.categorias?.icono || 'Circle',
        category_color: t.categorias?.color || '#6b7280',
        fecha: t.fecha,
        descripcion: t.descripcion,
        created_at: t.created_at,
      }));

      setTransactions(transformedData);
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
    categoryId: string,
    type: 'income' | 'expense',
    note?: string
  ) => {
    if (!user) {
      throw new Error('Debes iniciar sesión para agregar transacciones');
    }

    try {
      setError(null);

      // Obtener el usuario_id
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (usuarioError) throw usuarioError;
      if (!usuarioData) throw new Error('Usuario no encontrado');

      const { data, error: insertError } = await supabase
        .from('transacciones')
        .insert({
          usuario_id: usuarioData.id,
          categoria_id: categoryId,
          monto: amount,
          tipo: type === 'income' ? 'Ingreso' : 'Egreso',
          descripcion: note,
          fecha: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        // Refrescar la lista
        await fetchTransactions();
      }

      return data;
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar transacción');
      throw err;
    }
  };

  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date | undefined;

    if (period === 'custom' && customDateRange) {
      startDate = customDateRange.startDate;
      endDate = customDateRange.endDate;
    } else {
      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'all':
        default:
          return transactions;
      }
    }

    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
      return transactions.filter(t => {
        const txDate = new Date(t.fecha);
        return txDate >= startDate && txDate <= endDate!;
      });
    }

    return transactions.filter(t => new Date(t.fecha) >= startDate);
  }, [transactions, period, customDateRange]);

  // Filter by category
  const filteredByCategory = useMemo(() => {
    if (categoryFilter === 'all') return filteredTransactions;
    return filteredTransactions.filter(t => t.categoria_id === categoryFilter);
  }, [filteredTransactions, categoryFilter]);

  // Calculate totals based on filtered transactions
  const income = filteredByCategory
    .filter(t => t.tipo === 'Ingreso')
    .reduce((sum, t) => sum + t.monto, 0);

  const expenses = filteredByCategory
    .filter(t => t.tipo === 'Egreso')
    .reduce((sum, t) => sum + t.monto, 0);

  // Calculate all-time totals
  const totalIncome = transactions
    .filter(t => t.tipo === 'Ingreso')
    .reduce((sum, t) => sum + t.monto, 0);

  const totalExpenses = transactions
    .filter(t => t.tipo === 'Egreso')
    .reduce((sum, t) => sum + t.monto, 0);

  // Fetch when user changes
  useEffect(() => {
    fetchTransactions();
  }, [user?.id]);

  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    loading,
    error,
    income,
    expenses,
    totalIncome,
    totalExpenses,
    period,
    setPeriod,
    customDateRange,
    setCustomDateRange,
    categoryFilter,
    setCategoryFilter,
    addTransaction,
    refetch: fetchTransactions,
  };
}
