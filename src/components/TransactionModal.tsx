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
    if (regex.test(value) || value === '') {
      setAmount(value);
    }
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
        base: "bg-card border border-border",
        header: "border-b border-border pb-3",
        closeButton: "text-foreground-muted hover:bg-background",
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="text-xl font-bold">Nueva Transacción</ModalHeader>

            <ModalBody className="gap-4 py-3">
              {/* Type Toggle */}
              <div className="flex gap-3">
                <button
                  onClick={() => setType('expense')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all",
                    type === 'expense' ? "bg-danger text-white" : "bg-background text-foreground-muted"
                  )}
                >
                  <Minus className="w-4 h-4" /> Gasto
                </button>
                <button
                  onClick={() => setType('income')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all",
                    type === 'income' ? "bg-success text-white" : "bg-background text-foreground-muted"
                  )}
                >
                  <Plus className="w-4 h-4" /> Ingreso
                </button>
              </div>

              {/* Category Selection */}
              <div>
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
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${cat.color}20` }}
                          >
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
              <div>
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
                  />
                </div>
              </div>

              {/* Note Input */}
              <div>
                <label className="text-foreground-muted text-sm block mb-2">Nota (opcional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Descripción..."
                  className="input w-full"
                />
              </div>

              {/* Guardar dentro del body scrolleable — así el teclado no lo tapa en mobile */}
              <Button
                className="w-full bg-primary text-white font-bold text-base mt-2"
                size="lg"
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
