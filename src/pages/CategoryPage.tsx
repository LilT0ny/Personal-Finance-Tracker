import { useState } from 'react';
import { Plus, X, Circle, UtensilsCrossed, Car, Heart, Gamepad2, ShoppingBag, Zap, PiggyBank, MoreHorizontal, Edit3, Trash2 } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { Categoria } from '../types';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { ColorPicker } from '../components/ColorPicker';

const ICON_OPTIONS = [
  { id: 'UtensilsCrossed', icon: UtensilsCrossed, color: '#f97316' },
  { id: 'Car', icon: Car, color: '#3b82f6' },
  { id: 'Heart', icon: Heart, color: '#ef4444' },
  { id: 'Gamepad2', icon: Gamepad2, color: '#a855f7' },
  { id: 'ShoppingBag', icon: ShoppingBag, color: '#ec4899' },
  { id: 'Zap', icon: Zap, color: '#eab308' },
  { id: 'PiggyBank', icon: PiggyBank, color: '#22c55e' },
  { id: 'MoreHorizontal', icon: MoreHorizontal, color: '#6b7280' },
  { id: 'Circle', icon: Circle, color: '#6b7280' },
];

const COLOR_OPTIONS = [
  '#f97316', '#3b82f6', '#a855f7', '#ec4899', '#ef4444', 
  '#eab308', '#22c55e', '#6b7280', '#14b8a6', '#8b5cf6'
];

export function CategoryPage() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const usuarioId = localStorage.getItem('usuario_id');

  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('Circle');
  const [categoryColor, setCategoryColor] = useState('#6b7280');
  const [categoryLimit, setCategoryLimit] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Get icon component
  const getIconComponent = (iconId: string) => {
    const iconOption = ICON_OPTIONS.find(i => i.id === iconId);
    return iconOption ? iconOption.icon : Circle;
  };

  const handleOpenModal = (category?: Categoria) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.nombre);
      setCategoryIcon(category.icono);
      setCategoryColor(category.color);
      setCategoryLimit(category.limite_gastos?.toString() || '');
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryIcon('Circle');
      setCategoryColor('#6b7280');
      setCategoryLimit('');
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim() || !usuarioId) return;

    setSaving(true);
    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categorias')
          .update({
            nombre: categoryName,
            icono: categoryIcon,
            color: categoryColor,
            limite_gastos: categoryLimit ? parseFloat(categoryLimit) : 0,
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        updateCategory(editingCategory.id, {
          nombre: categoryName,
          icono: categoryIcon,
          color: categoryColor,
          limite_gastos: categoryLimit ? parseFloat(categoryLimit) : 0,
        });
      } else {
        // Create new category
        const { error } = await supabase
          .from('categorias')
          .insert({
            usuario_id: usuarioId,
            nombre: categoryName,
            icono: categoryIcon,
            color: categoryColor,
            limite_gastos: categoryLimit ? parseFloat(categoryLimit) : 0,
          });

        if (error) throw error;
        addCategory({
          nombre: categoryName,
          icono: categoryIcon,
          color: categoryColor,
          limite_gastos: categoryLimit ? parseFloat(categoryLimit) : 0,
        });
      }

      setShowCategoryModal(false);
    } catch (err) {
      console.error('Error saving category:', err);
      alert('Error al guardar categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Esta seguro de eliminar esta categoria?')) return;

    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      deleteCategory(categoryId);
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Error al eliminar categoria');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Categorias</h2>
              <p className="text-foreground-muted text-sm">
                {categories.length} categorias
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Nueva
          </button>
        </div>
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="card text-center py-8">
          <ShoppingBag className="w-12 h-12 text-foreground-muted mx-auto mb-2" />
          <p className="text-foreground-muted">No hay categorias</p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-xl font-medium"
          >
            Crear primera categoria
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categories.map((category) => {
            const Icon = getIconComponent(category.icono);
            return (
              <div
                key={category.id}
                className="card flex items-center gap-3"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <span style={{ color: category.color }}>
                    <Icon className="w-6 h-6" />
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{category.nombre}</p>
                  {category.limite_gastos > 0 && (
                    <p className="text-xs text-foreground-muted">
                      Limite: ${category.limite_gastos}/mes
                    </p>
                  )}
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenModal(category)}
                    className="p-2 rounded-lg hover:bg-background"
                  >
                    <Edit3 className="w-4 h-4 text-foreground-muted" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-2 rounded-lg hover:bg-background"
                  >
                    <Trash2 className="w-4 h-4 text-danger" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)} />
          
          <div className="relative w-full lg:max-w-md bg-card rounded-t-3xl lg:rounded-2xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto">
            <button onClick={() => setShowCategoryModal(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-background">
              <X className="w-5 h-5 text-foreground-muted" />
            </button>

            <h2 className="text-xl font-bold mb-4">
              {editingCategory ? 'Editar Categoria' : 'Nueva Categoria'}
            </h2>

            {/* Name Input */}
            <div className="mb-4">
              <label className="text-foreground-muted text-sm block mb-2">Nombre</label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Nombre de la categoria"
                className="input w-full"
              />
            </div>

            {/* Icon Selection */}
            <div className="mb-4">
              <label className="text-foreground-muted text-sm block mb-2">Icono</label>
              <div className="grid grid-cols-5 gap-2">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon.id}
                    onClick={() => setCategoryIcon(icon.id)}
                    className={cn(
                      "p-3 rounded-xl transition-all",
                      categoryIcon === icon.id 
                        ? "bg-primary/20 ring-2 ring-primary" 
                        : "bg-background hover:bg-background/80"
                    )}
                  >
                    <icon.icon className="w-6 h-6" style={{ color: icon.color }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div className="mb-4">
              <ColorPicker
                color={categoryColor}
                onChange={setCategoryColor}
                presets={COLOR_OPTIONS}
                label="Color"
              />
            </div>

            {/* Limit Input */}
            <div className="mb-4">
              <label className="text-foreground-muted text-sm block mb-2">
                Limite mensual (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted">$</span>
                <input
                  type="number"
                  value={categoryLimit}
                  onChange={(e) => setCategoryLimit(e.target.value)}
                  placeholder="0.00"
                  className="input w-full pl-8"
                />
              </div>
            </div>

            <button
              onClick={handleSaveCategory}
              disabled={!categoryName.trim() || saving}
              className={cn(
                "w-full btn-primary py-3",
                (!categoryName.trim() || saving) && "opacity-50 cursor-not-allowed"
              )}
            >
              {saving ? 'Guardando...' : 'Guardar'}
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