import { useMemo, useEffect, useState } from 'react';
import { Wallet, TrendingUp, PiggyBank } from 'lucide-react';
import { Card, CardBody, Progress, Chip } from '@heroui/react';
import { PeriodFilter } from '../hooks/useTransactions';
import { Transaction } from '../types';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface BudgetKPIsProps {
  transactions: Transaction[];
  income: number;
  period: PeriodFilter;
}

// KPIs de Presupuesto para mostrar en Inicio
export function BudgetKPIs({ transactions, income: realIncome, period }: BudgetKPIsProps) {
  const usuarioId = localStorage.getItem('usuario_id');

  // Estado para los presupuestos desde Supabase
  const [presupuestos, setPresupuestos] = useState<{id: string; nombre: string; porcentaje: number}[]>([]);
  const [presupuestoCategorias, setPresupuestoCategorias] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Cargar presupuestos desde Supabase
  useEffect(() => {
    if (!usuarioId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Cargar presupuestos del usuario
        const { data: presupuestosData, error: presupuestosError } = await supabase
          .from('presupuestos')
          .select('id, nombre, porcentaje')
          .eq('usuario_id', usuarioId);

        if (presupuestosError) {
          console.error('Error fetching presupuestos:', presupuestosError);
          setLoading(false);
          return;
        }

        setPresupuestos(presupuestosData || []);

        // Cargar categorías asignadas a cada presupuesto
        if (presupuestosData && presupuestosData.length > 0) {
          const presupuestoIds = presupuestosData.map(p => p.id);
          
          const { data: categoriasData, error: categoriasError } = await supabase
            .from('presupuesto_categorias')
            .select('presupuesto_id, categoria_id')
            .in('presupuesto_id', presupuestoIds);

          if (!categoriasError && categoriasData) {
            // Agrupar por nombre de presupuesto
            const grouped: Record<string, string[]> = {};
            
            categoriasData.forEach(pc => {
              const presupuesto = presupuestosData.find(p => p.id === pc.presupuesto_id);
              if (presupuesto) {
                if (!grouped[presupuesto.nombre]) {
                  grouped[presupuesto.nombre] = [];
                }
                grouped[presupuesto.nombre].push(pc.categoria_id);
              }
            });
            
            setPresupuestoCategorias(grouped);
          }
        }
      } catch (err) {
        console.error('Error loading presupuestos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [usuarioId]);

  // Obtener los porcentajes actuales
  const percentages = useMemo(() => {
    const result = { necesidades: 50, deseos: 30, ahorro: 20 };
    presupuestos.forEach(p => {
      if (p.nombre in result) {
        result[p.nombre as keyof typeof result] = p.porcentaje;
      }
    });
    return result;
  }, [presupuestos]);

  // Obtener las categorías de cada balde
  const bucketCategories = useMemo(() => {
    return {
      necesidades: presupuestoCategorias['necesidades'] || [],
      deseos: presupuestoCategorias['deseos'] || [],
      ahorro: presupuestoCategorias['ahorro'] || []
    };
  }, [presupuestoCategorias]);

  // Obtener ingreso base desde parametros_sistema
  const [baseIncome, setBaseIncome] = useState(0);
  useEffect(() => {
    if (!usuarioId) return;

    const fetchBaseIncome = async () => {
      const { data } = await supabase
        .from('parametros_sistema')
        .select('ingreso_base')
        .eq('usuario_id', usuarioId)
        .single();
      
      if (data?.ingreso_base) {
        setBaseIncome(parseFloat(data.ingreso_base) || 0);
      }
    };

    fetchBaseIncome();
  }, [usuarioId]);

  const totalIncome = baseIncome > 0 ? baseIncome : realIncome;

  // Calcular gastos por balde
  const bucketData = useMemo(() => {
    if (totalIncome === 0 || loading) {
      return [];
    }

    const now = new Date();
    let startDate: Date;

    let periodExpenses: typeof transactions;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodExpenses = transactions.filter(
          t => t.tipo === 'Egreso' && new Date(t.fecha) >= startDate
        );
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        periodExpenses = transactions.filter(
          t => t.tipo === 'Egreso' && new Date(t.fecha) >= startDate
        );
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodExpenses = transactions.filter(
          t => t.tipo === 'Egreso' && new Date(t.fecha) >= startDate
        );
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        periodExpenses = transactions.filter(
          t => t.tipo === 'Egreso' && new Date(t.fecha) >= startDate
        );
        break;
      case 'all':
        periodExpenses = transactions.filter(t => t.tipo === 'Egreso');
        break;
      default:
        periodExpenses = transactions.filter(t => t.tipo === 'Egreso');
    }

    const calculateBucketSpent = (cats: string[]) => {
      return periodExpenses
        .filter(t => cats.includes(t.categoria_id))
        .reduce((sum, t) => sum + t.monto, 0);
    };

    const bucketInfo = [
      { id: 'necesidades' as const, name: 'Necesidades', icon: Wallet, color: '#3b82f6' },
      { id: 'deseos' as const, name: 'Deseos', icon: TrendingUp, color: '#8b5cf6' },
      { id: 'ahorro' as const, name: 'Ahorro', icon: PiggyBank, color: '#22c55e' },
    ];

    return bucketInfo.map(info => {
      const cats = bucketCategories[info.id] || [];
      const spent = calculateBucketSpent(cats);
      
      return {
        ...info,
        percentage: percentages[info.id],
        targetAmount: (totalIncome * percentages[info.id]) / 100,
        spent,
      };
    });
  }, [totalIncome, transactions, period, percentages, bucketCategories, loading]);

  if (loading || totalIncome === 0) {
    return null;
  }

  const COLOR_MAP: Record<string, 'primary' | 'secondary' | 'success' | 'danger'> = {
    necesidades: 'primary',
    deseos: 'secondary',
    ahorro: 'success',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {bucketData.map((bucket) => {
        const progress = bucket.targetAmount > 0
          ? (bucket.spent / bucket.targetAmount) * 100
          : 0;
        const isOverBudget = progress > 100;
        const heroColor = isOverBudget ? 'danger' : COLOR_MAP[bucket.id] ?? 'primary';

        return (
          <Card
            key={bucket.id}
            className={cn(
              "bg-card border border-border shadow-sm",
              isOverBudget ? "border-danger/40" : ""
            )}
          >
            <CardBody className="p-4 gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${bucket.color}25` }}
                  >
                    <bucket.icon className="w-4 h-4" style={{ color: bucket.color }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">{bucket.name}</h3>
                    <p className="text-xs text-foreground-muted">{bucket.percentage}% del ingreso</p>
                  </div>
                </div>
                <Chip
                  size="sm"
                  variant="flat"
                  color={isOverBudget ? 'danger' : 'default'}
                  className="text-[10px] h-5 shrink-0"
                >
                  ${bucket.targetAmount.toFixed(0)}
                </Chip>
              </div>

              <Progress
                value={Math.min(progress, 100)}
                color={heroColor}
                size="sm"
                className="w-full"
                aria-label={`${bucket.name} progress`}
              />

              <div className="flex justify-between items-center text-xs">
                <span className="text-foreground-muted">
                  Gastado: <span className="font-semibold text-foreground">${bucket.spent.toFixed(0)}</span>
                </span>
                <span className={cn("font-bold", isOverBudget ? "text-danger" : "text-foreground-muted")}>
                  {progress.toFixed(0)}%
                </span>
              </div>

              {isOverBudget && (
                <p className="text-[10px] text-danger font-medium -mt-1">¡Presupuesto excedido!</p>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
