import { useState, useEffect } from 'react';
import { Plus, Minus, UtensilsCrossed, Car, Heart, Gamepad2, ShoppingBag, Zap, PiggyBank, MoreHorizontal, Circle } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from '@heroui/react';
import { useCategories } from '../hooks/useCategories';
import { cn } from '../lib/utils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number, category: string, type: 'income' | 'expense', note?: string) => Promise<void>;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UtensilsCrossed, Car, Heart, Gamepad2, ShoppingBag, Zap, PiggyBank, MoreHorizontal, Circle,
};

export function TransactionModal({ isOpen, onClose, onSave }: TransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const { categories } = useCategories();

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNote('');
      setType('expense');
      setSelectedCategory('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    const normalizedAmount = amount.replace(',', '.');
    const parsedAmount = parseFloat(normalizedAmount);
    if (!amount || parsedAmount <= 0 || !selectedCategory || saving) return;
    setSaving(true);
    try {
      await onSave(parsedAmount, selectedCategory, type, note || undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleAmountChange = (value: string) => {
    const regex = /^\d*[,.]?\d{0,2}$/;
    if (regex.test(value) || value === '') setAmount(value);
  };

  const canSave = !!amount && parseFloat(amount.replace(',', '.')) > 0 && !!selectedCategory;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="auto"
      backdrop="blur"
      scrollBehavior="inside"
      classNames={{
        base: "bg-card border border-border mx-2 sm:mx-0",
        header: "border-b border-border",
        closeButton: "text-foreground-muted hover:bg-background top-3 right-3",
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="text-xl font-bold px-5 pt-5 pb-4">
              Nueva Transacción
            </ModalHeader>

            <ModalBody className="px-5 pb-6 pt-2 gap-5">

              {/* Type Toggle — pill con track */}
              <div className="flex gap-1.5 p-1.5 bg-background rounded-2xl border border-border">
                <button
                  onClick={() => setType('expense')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all",
                    type === 'expense'
                      ? "bg-danger text-white shadow-sm"
                      : "text-foreground-muted hover:text-foreground"
                  )}
                >
                  <Minus className="w-3.5 h-3.5" />
                  Gasto
                </button>
                <button
                  onClick={() => setType('income')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all",
                    type === 'income'
                      ? "bg-success text-white shadow-sm"
                      : "text-foreground-muted hover:text-foreground"
                  )}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ingreso
                </button>
              </div>

              {/* Amount — hero element */}
              <div className="bg-background rounded-2xl p-4 border border-border">
                <p className="text-[11px] font-semibold text-foreground-muted uppercase tracking-widest mb-3 text-center">
                  Monto
                </p>
                <div className="relative flex items-center justify-center">
                  <span className="text-2xl font-light text-foreground-muted mr-1">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="bg-transparent text-5xl font-bold text-center w-full focus:outline-none placeholder:text-foreground-muted/25 text-foreground"
                    style={{ caretColor: 'var(--primary)' }}
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <p className="text-[11px] font-semibold text-foreground-muted uppercase tracking-widest mb-3">
                  Categoría
                </p>
                {categories.length === 0 ? (
                  <p className="text-foreground-muted text-sm py-4 text-center">
                    No hay categorías. Agregá una en ⚙️ primero.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-0.5">
                    {categories.map(cat => {
                      const Icon = ICON_MAP[cat.icono] || Circle;
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all border-2",
                            isSelected ? "shadow-sm" : "border-transparent bg-background hover:bg-background/70"
                          )}
                          style={
                            isSelected
                              ? { borderColor: cat.color, backgroundColor: `${cat.color}12` }
                              : {}
                          }
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${cat.color}25` }}
                          >
                            <span style={{ color: cat.color }}>
                              <Icon className="w-4 h-4" />
                            </span>
                          </div>
                          <span className="text-[10px] font-medium truncate w-full text-center leading-tight">
                            {cat.nombre}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <p className="text-[11px] font-semibold text-foreground-muted uppercase tracking-widest mb-3">
                  Nota <span className="normal-case font-normal">(opcional)</span>
                </p>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="¿En qué gastaste?"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Guardar — en el body para que scrollee con el teclado */}
              <Button
                className="w-full bg-primary text-white font-bold text-base h-14 rounded-2xl mt-1"
                onPress={handleSave}
                isDisabled={!canSave}
                isLoading={saving}
              >
                Guardar
              </Button>

            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
