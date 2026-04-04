import { useState, useEffect } from 'react';
import { X, Plus, Minus, UtensilsCrossed, Car, Heart, Gamepad2, ShoppingBag, Zap, PiggyBank, MoreHorizontal, Circle } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { cn } from '../lib/utils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number, category: string, type: 'income' | 'expense', note?: string) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UtensilsCrossed, Car, Heart, Gamepad2, ShoppingBag, Zap, PiggyBank, MoreHorizontal, Circle,
};

export function TransactionModal({ isOpen, onClose, onSave }: TransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isMobile, setIsMobile] = useState(true);
  const { categories } = useCategories();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNote('');
      setType('expense');
      setSelectedCategory('');
    }
  }, [isOpen]);

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || parsedAmount <= 0 || !selectedCategory) return;
    
    onSave(parsedAmount, selectedCategory, type, note || undefined);
  };

  const handleAmountChange = (value: string) => {
    const regex = /^\d*\.?\d{0,2}$/;
    if (regex.test(value) || value === '') {
      setAmount(value);
    }
  };

  if (!isOpen) return null;

  // Desktop modal - centered
  if (!isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl animate-fade-in max-h-[80vh] overflow-y-auto">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 tap-target rounded-full hover:bg-background">
            <X className="w-5 h-5 text-foreground-muted" />
          </button>

          <h2 className="text-xl font-bold mb-4">Nueva Transacción</h2>

          {/* Type Toggle */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setType('expense')}
              className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium", type === 'expense' ? "bg-danger text-white" : "bg-background text-foreground-muted")}
            >
              <Minus className="w-4 h-4" /> Gasto
            </button>
            <button
              onClick={() => setType('income')}
              className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium", type === 'income' ? "bg-success text-white" : "bg-background text-foreground-muted")}
            >
              <Plus className="w-4 h-4" /> Ingreso
            </button>
          </div>

          {/* Category Selection */}
          <div className="mb-4">
            <label className="text-foreground-muted text-sm block mb-2">Categoría</label>
            {categories.length === 0 ? (
              <p className="text-foreground-muted text-sm py-4">
                No hay categorías. Agregá una en ⚙️ primero.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {categories.map(cat => {
                  const Icon = ICON_MAP[cat.icono] || Circle;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "flex flex-col items-center p-2 rounded-xl transition-all",
                        selectedCategory === cat.id ? "bg-card border-2" : "bg-background"
                      )}
                      style={selectedCategory === cat.id ? { borderColor: cat.color } : {}}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                        <span style={{ color: cat.color }}>
                          <Icon className="w-4 h-4" />
                        </span>
                      </div>
                      <span className="text-xs mt-1 truncate w-full text-center">{cat.nombre}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="mb-4">
            <label className="text-foreground-muted text-sm block mb-2">Monto</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-foreground-muted">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-background border border-border rounded-xl py-4 pl-10 pr-4 text-3xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
            </div>
          </div>

          {/* Note Input */}
          <div className="mb-4">
            <label className="text-foreground-muted text-sm block mb-2">Nota (opcional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Descripción..." className="input w-full" />
          </div>

          <button
            onClick={handleSave}
            disabled={!amount || !selectedCategory || parseFloat(amount) <= 0}
            className={cn("w-full btn-primary py-4 text-lg font-bold", (!amount || !selectedCategory) && "opacity-50 cursor-not-allowed")}
          >
            Guardar
          </button>
        </div>

        <style>{`
          @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
          .animate-fade-in { animation: fade-in 0.2s ease-out; }
        `}</style>
      </div>
    );
  }

  // Mobile modal - bottom sheet
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full bg-card rounded-t-3xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 tap-target rounded-full hover:bg-background">
          <X className="w-5 h-5 text-foreground-muted" />
        </button>

        <h2 className="text-xl font-bold mb-4">Nueva Transacción</h2>

        {/* Type Toggle */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setType('expense')}
            className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium", type === 'expense' ? "bg-danger text-white" : "bg-background text-foreground-muted")}
          >
            <Minus className="w-4 h-4" /> Gasto
          </button>
          <button
            onClick={() => setType('income')}
            className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium", type === 'income' ? "bg-success text-white" : "bg-background text-foreground-muted")}
          >
            <Plus className="w-4 h-4" /> Ingreso
          </button>
        </div>

        {/* Category Selection */}
        <div className="mb-4">
          <label className="text-foreground-muted text-sm block mb-2">Categoría</label>
          {categories.length === 0 ? (
            <p className="text-foreground-muted text-sm py-4">
              No hay categorías. Agregá una en ⚙️ primero.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {categories.map(cat => {
                const Icon = ICON_MAP[cat.icono] || Circle;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex flex-col items-center p-2 rounded-xl transition-all",
                      selectedCategory === cat.id ? "bg-card border-2" : "bg-background"
                    )}
                    style={selectedCategory === cat.id ? { borderColor: cat.color } : {}}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                      <span style={{ color: cat.color }}>
                        <Icon className="w-4 h-4" />
                      </span>
                    </div>
                    <span className="text-xs mt-1 truncate w-full text-center">{cat.nombre}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="text-foreground-muted text-sm block mb-2">Monto</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-foreground-muted">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className="w-full bg-background border border-border rounded-xl py-4 pl-10 pr-4 text-3xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>
        </div>

        {/* Note Input */}
        <div className="mb-4">
          <label className="text-foreground-muted text-sm block mb-2">Nota (opcional)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Descripción..." className="input w-full" />
        </div>

        <button
          onClick={handleSave}
          disabled={!amount || !selectedCategory || parseFloat(amount) <= 0}
          className={cn("w-full btn-primary py-4 text-lg font-bold", (!amount || !selectedCategory) && "opacity-50 cursor-not-allowed")}
        >
          Guardar
        </button>
      </div>

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}
