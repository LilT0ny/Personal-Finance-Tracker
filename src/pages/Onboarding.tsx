import { useState } from 'react';
import { Check, Plus, ArrowRight } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { PREDEFINED_CATEGORIES, CategoryConfig } from '../types';
import { useBudgets } from '../hooks/useBudgets';
import { cn } from '../lib/utils';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { addCategory } = useCategories();
  const { addBudget } = useBudgets();
  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<CategoryConfig[]>([]);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [newCategoryName, setNewCategoryName] = useState('');

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id]
    );
  };

  const handleAddCustom = () => {
    if (!newCategoryName.trim()) return;
    const newCat: CategoryConfig = {
      id: `custom_${Date.now()}`,
      label: newCategoryName,
      icon: 'Circle',
      color: '#6b7280',
      is_default: false,
    };
    setCustomCategories(prev => [...prev, newCat]);
    setSelectedCategories(prev => [...prev, newCat.id]);
    setNewCategoryName('');
  };

  const handleComplete = async () => {
    // Add predefined selected categories
    for (const catId of selectedCategories) {
      const predefined = PREDEFINED_CATEGORIES.find(c => c.id === catId);
      if (predefined) {
        const category = await addCategory({
          nombre: predefined.label,
          icono: predefined.icon,
          color: predefined.color,
        });
        
        // Create budget if limit is set
        const limit = limits[catId];
        if (limit && limit > 0 && category) {
          await addBudget({
            category: predefined.label,
            limit_amount: limit,
            period: 'monthly',
            type: 'expense',
          });
        }
      }
    }
    // Add custom categories
    for (const cat of customCategories) {
      const category = await addCategory({
        nombre: cat.label,
        icono: cat.icon,
        color: cat.color,
      });
      
      // Create budget if limit is set
      const limit = limits[cat.id];
      if (limit && limit > 0 && category) {
        await addBudget({
          category: cat.label,
          limit_amount: limit,
          period: 'monthly',
          type: 'expense',
        });
      }
    }
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="p-4">
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn("h-1 flex-1 rounded-full", step >= s ? "bg-primary" : "bg-border")} />
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">¡Bienvenido!</h1>
            <p className="text-foreground-muted mb-6">Seleccioná las categorías que vas a usar</p>
            
            <div className="space-y-3">
              {PREDEFINED_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-xl border transition-all",
                    selectedCategories.includes(cat.id) 
                      ? "border-primary bg-primary/10" 
                      : "border-border bg-card"
                  )}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <span style={{ color: cat.color }} className="font-bold">{cat.label[0]}</span>
                  </div>
                  <span className="flex-1 text-left font-medium">{cat.label}</span>
                  {selectedCategories.includes(cat.id) && <Check className="w-5 h-5 text-primary" />}
                </button>
              ))}
            </div>

            {/* Add custom category */}
            <div className="mt-4">
              <p className="text-sm text-foreground-muted mb-2">O agregá una categoría custom:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nueva categoría..."
                  className="input flex-1"
                />
                <button
                  onClick={handleAddCustom}
                  disabled={!newCategoryName.trim()}
                  className="btn-primary px-4"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Show custom categories */}
            {customCategories.length > 0 && (
              <div className="mt-4 space-y-2">
                {customCategories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                    <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
                      <span className="text-sm">📦</span>
                    </div>
                    <span className="flex-1">{cat.label}</span>
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Establecé límites</h1>
            <p className="text-foreground-muted mb-6">¿Cuánto querés gastar por mes en cada categoría?</p>
            
            <div className="space-y-4">
              {[...PREDEFINED_CATEGORIES.filter(c => selectedCategories.includes(c.id)), ...customCategories].map(cat => (
                <div key={cat.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <span style={{ color: cat.color }} className="font-bold">{cat.label[0]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{cat.label}</p>
                    <p className="text-xs text-foreground-muted">
                      {limits[cat.id] ? `$${limits[cat.id]} / mes` : 'Sin límite'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground-muted">$</span>
                    <input
                      type="number"
                      value={limits[cat.id] || ''}
                      onChange={(e) => setLimits({ ...limits, [cat.id]: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-20 bg-background border border-border rounded-lg px-3 py-2 text-right font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">¡Listo!</h1>
            <p className="text-foreground-muted mb-6">Resumen de tu configuración</p>
            
            <div className="space-y-3">
              {[...PREDEFINED_CATEGORIES.filter(c => selectedCategories.includes(c.id)), ...customCategories].map(cat => {
                const limit = limits[cat.id] || 0;
                return (
                  <div key={cat.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <span style={{ color: cat.color }} className="font-bold">{cat.label[0]}</span>
                      </div>
                      <span className="font-medium">{cat.label}</span>
                    </div>
                    <span className={limit > 0 ? "text-success" : "text-foreground-muted"}>
                      {limit > 0 ? `$${limit}/mes` : 'Sin límite'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 rounded-xl border border-border bg-card"
            >
              Atrás
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={selectedCategories.length === 0}
              className={cn("flex-1 btn-primary flex items-center justify-center gap-2", selectedCategories.length === 0 && "opacity-50")}
            >
              Siguiente <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex-1 btn-primary"
            >
              Empezar a usar la app
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
