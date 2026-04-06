import { useMemo } from 'react';
import { Wallet, TrendingUp, PiggyBank } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { cn } from '../lib/utils';

// KPIs de Presupuesto para mostrar en Inicio
export function BudgetKPIs() {
  const { transactions, income: realIncome, period } = useTransactions();
  const { categories: _userCategories } = useCategories();

  // Obtener categorias de localStorage
  const bucketCategories = useMemo(() => {
    const saved = localStorage.getItem('budget_bucketCategories');
    return saved ? JSON.parse(saved) : {
      necesidades: ['food', 'transport', 'utilities', 'health', 'other'],
      deseos: ['entertainment', 'shopping'],
      ahorro: ['savings']
    };
  }, []);

  // Obtener porcentajes de localStorage
  const percentages = useMemo(() => {
    const saved = localStorage.getItem('budget_percentages');
    return saved ? JSON.parse(saved) : { necesidades: 50, deseos: 30, ahorro: 20 };
  }, []);

  // Obtener ingreso base de localStorage
  const baseIncome = useMemo(() => {
    const saved = localStorage.getItem('budget_baseIncome');
    return saved ? parseFloat(saved) : 0;
  }, []);

  const totalIncome = baseIncome > 0 ? baseIncome : realIncome;

  // Calcular gastos por balde
  const bucketData = useMemo(() => {
    if (totalIncome === 0) {
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

    const necesidadesSpent = calculateBucketSpent(bucketCategories.necesidades);
    const deseosSpent = calculateBucketSpent(bucketCategories.deseos);
    const ahorroSpent = calculateBucketSpent(bucketCategories.ahorro);

    return [
      {
        id: 'necesidades',
        name: 'Necesidades',
        icon: Wallet,
        color: '#3b82f6',
        percentage: percentages.necesidades,
        targetAmount: (totalIncome * percentages.necesidades) / 100,
        spent: necesidadesSpent,
      },
      {
        id: 'deseos',
        name: 'Deseos',
        icon: TrendingUp,
        color: '#8b5cf6',
        percentage: percentages.deseos,
        targetAmount: (totalIncome * percentages.deseos) / 100,
        spent: deseosSpent,
      },
      {
        id: 'ahorro',
        name: 'Ahorro',
        icon: PiggyBank,
        color: '#22c55e',
        percentage: percentages.ahorro,
        targetAmount: (totalIncome * percentages.ahorro) / 100,
        spent: ahorroSpent,
      },
    ];
  }, [totalIncome, transactions, period, bucketCategories, percentages]);

  if (totalIncome === 0) {
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