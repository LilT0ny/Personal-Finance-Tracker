import { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { useBudgets } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { cn } from '../lib/utils';

interface BudgetManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BudgetManager({ isOpen, onClose }: BudgetManagerProps) {
  const { budgets, addBudget, deleteBudget } = useBudgets();
  const { categories } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [limitAmount, setLimitAmount] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [type, setType] = useState<'income' | 'expense'>('expense');

  const handleSave = async () => {
    if (!selectedCategory || !limitAmount) return;
    
    await addBudget({
      categoria_id: selectedCategory,
      limit_amount: parseFloat(limitAmount),
      period,
      type,
    });

    // Reset form
    setSelectedCategory('');
    setLimitAmount('');
  };

  const availableCategories = categories.filter(
    cat => !budgets.some(b => b.categoria_id === cat.id && b.type === type && b.period === period)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Gestionar Presupuestos</h2>
          <button onClick={onClose} className="p-2 hover:bg-background rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add new budget form */}
        <div className="space-y-3 mb-6 p-4 bg-background rounded-xl">
          <h3 className="font-medium text-sm">Agregar Presupuesto</h3>
          
          <div className="flex gap-2">
            <button
              onClick={() => setType('expense')}
              className={cn("flex-1 py-2 rounded-lg text-sm", type === 'expense' ? 'bg-danger text-white' : 'bg-card')}
            >
              Gasto
            </button>
            <button
              onClick={() => setType('income')}
              className={cn("flex-1 py-2 rounded-lg text-sm", type === 'income' ? 'bg-success text-white' : 'bg-card')}
            >
              Ingreso
            </button>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input w-full"
          >
            <option value="">Seleccionar categoría</option>
            {availableCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="number"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="Monto límite"
              className="input flex-1"
            />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'weekly' | 'monthly')}
              className="input w-28"
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={!selectedCategory || !limitAmount}
            className={cn("btn-primary w-full", (!selectedCategory || !limitAmount) && "opacity-50")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar
          </button>
        </div>

        {/* Existing budgets */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-foreground-muted">Presupuestos actuales</h3>
          {budgets.length === 0 ? (
            <p className="text-center text-foreground-muted py-4">No hay presupuestos configurados</p>
          ) : (
            budgets.map(budget => {
              const category = categories.find(c => c.id === budget.categoria_id);
              return (
                <div key={budget.id} className="flex items-center justify-between p-3 bg-background rounded-xl">
                  <div>
                    <p className="font-medium">{category?.nombre || 'Sin categoría'}</p>
                    <p className="text-xs text-foreground-muted">
                      ${budget.limit_amount} / {budget.period === 'weekly' ? 'semana' : 'mes'}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteBudget(budget.id)}
                    className="p-2 text-danger hover:bg-danger/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
