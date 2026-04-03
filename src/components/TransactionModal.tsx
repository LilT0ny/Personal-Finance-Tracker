import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { getCategoryConfig } from '../types';
import { cn } from '../lib/utils';

interface TransactionModalProps {
  isOpen: boolean;
  selectedCategory?: string;
  onClose: () => void;
  onSave: (amount: number, type: 'income' | 'expense', note?: string) => void;
}

export function TransactionModal({ 
  isOpen, 
  selectedCategory, 
  onClose, 
  onSave 
}: TransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [note, setNote] = useState('');
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const categoryConfig = selectedCategory ? getCategoryConfig(selectedCategory) : null;

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || parsedAmount <= 0) return;
    
    onSave(parsedAmount, type, note || undefined);
    
    // Reset form
    setAmount('');
    setNote('');
    setType('expense');
  };

  const handleAmountChange = (value: string) => {
    // Allow only numbers and one decimal point
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
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal Content - Centered */}
        <div className="relative w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl animate-fade-in">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 tap-target rounded-full hover:bg-background transition-colors"
          >
            <X className="w-5 h-5 text-foreground-muted" />
          </button>

          {/* Category Header */}
          {categoryConfig && (
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${categoryConfig.color}20` }}
              >
                <span 
                  className="text-xl"
                  style={{ color: categoryConfig.color }}
                >
                  {categoryConfig.label[0]}
                </span>
              </div>
              <div>
                <p className="text-foreground-muted text-sm">Agregar a</p>
                <p className="font-semibold text-lg">{categoryConfig.label}</p>
              </div>
            </div>
          )}

          {/* Type Toggle */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setType('expense')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all",
                type === 'expense'
                  ? "bg-danger text-white"
                  : "bg-background text-foreground-muted"
              )}
            >
              <Minus className="w-4 h-4" />
              Gasto
            </button>
            <button
              onClick={() => setType('income')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all",
                type === 'income'
                  ? "bg-success text-white"
                  : "bg-background text-foreground-muted"
              )}
            >
              <Plus className="w-4 h-4" />
              Ingreso
            </button>
          </div>

          {/* Amount Input */}
          <div className="mb-6">
            <label className="text-foreground-muted text-sm block mb-2">Monto</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-foreground-muted">
                $
              </span>
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
          <div className="mb-6">
            <label className="text-foreground-muted text-sm block mb-2">Nota (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Descripción del gasto..."
              className="input w-full"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!amount || parseFloat(amount) <= 0}
            className={cn(
              "w-full btn-primary py-4 text-lg font-bold",
              (!amount || parseFloat(amount) <= 0) && "opacity-50 cursor-not-allowed"
            )}
          >
            Guardar Transacción
          </button>
        </div>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fade-in 0.2s ease-out;
          }
        `}</style>
      </div>
    );
  }

  // Mobile modal - bottom sheet
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full bg-card rounded-t-3xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 tap-target rounded-full hover:bg-background transition-colors"
        >
          <X className="w-5 h-5 text-foreground-muted" />
        </button>

        {/* Category Header */}
        {categoryConfig && (
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${categoryConfig.color}20` }}
            >
              <span 
                className="text-xl"
                style={{ color: categoryConfig.color }}
              >
                {categoryConfig.label[0]}
              </span>
            </div>
            <div>
              <p className="text-foreground-muted text-sm">Agregar a</p>
              <p className="font-semibold text-lg">{categoryConfig.label}</p>
            </div>
          </div>
        )}

        {/* Type Toggle */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setType('expense')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all",
              type === 'expense'
                ? "bg-danger text-white"
                : "bg-background text-foreground-muted"
            )}
          >
            <Minus className="w-4 h-4" />
            Gasto
          </button>
          <button
            onClick={() => setType('income')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all",
              type === 'income'
                ? "bg-success text-white"
                : "bg-background text-foreground-muted"
            )}
          >
            <Plus className="w-4 h-4" />
            Ingreso
          </button>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="text-foreground-muted text-sm block mb-2">Monto</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-foreground-muted">
              $
            </span>
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
        <div className="mb-6">
          <label className="text-foreground-muted text-sm block mb-2">Nota (opcional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Descripción del gasto..."
            className="input w-full"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!amount || parseFloat(amount) <= 0}
          className={cn(
            "w-full btn-primary py-4 text-lg font-bold",
            (!amount || parseFloat(amount) <= 0) && "opacity-50 cursor-not-allowed"
          )}
        >
          Guardar Transacción
        </button>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
