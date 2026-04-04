import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Trash2, Plus, X, Circle, UtensilsCrossed, Car, Heart, Gamepad2, ShoppingBag, Zap, PiggyBank, MoreHorizontal, Edit3, User, Save } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { Categoria, Usuario } from '../types';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

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

export function ConfigPage() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const [activeTab, setActiveTab] = useState<'perfil' | 'categorias' | 'presupuestos'>('perfil');
  const usuarioId = localStorage.getItem('usuario_id');
  
  // Usuario state
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loadingUsuario, setLoadingUsuario] = useState(true);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  
  // Formulario perfil
  const [formPerfil, setFormPerfil] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    telefono: '',
    fecha_nacimiento: '',
    color_primario: '#3b82f6',
  });

  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState(COLOR_OPTIONS[0]);
  const [categoryIcon, setCategoryIcon] = useState('Circle');
  const [categoryLimit, setCategoryLimit] = useState('');

  // Cargar datos del usuario
  useEffect(() => {
    if (!usuarioId) return;
    
    const fetchUsuario = async () => {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', usuarioId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setUsuario(data);
          
          // También obtener los parámetros del sistema para el color
          const { data: paramData } = await supabase
            .from('parametros_sistema')
            .select('color_primario')
            .eq('usuario_id', data.id)
            .single();
          
          setFormPerfil({
            nombre: data.nombre || '',
            apellido_paterno: data.apellido_paterno || '',
            apellido_materno: data.apellido_materno || '',
            telefono: data.telefono || '',
            fecha_nacimiento: data.fecha_nacimiento || '',
            color_primario: paramData?.color_primario || '#3b82f6',
          });
        }
      } catch (err) {
        console.error('Error fetching usuario:', err);
      } finally {
        setLoadingUsuario(false);
      }
    };

    fetchUsuario();
  }, [usuarioId]);

  // Guardar perfil
  const handleGuardarPerfil = async () => {
    if (!usuarioId || !usuario) return;
    
    setGuardandoPerfil(true);
    try {
      // Actualizar usuario
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          nombre: formPerfil.nombre,
          apellido_paterno: formPerfil.apellido_paterno,
          apellido_materno: formPerfil.apellido_materno,
          telefono: formPerfil.telefono,
          fecha_nacimiento: formPerfil.fecha_nacimiento,
        })
        .eq('id', usuario.id);

      if (updateError) throw updateError;

      // Actualizar parámetros del sistema
      const { error: paramError } = await supabase
        .from('parametros_sistema')
        .update({
          color_primario: formPerfil.color_primario,
        })
        .eq('usuario_id', usuario.id);

      if (paramError) throw paramError;

      setEditandoPerfil(false);
      // Recargar datos
      window.location.reload();
    } catch (err) {
      console.error('Error guardando perfil:', err);
      alert('Error al guardar perfil');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  // Open category modal
  const openCategoryModal = (cat?: Categoria) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryName(cat.nombre);
      setCategoryColor(cat.color);
      setCategoryIcon(cat.icono);
      setCategoryLimit(cat.limite_gastos.toString());
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
      setCategoryIcon('Circle');
      setCategoryLimit('');
    }
    setShowCategoryModal(true);
  };

  // Save category
  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;
    
    if (editingCategory) {
      await updateCategory(editingCategory.id, {
        nombre: categoryName,
        color: categoryColor,
        icono: categoryIcon,
        limite_gastos: parseFloat(categoryLimit) || 0,
      });
    } else {
      await addCategory({
        nombre: categoryName,
        color: categoryColor,
        icono: categoryIcon,
        limite_gastos: parseFloat(categoryLimit) || 0,
      });
    }
    setShowCategoryModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Configuración</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('perfil')}
          className={cn(
            "px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap",
            activeTab === 'perfil' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-foreground-muted'
          )}
        >
          <User className="w-4 h-4 inline mr-1" />
          Perfil
        </button>
        <button
          onClick={() => setActiveTab('categorias')}
          className={cn(
            "px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap",
            activeTab === 'categorias' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-foreground-muted'
          )}
        >
          Categorías
        </button>
        <button
          onClick={() => setActiveTab('presupuestos')}
          className={cn(
            "px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap",
            activeTab === 'presupuestos' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-foreground-muted'
          )}
        >
          Presupuestos
        </button>
      </div>

      {/* Perfil Tab */}
      {activeTab === 'perfil' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Información Personal</h3>
            {!editandoPerfil && (
              <button
                onClick={() => setEditandoPerfil(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm"
              >
                <Edit3 className="w-4 h-4" />
                Editar
              </button>
            )}
          </div>

          {loadingUsuario ? (
            <p className="text-foreground-muted">Cargando...</p>
          ) : (
            <div className="space-y-4">
              {/* Email (solo lectura) */}
              <div>
                <label className="text-foreground-muted text-sm block mb-1">Email</label>
                <input
                  type="email"
                  value={usuario?.email || localStorage.getItem('usuario_email') || ''}
                  disabled
                  className="input w-full opacity-60"
                />
              </div>

              {/* Nombre */}
              <div>
                <label className="text-foreground-muted text-sm block mb-1">Nombre</label>
                <input
                  type="text"
                  value={formPerfil.nombre}
                  onChange={(e) => setFormPerfil({...formPerfil, nombre: e.target.value})}
                  disabled={!editandoPerfil}
                  className="input w-full"
                  placeholder="Tu nombre"
                />
              </div>

              {/* Apellido Paterno */}
              <div>
                <label className="text-foreground-muted text-sm block mb-1">Apellido Paterno</label>
                <input
                  type="text"
                  value={formPerfil.apellido_paterno}
                  onChange={(e) => setFormPerfil({...formPerfil, apellido_paterno: e.target.value})}
                  disabled={!editandoPerfil}
                  className="input w-full"
                  placeholder="Tu apellido"
                />
              </div>

              {/* Apellido Materno */}
              <div>
                <label className="text-foreground-muted text-sm block mb-1">Apellido Materno</label>
                <input
                  type="text"
                  value={formPerfil.apellido_materno}
                  onChange={(e) => setFormPerfil({...formPerfil, apellido_materno: e.target.value})}
                  disabled={!editandoPerfil}
                  className="input w-full"
                  placeholder="Tu apellido (opcional)"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="text-foreground-muted text-sm block mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formPerfil.telefono}
                  onChange={(e) => setFormPerfil({...formPerfil, telefono: e.target.value})}
                  disabled={!editandoPerfil}
                  className="input w-full"
                  placeholder="0999999999"
                />
              </div>

              {/* Fecha de nacimiento */}
              <div>
                <label className="text-foreground-muted text-sm block mb-1">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={formPerfil.fecha_nacimiento}
                  onChange={(e) => setFormPerfil({...formPerfil, fecha_nacimiento: e.target.value})}
                  disabled={!editandoPerfil}
                  className="input w-full"
                />
                {usuario?.edad && (
                  <p className="text-xs text-foreground-muted mt-1">Edad: {usuario.edad} años</p>
                )}
              </div>

              {/* Color primario */}
              <div>
                <label className="text-foreground-muted text-sm block mb-1">Color de la App</label>
                <div className="flex gap-2">
                  {['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#22c55e', '#f97316'].map((color) => (
                    <button
                      key={color}
                      onClick={() => editandoPerfil && setFormPerfil({...formPerfil, color_primario: color})}
                      disabled={!editandoPerfil}
                      className={cn(
                        "w-8 h-8 rounded-full transition-transform",
                        formPerfil.color_primario === color && "ring-2 ring-offset-2 ring-primary scale-110",
                        !editandoPerfil && "opacity-50"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Botones guardar */}
              {editandoPerfil && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEditandoPerfil(false)}
                    className="flex-1 py-2 bg-background border border-border rounded-xl font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarPerfil}
                    disabled={guardandoPerfil}
                    className="flex-1 py-2 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    {guardandoPerfil ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Guardar
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categorias' && (
        <div className="space-y-2">
          <button
            onClick={() => openCategoryModal()}
            className="w-full flex items-center justify-center gap-2 p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Nueva Categoría</span>
          </button>

          {categories.length === 0 ? (
            <p className="text-center text-foreground-muted py-8">
              No hay categorías. Agregá una nueva.
            </p>
          ) : (
            categories.map((cat) => {
              const IconOption = ICON_OPTIONS.find(i => i.id === cat.icono)?.icon || Circle;
              return (
                <div 
                  key={cat.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <IconOption style={{ color: cat.color }} className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">{cat.nombre}</span>
                    {cat.limite_gastos > 0 && (
                      <p className="text-xs text-foreground-muted">Límite: ${cat.limite_gastos}/mes</p>
                    )}
                  </div>
                  <button
                    onClick={() => openCategoryModal(cat)}
                    className="p-2 text-foreground-muted hover:bg-background rounded-lg"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="p-2 text-danger hover:bg-danger/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Budgets Tab */}
      {activeTab === 'presupuestos' && (
        <div className="space-y-2">
          <p className="text-foreground-muted text-sm mb-2">
            Los límites se establecen de forma mensual.
          </p>
          
          {categories.map((cat) => (
            <div 
              key={cat.id}
              className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${cat.color}20` }}
              >
                <span style={{ color: cat.color }} className="font-bold text-sm">
                  {cat.nombre[0]}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium">{cat.nombre}</p>
                <p className="text-xs text-foreground-muted">
                  {cat.limite_gastos > 0 
                    ? `$${cat.limite_gastos}/mes`
                    : 'Sin límite'}
                </p>
              </div>
              <button
                onClick={() => openCategoryModal(cat)}
                className="px-3 py-1 rounded-lg text-sm font-medium bg-primary/20 text-primary"
              >
                {cat.limite_gastos > 0 ? 'Editar' : 'Agregar'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)} />
          
          <div className="relative w-full lg:max-w-md bg-card rounded-t-3xl lg:rounded-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowCategoryModal(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-background">
              <X className="w-5 h-5 text-foreground-muted" />
            </button>

            <h2 className="text-xl font-bold mb-4">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>

            <div className="mb-4">
              <label className="text-foreground-muted text-sm block mb-2">Nombre</label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Ej: Comida, Transporte..."
                className="input w-full"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="text-foreground-muted text-sm block mb-2">Límite Mensual ($)</label>
              <input
                type="number"
                value={categoryLimit}
                onChange={(e) => setCategoryLimit(e.target.value)}
                placeholder="0.00"
                className="input w-full"
              />
            </div>

            <div className="mb-4">
              <label className="text-foreground-muted text-sm block mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCategoryColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform",
                      categoryColor === color && "ring-2 ring-offset-2 ring-primary scale-110"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-foreground-muted text-sm block mb-2">Icono</label>
              <div className="grid grid-cols-5 gap-2">
                {ICON_OPTIONS.map((iconOption) => {
                  const Icon = iconOption.icon;
                  return (
                    <button
                      key={iconOption.id}
                      onClick={() => setCategoryIcon(iconOption.id)}
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        categoryIcon === iconOption.id 
                          ? "bg-primary text-white" 
                          : "bg-background"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSaveCategory}
              disabled={!categoryName.trim()}
              className={cn(
                "w-full btn-primary py-3",
                !categoryName.trim() && "opacity-50 cursor-not-allowed"
              )}
            >
              {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
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
