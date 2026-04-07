import { useState, useMemo, useEffect } from 'react';
import { Wallet, TrendingUp, PiggyBank, Settings, Plus, X, Check } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { cn } from '../lib/utils';

// =====================================================
// CONFIGURACIÓN DE BALDES - Regla 50/30/20
// =====================================================

interface BucketPercentages {
  necesidades: number;
  deseos: number;
  ahorro: number;
}

interface BucketCategories {
  necesidades: string[];
  deseos: string[];
  ahorro: string[];
}

interface BucketData {
  id: 'necesidades' | 'deseos' | 'ahorro';
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
  const { categories: userCategories } = useCategories();

  // Estado para el "sueldo imaginario" (ingreso base para freelancers)
  const [baseIncome] = useState<number>(() => {
    const saved = localStorage.getItem('budget_baseIncome');
    return saved ? parseFloat(saved) : 0;
  });

  // Estado para los porcentajes de cada balde (50/30/20 por defecto)
  const [percentages, setPercentages] = useState<BucketPercentages>(() => {
    const saved = localStorage.getItem('budget_percentages');
    return saved ? JSON.parse(saved) : { necesidades: 50, deseos: 30, ahorro: 20 };
  });

  // Estado para las categorías de cada balde
  const [bucketCategories, setBucketCategories] = useState<BucketCategories>(() => {
    const saved = localStorage.getItem('budget_bucketCategories');
    return saved ? JSON.parse(saved) : {
      necesidades: ['food', 'transport', 'utilities', 'health', 'other'],
      deseos: ['entertainment', 'shopping'],
      ahorro: ['savings']
    };
  });

  // Estado para mostrar el modal de editar categorías
  const [editingBucket, setEditingBucket] = useState<'necesidades' | 'deseos' | 'ahorro' | null>(null);

