import { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { cn } from '../lib/utils';

const ICON_OPTIONS = [
  'UtensilsCrossed', 'Car', 'Heart', 'Gamepad2', 'ShoppingBag', 'Zap', 'PiggyBank', 
  'MoreHorizontal', 'Home', 'Phone', 'Wifi', 'Tv', 'Coffee', 'Briefcase', 'GraduationCap',
  'Plane', 'Gift', 'DollarSign', 'CreditCard', 'Wallet'
];

const COLOR_OPTIONS = [
  '#f97316', '#3b82f6', '#ef4444', '#a855f7', '#ec4899', '#eab308', '#22c55e', 
  '#6b7280', '#14b8a6', '#f43f5e', '#8b5cf6', '#0ea5e9'
];

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryManager({ isOpen, onClose }: CategoryManagerProps) {
  const { categories, addCategory, deleteCategory } = useCategories();
  const [newCategory, setNewCategory] = useState({ label: '', icon: 'UtensilsCrossed', color: '#f97316' });
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddCategory = async () => {
    if (!newCategory.label.trim()) return;
    
    await addCategory({
      label: newCategory.label,
      icon: newCategory.icon,
      color: newCategory.color,
    });

    setNewCategory({ label: '', icon: 'UtensilsCrossed', color: '#f97316' });
    setShowAddForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Gestionar Categorías</h2>
          <button onClick={onClose} className="p-2 hover:bg-background rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add new category form */}
        {showAddForm ? (
          <div className="space-y-3 mb-6 p-4 bg-background rounded-xl">
            <h3 className="font-medium text-sm">Nueva Categoría</h3>
            
            <input
              type="text"
              value={newCategory.label}
              onChange={(e) => setNewCategory({ ...newCategory, label: e.target.value })}
              placeholder="Nombre de la categoría"
              className="input w-full"
            />

            {/* Icon selection */}
            <div>
              <p className="text-xs text-foreground-muted mb-2">Icono</p>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewCategory({ ...newCategory, icon })}
                    className={cn(
                      "p-2 rounded-lg text-lg",
                      newCategory.icon === icon ? 'bg-primary text-white' : 'bg-card'
                    )}
                  >
                    {icon[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Color selection */}
            <div>
              <p className="text-xs text-foreground-muted mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewCategory({ ...newCategory, color })}
                    className={cn(
                      "w-8 h-8 rounded-full",
                      newCategory.color === color && 'ring-2 ring-white ring-offset-2 ring-offset-card'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2 bg-card rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddCategory}
                disabled={!newCategory.label.trim()}
                className={cn("btn-primary flex-1", !newCategory.label.trim() && "opacity-50")}
              >
                Agregar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full mb-4 py-3 border-2 border-dashed border-border rounded-xl text-foreground-muted hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-5 h-5 mx-auto" />
          </button>
        )}

        {/* Existing categories */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-foreground-muted">Categorías disponibles</h3>
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-3 bg-background rounded-xl">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <span style={{ color: cat.color }} className="text-lg font-bold">
                    {cat.label[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{cat.label}</p>
                  {cat.is_default && (
                    <p className="text-xs text-foreground-muted">Por defecto</p>
                  )}
                </div>
              </div>
              {!cat.is_default && (
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="p-2 text-danger hover:bg-danger/10 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
