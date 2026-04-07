import { useMemo, useEffect, useState } from 'react';
import { Wallet, TrendingUp, PiggyBank } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

// KPIs de Presupuesto para mostrar en Inicio
export function BudgetKPIs() {
  const { transactions, income: realIncome, period } = useTransactions();
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
        setBaseIncome(parseFloat(data.ingreso_base));
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
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const periodExpenses = transactions.filter(
      t => (t.tipo === 'Egreso' || t.tipo === 'expense') && new Date(t.fecha) >= startDate
    );

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {bucketData.map((bucket) => {
        const progress = bucket.targetAmount > 0 
          ? (bucket.spent / bucket.targetAmount) * 100 
          : 0;
        const isOverBudget = progress > 100;

        return (
          <div 
            key={bucket.id}
            className={cn(
              "card transition-all",
              isOverBudget 
                ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20" 
                : ""
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${bucket.color}20` }}
              >
                <bucket.icon 
                  className="w-5 h-5" 
                  style={{ color: bucket.color }}
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">{bucket.name}</h3>
                <p className="text-xs text-foreground-muted truncate">
                  {bucket.percentage}% (${bucket.targetAmount.toFixed(0)})
                </p>
              </div>
            </div>

            <div className="h-2 bg-background rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: isOverBudget ? '#ef4444' : bucket.color
                }}
              />
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-foreground-muted">${bucket.spent.toFixed(0)}</span>
              <span className={cn(
                "font-medium",
                isOverBudget ? "text-red-500" : "text-foreground"
              )}>
                {progress.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
