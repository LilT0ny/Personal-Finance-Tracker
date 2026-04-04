import { useState, useMemo, useEffect } from 'react';
import { Wallet, TrendingUp, PiggyBank, Settings, AlertTriangle } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { cn } from '../lib/utils';

// =====================================================
// CONFIGURACIÓN DE BALDES - Regla 50/30/20
// =====================================================

// Categorías por defecto que van a cada balde
const BUCKET_CATEGORIES = {
  operativo: ['food', 'transport', 'utilities', 'health', 'entertainment', 'shopping', 'other'],
  crecimiento: [], // El usuario define estas categorías
  ahorro: ['savings'],
};

export interface BucketPercentages {
  operativo: number;
  crecimiento: number;
  ahorro: number;
}

interface BucketData {
  id: 'operativo' | 'crecimiento' | 'ahorro';
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  percentage: number;
  targetAmount: number;
  spent: number;
  categories: string[];
}

export function BudgetBuckets() {
  const { transactions, income: realIncome, period } = useTransactions();

  // Estado para el "sueldo imaginario" (ingreso base para freelancers)
  const [baseIncome, setBaseIncome] = useState<number>(() => {
    const saved = localStorage.getItem('budget_baseIncome');
    return saved ? parseFloat(saved) : 0;
  });

  // Estado para los porcentajes de cada balde (50/30/20 por defecto)
  const [percentages, setPercentages] = useState<BucketPercentages>(() => {
    const saved = localStorage.getItem('budget_percentages');
    return saved ? JSON.parse(saved) : { operativo: 50, crecimiento: 30, ahorro: 20 };
  });

  // Estado para categorías personalizadas de crecimiento (solo lectura por ahora)
  const [growthCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('budget_growthCategories');
    return saved ? JSON.parse(saved) : [];
  });

  // Guardar en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('budget_baseIncome', baseIncome.toString());
  }, [baseIncome]);

  useEffect(() => {
    localStorage.setItem('budget_percentages', JSON.stringify(percentages));
  }, [percentages]);

  useEffect(() => {
    localStorage.setItem('budget_growthCategories', JSON.stringify(growthCategories));
  }, [growthCategories]);

  // Calcular el ingreso total (real o imaginario)
  const totalIncome = useMemo(() => {
    return baseIncome > 0 ? baseIncome : realIncome;
  }, [baseIncome, realIncome]);

  // Calcular gastos por balde
  const bucketData = useMemo((): BucketData[] => {
    if (totalIncome === 0) {
      return [];
    }

    // Filtrar transacciones del período actual
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

    // Calcular gastos por balde
    const calculateBucketSpent = (bucketCategories: string[]) => {
      return periodExpenses
        .filter(t => bucketCategories.includes(t.categoria_id))
        .reduce((sum, t) => sum + t.monto, 0);
    };

    // Combinar categorías por defecto con las personalizadas de crecimiento
    const crecimientoCategories = [...BUCKET_CATEGORIES.crecimiento, ...growthCategories];

    const operativoSpent = calculateBucketSpent(BUCKET_CATEGORIES.operativo);
    const crecimientoSpent = calculateBucketSpent(crecimientoCategories);
    const ahorroSpent = calculateBucketSpent(BUCKET_CATEGORIES.ahorro);

    return [
      {
        id: 'operativo',
        name: 'Balde Operativo',
        description: 'Gastos fijos: alquiler, servicios, comida, transporte',
        icon: Wallet,
        color: '#3b82f6',
        percentage: percentages.operativo,
        targetAmount: (totalIncome * percentages.operativo) / 100,
        spent: operativoSpent,
        categories: BUCKET_CATEGORIES.operativo,
      },
      {
        id: 'crecimiento',
        name: 'Balde de Crecimiento',
        description: 'Inversion: educacion, software, hardware',
        icon: TrendingUp,
        color: '#8b5cf6',
        percentage: percentages.crecimiento,
        targetAmount: (totalIncome * percentages.crecimiento) / 100,
        spent: crecimientoSpent,
        categories: crecimientoCategories,
      },
      {
        id: 'ahorro',
        name: 'Balde de Emergencia',
        description: 'Fondo de reserva: ahorro e inversion a largo plazo',
        icon: PiggyBank,
        color: '#22c55e',
        percentage: percentages.ahorro,
        targetAmount: (totalIncome * percentages.ahorro) / 100,
        spent: ahorroSpent,
        categories: BUCKET_CATEGORIES.ahorro,
      },
    ];
  }, [totalIncome, transactions, period, percentages, growthCategories]);

  // Calcular progreso y validar que los porcentajes sumen 100%
  const totalPercentage = percentages.operativo + percentages.crecimiento + percentages.ahorro;
  const isValidPercentage = totalPercentage === 100;

  // Handler para actualizar porcentajes
  const handlePercentageChange = (bucket: keyof BucketPercentages, value: number) => {
    setPercentages(prev => ({
      ...prev,
      [bucket]: Math.max(0, Math.min(100, value)),
    }));
  };

  // Renderizar barra de progreso
  const renderProgressBar = (spent: number, target: number) => {
    const percentage = target > 0 ? (spent / target) * 100 : 0;
    const isOverBudget = percentage > 100;
    const isNearLimit = percentage >= 80 && percentage <= 100;

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-foreground-muted">
            ${spent.toFixed(2)} gastado
          </span>
          <span className={cn(
            "font-medium",
            isOverBudget ? "text-red-500" : isNearLimit ? "text-yellow-500" : "text-foreground"
          )}>
            ${target.toFixed(2)} objetivo
          </span>
        </div>

        <div className="h-3 bg-background rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isOverBudget
                ? "bg-red-500"
                : isNearLimit
                  ? "bg-yellow-500"
                  : "bg-current"
            )}
            style={{
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: isOverBudget ? '#ef4444' : isNearLimit ? '#eab308' : undefined
            }}
          />
        </div>

        <p className={cn(
          "text-xs text-right",
          isOverBudget ? "text-red-500 font-medium" : "text-foreground-muted"
        )}>
          {percentage.toFixed(1)}% utilizado
          {isOverBudget && (
            <span className="flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3" />
              Exceso de presupuesto
            </span>
          )}
        </p>
      </div>
    );
  };

  // Si no hay ingresos, mostrar mensaje
  if (realIncome === 0 && baseIncome === 0) {
    return (
      <div className="space-y-6">
        <div className="card mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Presupuesto</h2>
              </div>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
              Regla 50/30/20
            </span>
          </div>
        </div>

        <div className="card">
          <p className="text-foreground-muted text-center py-4">
            No hay ingresos registrados en el período actual.
            <br />
            Agrega un ingreso o establece un "sueldo imaginario" para comenzar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Presupuesto</h2>
              <p className="text-foreground-muted text-sm">
                Ingreso disponible: <span className="font-bold text-primary">
                  ${totalIncome.toFixed(2)}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>




      {/* Bucket Cards - KPI Row */}
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

              {/* Mini Progress Bar */}
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
                <span className="text-foreground-muted">
                  ${bucket.spent.toFixed(0)}
                </span>
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




      {/* Ajustar Porcentajes */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Ajustar Porcentajes
          </label>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full",
            isValidPercentage
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          )}>
            Total: {totalPercentage}% {isValidPercentage ? 'OK' : 'Revisar'}
          </span>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-blue-500 font-medium">Operativo</span>
              <span>{percentages.operativo}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={percentages.operativo}
              onChange={(e) => handlePercentageChange('operativo', parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-violet-500 font-medium">Crecimiento</span>
              <span>{percentages.crecimiento}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={percentages.crecimiento}
              onChange={(e) => handlePercentageChange('crecimiento', parseInt(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-green-500 font-medium">Ahorro</span>
              <span>{percentages.ahorro}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={percentages.ahorro}
              onChange={(e) => handlePercentageChange('ahorro', parseInt(e.target.value))}
              className="w-full accent-green-500"
            />
          </div>
        </div>

        {/* Distribucion visual */}
        <div className="flex h-2 mt-4 rounded-full overflow-hidden">
          <div className="bg-blue-500" style={{ width: `${percentages.operativo}%` }} />
          <div className="bg-violet-500" style={{ width: `${percentages.crecimiento}%` }} />
          <div className="bg-green-500" style={{ width: `${percentages.ahorro}%` }} />
        </div>
      </div>
    </div>
  );
}