  // Guardar en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('budget_baseIncome', baseIncome.toString());
  }, [baseIncome]);

  useEffect(() => {
    localStorage.setItem('budget_percentages', JSON.stringify(percentages));
  }, [percentages]);

  useEffect(() => {
    localStorage.setItem('budget_bucketCategories', JSON.stringify(bucketCategories));
  }, [bucketCategories]);

  // Handler para actualizar porcentajes
  const handlePercentageChange = (bucket: keyof BucketPercentages, value: number) => {
    setPercentages(prev => ({
      ...prev,
      [bucket]: Math.max(0, Math.min(100, value)),
    }));
  };

  // Obtener todas las categorías ya asignadas a algún balde
  const assignedCategories = useMemo(() => {
    return [
      ...bucketCategories.necesidades,
      ...bucketCategories.deseos,
      ...bucketCategories.ahorro
    ];
  }, [bucketCategories]);

  // Agregar categoría a un balde
  const addCategoryToBucket = (bucketId: 'necesidades' | 'deseos' | 'ahorro', categoryId: string) => {
    const newBucketCategories = { ...bucketCategories };
    for (const key of Object.keys(newBucketCategories) as Array<keyof BucketCategories>) {
      if (key !== bucketId) {
        newBucketCategories[key] = newBucketCategories[key].filter(c => c !== categoryId);
      }
    }
    if (!newBucketCategories[bucketId].includes(categoryId)) {
      newBucketCategories[bucketId].push(categoryId);
    }
    setBucketCategories(newBucketCategories);
  };

  // Remover categoría de un balde
  const removeCategoryFromBucket = (bucketId: 'necesidades' | 'deseos' | 'ahorro', categoryId: string) => {
    setBucketCategories(prev => ({
      ...prev,
      [bucketId]: prev[bucketId].filter(c => c !== categoryId)
    }));
  };

  // Calcular el ingreso total (real o imaginario)
  const totalIncome = useMemo(() => {
    return baseIncome > 0 ? baseIncome : realIncome;
  }, [baseIncome, realIncome]);

  // Calcular gastos por balde
  const bucketData = useMemo((): BucketData[] => {
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

    const calculateBucketSpent = (bucketCategoriesArr: string[]) => {
      return periodExpenses
        .filter(t => bucketCategoriesArr.includes(t.categoria_id))
        .reduce((sum, t) => sum + t.monto, 0);
    };

    const necesidadesSpent = calculateBucketSpent(bucketCategories.necesidades);
    const deseosSpent = calculateBucketSpent(bucketCategories.deseos);
    const ahorroSpent = calculateBucketSpent(bucketCategories.ahorro);

    return [
      {
        id: 'necesidades',
        name: 'Necesidades',
        description: 'Gastos fijos esenciales',
        icon: Wallet,
        color: '#3b82f6',
        percentage: percentages.necesidades,
        targetAmount: (totalIncome * percentages.necesidades) / 100,
        spent: necesidadesSpent,
        categories: bucketCategories.necesidades,
      },
      {
        id: 'deseos',
        name: 'Deseos',
        description: 'Entretenimiento, suscripciones, salidas',
        icon: TrendingUp,
        color: '#8b5cf6',
        percentage: percentages.deseos,
        targetAmount: (totalIncome * percentages.deseos) / 100,
        spent: deseosSpent,
        categories: bucketCategories.deseos,
      },
      {
        id: 'ahorro',
        name: 'Ahorro',
        description: 'Fondo de emergencia e inversion',
        icon: PiggyBank,
        color: '#22c55e',
        percentage: percentages.ahorro,
        targetAmount: (totalIncome * percentages.ahorro) / 100,
        spent: ahorroSpent,
        categories: bucketCategories.ahorro,
      },
    ];
  }, [totalIncome, transactions, period, percentages, bucketCategories]);

  const totalPercentage = percentages.necesidades + percentages.deseos + percentages.ahorro;
  const isValidPercentage = totalPercentage === 100;

  // Renderizar barra de progreso

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
            No hay ingresos registrados. Agrega un ingreso o establece un "sueldo imaginario".
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
          <div className="space-y-4">
        <div className="card mb-4">
          {/* Necesidades */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-blue-500 font-medium">Necesidades</span>
              <div className="flex items-center gap-0.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={percentages.necesidades}
                  onChange={(e) => handlePercentageChange('necesidades', parseInt(e.target.value) || 0)}
                  className="w-10 bg-transparent text-right font-bold focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="font-bold">%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={percentages.necesidades}
              onChange={(e) => handlePercentageChange('necesidades', parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: '#3b82f6', '--range-color': '#3b82f6' } as React.CSSProperties}
            />
            {/* Categorías de Necesidades */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-foreground-muted">Categorias:</p>
                <button
                  onClick={() => setEditingBucket('necesidades')}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Editar
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {bucketCategories.necesidades.length === 0 ? (
                  <span className="text-xs text-foreground-muted">Sin categorias</span>
                ) : (
                  bucketCategories.necesidades.map((catId) => {
                    const cat = userCategories.find(c => c.id === catId);
                    return (
                      <span key={catId} className="text-xs px-2 py-1 bg-background rounded-full flex items-center gap-1">
                        {cat?.nombre || catId}
                        <button onClick={() => removeCategoryFromBucket('necesidades', catId)} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="card mb-4">
          {/* Deseos */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-violet-500 font-medium">Deseos</span>
              <div className="flex items-center gap-0.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={percentages.deseos}
                  onChange={(e) => handlePercentageChange('deseos', parseInt(e.target.value) || 0)}
                  className="w-10 bg-transparent text-right font-bold focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="font-bold">%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={percentages.deseos}
              onChange={(e) => handlePercentageChange('deseos', parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: '#8b5cf6', '--range-color': '#8b5cf6' } as React.CSSProperties}
            />
            {/* Categorías de Deseos */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-foreground-muted">Categorias:</p>
                <button
                  onClick={() => setEditingBucket('deseos')}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Editar
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {bucketCategories.deseos.length === 0 ? (
                  <span className="text-xs text-foreground-muted">Sin categorias</span>
                ) : (
                  bucketCategories.deseos.map((catId) => {
                    const cat = userCategories.find(c => c.id === catId);
                    return (
                      <span key={catId} className="text-xs px-2 py-1 bg-background rounded-full flex items-center gap-1">
                        {cat?.nombre || catId}
                        <button onClick={() => removeCategoryFromBucket('deseos', catId)} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="card mb-4">
          {/* Ahorro */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-green-500 font-medium">Ahorro</span>
              <div className="flex items-center gap-0.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={percentages.ahorro}
                  onChange={(e) => handlePercentageChange('ahorro', parseInt(e.target.value) || 0)}
                  className="w-10 bg-transparent text-right font-bold focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="font-bold">%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={percentages.ahorro}
              onChange={(e) => handlePercentageChange('ahorro', parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: '#22c55e', '--range-color': '#22c55e' } as React.CSSProperties}
            />
            {/* Categorías de Ahorro */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-foreground-muted">Categorias:</p>
                <button
                  onClick={() => setEditingBucket('ahorro')}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Editar
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {bucketCategories.ahorro.length === 0 ? (
                  <span className="text-xs text-foreground-muted">Sin categorias</span>
                ) : (
                  bucketCategories.ahorro.map((catId) => {
                    const cat = userCategories.find(c => c.id === catId);
                    return (
                      <span key={catId} className="text-xs px-2 py-1 bg-background rounded-full flex items-center gap-1">
                        {cat?.nombre || catId}
                        <button onClick={() => removeCategoryFromBucket('ahorro', catId)} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
        </div>     
      </div>

      {/* Modal para editar categorías */}
      {editingBucket && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingBucket(null)} />
          
          <div className="relative w-full lg:max-w-md bg-card rounded-t-3xl lg:rounded-2xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto">
            <button onClick={() => setEditingBucket(null)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-background">
              <X className="w-5 h-5 text-foreground-muted" />
            </button>

            <h2 className="text-xl font-bold mb-4">
              Editar Categorias - {bucketData.find(b => b.id === editingBucket)?.name}
            </h2>

            <p className="text-xs text-foreground-muted mb-4">
              Selecciona las categorias para este grupo. Una categoria solo puede estar en un grupo.
            </p>

            <div className="space-y-2">
              {userCategories.map((cat) => {
                const isInThisBucket = bucketCategories[editingBucket].includes(cat.id);
                const isInOtherBucket = assignedCategories.includes(cat.id) && !isInThisBucket;

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (isInThisBucket) {
                        removeCategoryFromBucket(editingBucket, cat.id);
                      } else {
                        addCategoryToBucket(editingBucket, cat.id);
                      }
                    }}
                    disabled={isInOtherBucket}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                      isInThisBucket 
                        ? "border-primary bg-primary/10" 
                        : isInOtherBucket
                          ? "border-border opacity-50 cursor-not-allowed"
                          : "border-border hover:bg-background"
                    )}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      <span style={{ color: cat.color }} className="text-xs font-bold">{cat.nombre[0]}</span>
                    </div>
                    <span className="flex-1 text-left font-medium">{cat.nombre}</span>
                    {isInThisBucket && <Check className="w-5 h-5 text-primary" />}
                    {isInOtherBucket && <span className="text-xs text-foreground-muted">En otro grupo</span>}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setEditingBucket(null)}
              className="w-full btn-primary py-3 mt-4"
            >
              Listo
            </button>
          </div>

          <style>{`
            @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
            .animate-slide-up { animation: slide-up 0.3s ease-out; }
          `}</style>
        </div>
      )}
    </div>
  );
}
