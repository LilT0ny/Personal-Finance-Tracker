import { useState, useMemo, useEffect } from 'react';
import { Wallet, TrendingUp, PiggyBank, Check } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

// =====================================================
// TIPOS
// =====================================================

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
  presupuestoId: string;
}

interface Presupuesto {
  id: string;
  usuario_id: string;
  nombre: string;
  porcentaje: number;
}

export function BudgetBuckets() {
  const { transactions, income: realIncome, period } = useTransactions();
  const { categories: userCategories } = useCategories();
  const usuarioId = localStorage.getItem('usuario_id');

  // Estado para el "sueldo imaginario" (ingreso base para freelancers)
  const [baseIncome, setBaseIncome] = useState<number>(0);

  // Estado para los presupuestos desde Supabase
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para las categorías de cada balde (desde Supabase)
  const [presupuestoCategorias, setPresupuestoCategorias] = useState<Record<string, string[]>>({});

  // Estado para mostrar el modal de editar categorías
  const [editingBucket, setEditingBucket] = useState<'necesidades' | 'deseos' | 'ahorro' | null>(null);

  // Cargar presupuestos desde Supabase
  useEffect(() => {
    if (!usuarioId) return;

    const fetchPresupuestos = async () => {
      try {
        setLoading(true);
        
        // Cargar presupuestos del usuario
        const { data: presupuestosData, error: presupuestosError } = await supabase
          .from('presupuestos')
          .select('*')
          .eq('usuario_id', usuarioId)
          .order('nombre');

        if (presupuestosError) {
          console.error('Error fetching presupuestos:', presupuestosError);
          return;
        }

        setPresupuestos(presupuestosData || []);

        // Cargar base income desde parametros_sistema
        const { data: paramsData } = await supabase
          .from('parametros_sistema')
          .select('ingreso_base')
          .eq('usuario_id', usuarioId)
          .single();

        if (paramsData?.ingreso_base) {
          setBaseIncome(parseFloat(paramsData.ingreso_base));
        }

        // Cargar categorías asignadas a cada presupuesto
        if (presupuestosData && presupuestosData.length > 0) {
          const presupuestoIds = presupuestosData.map(p => p.id);
          
          const { data: categoriasData, error: categoriasError } = await supabase
            .from('presupuesto_categorias')
            .select('presupuesto_id, categoria_id')
            .in('presupuesto_id', presupuestoIds);

          if (!categoriasError && categoriasData) {
            // Agrupar por presupuesto_id
            const grouped: Record<string, string[]> = {};
            presupuestosData.forEach(p => {
              grouped[p.nombre] = [];
            });
            
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

    fetchPresupuestos();
  }, [usuarioId]);

  // Guardar porcentaje actualizado
  const handlePercentageChange = async (bucket: string, value: number) => {
    if (!usuarioId) return;

    const presupuesto = presupuestos.find(p => p.nombre === bucket);
    if (!presupuesto) return;

    const clampedValue = Math.max(0, Math.min(100, value));

    try {
      await supabase
        .from('presupuestos')
        .update({ porcentaje: clampedValue })
        .eq('id', presupuesto.id);

      setPresupuestos(prev => 
        prev.map(p => p.nombre === bucket ? { ...p, porcentaje: clampedValue } : p)
      );
    } catch (err) {
      console.error('Error updating percentage:', err);
    }
  };

  // Agregar categoría a un balde
  const addCategoryToBucket = async (bucketId: string, categoryId: string) => {
    if (!usuarioId) return;

    const presupuesto = presupuestos.find(p => p.nombre === bucketId);
    if (!presupuesto) return;

    try {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('presupuesto_categorias')
        .select('id')
        .eq('presupuesto_id', presupuesto.id)
        .eq('categoria_id', categoryId)
        .single();

      if (existing) return; // Ya existe

      // Agregar a Supabase
      await supabase
        .from('presupuesto_categorias')
        .insert({
          presupuesto_id: presupuesto.id,
          categoria_id: categoryId
        });

      // Remover de otros buckets
      for (const bucket of ['necesidades', 'deseos', 'ahorro']) {
        if (bucket !== bucketId && presupuestoCategorias[bucket]) {
          const otherPresupuesto = presupuestos.find(p => p.nombre === bucket);
          if (otherPresupuesto) {
            await supabase
              .from('presupuesto_categorias')
              .delete()
              .eq('presupuesto_id', otherPresupuesto.id)
              .eq('categoria_id', categoryId);

            setPresupuestoCategorias(prev => ({
              ...prev,
              [bucket]: prev[bucket]?.filter(c => c !== categoryId) || []
            }));
          }
        }
      }

      // Agregar al bucket actual
      setPresupuestoCategorias(prev => ({
        ...prev,
        [bucketId]: [...(prev[bucketId] || []), categoryId]
      }));
    } catch (err) {
      console.error('Error adding category to bucket:', err);
    }
  };

  // Remover categoría de un balde
  const removeCategoryFromBucket = async (bucketId: string, categoryId: string) => {
    const presupuesto = presupuestos.find(p => p.nombre === bucketId);
    if (!presupuesto) return;

    try {
      await supabase
        .from('presupuesto_categorias')
        .delete()
        .eq('presupuesto_id', presupuesto.id)
        .eq('categoria_id', categoryId);

      setPresupuestoCategorias(prev => ({
        ...prev,
        [bucketId]: prev[bucketId]?.filter(c => c !== categoryId) || []
      }));
    } catch (err) {
      console.error('Error removing category from bucket:', err);
    }
  };

  // Calcular el ingreso total (real o imaginario)
  const totalIncome = useMemo(() => {
    return baseIncome > 0 ? baseIncome : realIncome;
  }, [baseIncome, realIncome]);

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

  // Calcular gastos por balde
  const bucketData = useMemo((): BucketData[] => {
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

    const calculateBucketSpent = (bucketCategoriesArr: string[]) => {
      return periodExpenses
        .filter(t => bucketCategoriesArr.includes(t.categoria_id))
        .reduce((sum, t) => sum + t.monto, 0);
    };

    const bucketInfo = [
      { id: 'necesidades' as const, name: 'Necesidades', description: 'Gastos fijos esenciales', icon: Wallet, color: '#3b82f6' },
      { id: 'deseos' as const, name: 'Deseos', description: 'Entretenimiento, suscripciones, salidas', icon: TrendingUp, color: '#8b5cf6' },
      { id: 'ahorro' as const, name: 'Ahorro', description: 'Fondo de emergencia e inversión', icon: PiggyBank, color: '#22c55e' },
    ];

    return bucketInfo.map(info => {
      const presupuesto = presupuestos.find(p => p.nombre === info.id);
      const cats = bucketCategories[info.id] || [];
      const spent = calculateBucketSpent(cats);
      
      return {
        ...info,
        percentage: percentages[info.id],
        targetAmount: (totalIncome * percentages[info.id]) / 100,
        spent,
        categories: cats,
        presupuestoId: presupuesto?.id || ''
      };
    });
  }, [totalIncome, transactions, period, percentages, bucketCategories, presupuestos, loading]);

  const totalPercentage = percentages.necesidades + percentages.deseos + percentages.ahorro;
  const isValidPercentage = totalPercentage === 100;

  // Obtener categorías ya asignadas a algún balde
  const assignedCategories = useMemo(() => {
    return [
      ...bucketCategories.necesidades,
      ...bucketCategories.deseos,
      ...bucketCategories.ahorro
    ];
  }, [bucketCategories]);

  // Si está cargando
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Presupuesto</h2>
            </div>
          </div>
        </div>
        <div className="card">
          <p className="text-foreground-muted text-center py-4">Cargando...</p>
        </div>
      </div>
    );
  }

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
          <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
            Regla 50/30/20
          </span>
        </div>
      </div>

      {/* Distribución total */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Distribución</span>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full",
            isValidPercentage 
              ? "bg-success/10 text-success" 
              : "bg-danger/10 text-danger"
          )}>
            {totalPercentage}% total
          </span>
        </div>
        
        {/* Barra de progreso */}
        <div className="h-3 bg-border rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${percentages.necesidades}%` }}
          />
          <div 
            className="h-full bg-[#8b5cf6] transition-all"
            style={{ width: `${percentages.deseos}%` }}
          />
          <div 
            className="h-full bg-success transition-all"
            style={{ width: `${percentages.ahorro}%` }}
          />
        </div>
      </div>

      {/* Buckets */}
      <div className="space-y-4">
        {bucketData.map(bucket => (
          <div key={bucket.id} className="card">
            {/* Bucket Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${bucket.color}20` }}
                >
                  <bucket.icon className="w-5 h-5" style={{ color: bucket.color }} />
                </div>
                <div>
                  <h3 className="font-bold">{bucket.name}</h3>
                  <p className="text-xs text-foreground-muted">{bucket.description}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingBucket(bucket.id)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Categorías
              </button>
            </div>

            {/* Percentage slider */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-foreground-muted">Porcentaje</span>
                <span className="font-medium">{bucket.percentage}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={bucket.percentage}
                onChange={(e) => handlePercentageChange(bucket.id, parseInt(e.target.value))}
                className="w-full"
                style={{ accentColor: bucket.color }}
              />
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-foreground-muted">
                  ${bucket.spent.toFixed(2)} gastado
                </span>
                <span className="text-foreground-muted">
                  ${bucket.targetAmount.toFixed(2)} presupuesto
                </span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${Math.min(100, (bucket.spent / bucket.targetAmount) * 100)}%`,
                    backgroundColor: bucket.spent > bucket.targetAmount ? '#ef4444' : bucket.color
                  }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className={cn(
                  bucket.spent > bucket.targetAmount ? "text-danger" : "text-foreground-muted"
                )}>
                  {bucket.spent > bucket.targetAmount 
                    ? `$${(bucket.spent - bucket.targetAmount).toFixed(2)} sobre presupuesto`
                    : `$${(bucket.targetAmount - bucket.spent).toFixed(2)} remaining`
                  }
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para editar categorías */}
      {editingBucket && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50 animate-fade-in">
          <div className="bg-card w-full max-h-[80vh] rounded-t-2xl p-4 overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Categorías en {editingBucket}</h3>
              <button onClick={() => setEditingBucket(null)}>
                <Check className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-foreground-muted mb-4">
              Seleccioná las categorías que pertenezcan a este grupo. Cada categoría solo puede estar en un grupo.
            </p>

            <div className="space-y-2">
              {userCategories.map(cat => {
                const isInThisBucket = bucketCategories[editingBucket]?.includes(cat.id);
                const isInOtherBucket = assignedCategories.includes(cat.id) && !isInThisBucket;

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (isInThisBucket) {
                        removeCategoryFromBucket(editingBucket, cat.id);
                      } else if (!isInOtherBucket) {
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
              className="w-full bg-app-primary text-white py-3 mt-4 rounded-xl font-medium"
            >
              Listo
            </button>
          </div>

          <style>{`
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
            .animate-fade-in { animation: fade-in 0.2s ease-out; }
            .animate-slide-up { animation: slide-up 0.3s ease-out; }
          `}</style>
        </div>
      )}
    </div>
  );
}
