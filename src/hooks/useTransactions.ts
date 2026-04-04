import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types';

export type PeriodFilter = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';

export interface CustomDateRange {
  startDate: Date;
  endDate: Date;
}

function getUsuarioId(): string | null {
  return localStorage.getItem('usuario_id');
}

// Verificar que el usuario existe en la base de datos
async function verifyUsuarioExists(usuarioId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id')
    .eq('id', usuarioId)
    .single();
  
  return !error && !!data;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Fetch transactions
  const fetchTransactions = async () => {
    const usuarioId = getUsuarioId();
    
    if (!usuarioId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    // Verificar que el usuario existe
    const usuarioValido = await verifyUsuarioExists(usuarioId);
    if (!usuarioValido) {
      console.warn('Usuario no válido en useTransactions');
      localStorage.removeItem('usuario_id');
      localStorage.removeItem('usuario_email');
      setTransactions([]);
      setLoading(false);
      window.location.href = '/';
      return;
    }

    try {
      setLoading(true);
      setError(null);

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
    const usuarioId = getUsuarioId();
    if (!usuarioId) {
      throw new Error('Debes iniciar sesión para agregar transacciones');
    }

    try {
      setError(null);

      const { data, error: insertError } = await supabase
        .from('transacciones')
        .insert({
          usuario_id: usuarioId,
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
        await fetchTransactions();
      }

      return data;
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError('Error al guardar transacción');
      throw err;
    }
  };

  // Delete transaction
  const deleteTransaction = async (id: string) => {
    const { error } = await supabase
      .from('transacciones')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchTransactions();
  };

  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (customDateRange) {
          startDate = customDateRange.startDate;
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    let filtered = transactions.filter(t => new Date(t.fecha) >= startDate);

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.categoria_id === categoryFilter);
    }

    return filtered;
  }, [transactions, period, customDateRange, categoryFilter]);

  // Calculate totals
  const { income, expenses, allTransactions } = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.tipo === 'Ingreso' || t.tipo === 'income')
      .reduce((sum, t) => sum + t.monto, 0);

    const expenses = filteredTransactions
      .filter(t => t.tipo === 'Egreso' || t.tipo === 'expense')
      .reduce((sum, t) => sum + t.monto, 0);

    return { income, expenses, allTransactions: filteredTransactions };
  }, [filteredTransactions]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  return {
    transactions: filteredTransactions,
    allTransactions,
    loading,
    error,
    income,
    expenses,
    period,
    setPeriod,
    customDateRange,
    setCustomDateRange,
    categoryFilter,
    setCategoryFilter,
    addTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  };
}
