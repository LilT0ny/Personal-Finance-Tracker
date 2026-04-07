import { 
  UtensilsCrossed, 
  Car, 
  Heart, 
  Gamepad2, 
  ShoppingBag, 
  Zap, 
  PiggyBank, 
  MoreHorizontal,
  Circle,
  Edit3,
  Trash2,
  X
} from 'lucide-react';
import { Transaction } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { cn } from '../lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UtensilsCrossed,
  Car,
  Heart,
  Gamepad2,
  ShoppingBag,
  Zap,
  PiggyBank,
  MoreHorizontal,
  Circle,
};

const DAY_NAMES: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miercoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sabado',
};

export function TransactionList({ transactions }: TransactionListProps) {
  const { updateTransaction, deleteTransaction } = useTransactions();
  const { categories } = useCategories();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    transactions.forEach((transaction) => {
      const date = parseISO(transaction.fecha);
      const dayKey = format(date, 'yyyy-MM-dd');
      
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(transaction);
    });
    
    // Sort by date descending
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    
    return sortedKeys.map(key => ({
      date: key,
      dayName: DAY_NAMES[parseISO(key).getDay()],
      transactions: groups[key],
    }));
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-foreground-muted">No hay transacciones aun</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-foreground-muted text-sm mb-3">Historial de Transacciones</h3>
      
      {groupedTransactions.map((group) => (
        <div key={group.date}>
          {/* Day Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-foreground">
              {group.dayName}
            </span>
            <span className="text-xs text-foreground-muted">
              {format(parseISO(group.date), 'dd MMM', { locale: es })}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Transactions for this day */}
          <div className="space-y-2">
            {group.transactions.map((transaction) => {
              const categoryName = transaction.category || 'Otros';
              const categoryColor = transaction.category_color || '#6b7280';
              const categoryIcon = transaction.category_icon || 'Circle';
              
              const Icon = ICON_MAP[categoryIcon] || Circle;
              
              const isExpense = transaction.tipo === 'Egreso' || transaction.tipo === 'expense';
              
              const isDeleting = deletingTransaction?.id === transaction.id;
              
              return (
                <div 
                  key={transaction.id}
                  className={cn(
                    "flex items-center gap-3 p-3 bg-card rounded-xl border border-border",
                    isDeleting && "border-danger"
                  )}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${categoryColor}20` }}
                  >
                    <span style={{ color: categoryColor }}>
                      <Icon className="w-5 h-5" />
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{categoryName}</p>
                    {transaction.descripcion && (
                      <p className="text-foreground-muted text-xs truncate">{transaction.descripcion}</p>
                    )}
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className={isExpense ? 'text-danger font-semibold' : 'text-success font-semibold'}>
                      {isExpense ? '-' : '+'}${transaction.monto.toFixed(2)}
                    </p>
                    <p className="text-foreground-muted text-xs">
                      {format(parseISO(transaction.fecha), 'HH:mm')}
                    </p>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingTransaction(transaction)}
                      className="p-2 rounded-lg hover:bg-background"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4 text-foreground-muted" />
                    </button>
                    <button
                      onClick={() => setDeletingTransaction(transaction)}
                      className="p-2 rounded-lg hover:bg-background"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4 text-danger" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Edit Modal */}
      {editingTransaction && (
        <TransactionEditModal 
          transaction={editingTransaction}
          categories={categories}
          onSave={async (updates) => {
            await updateTransaction(editingTransaction.id, updates);
            setEditingTransaction(null);
          }}
          onClose={() => setEditingTransaction(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingTransaction && (
        <DeleteConfirmModal
          transaction={deletingTransaction}
          onConfirm={async () => {
            await deleteTransaction(deletingTransaction.id);
            setDeletingTransaction(null);
          }}
          onCancel={() => setDeletingTransaction(null)}
        />
      )}
    </div>
  );
}

// Edit Modal Component
interface TransactionEditModalProps {
  transaction: Transaction;
  categories: { id: string; nombre: string; icono: string; color: string }[];
  onSave: (updates: { monto?: number; categoria_id?: string; descripcion?: string }) => Promise<void>;
  onClose: () => void;
}

function TransactionEditModal({ transaction, categories, onSave, onClose }: TransactionEditModalProps) {
  const [amount, setAmount] = useState(transaction.monto.toString());
  const [selectedCategory, setSelectedCategory] = useState(transaction.categoria_id);
  const [note, setNote] = useState(transaction.descripcion || '');
  const [saving, setSaving] = useState(false);

  const isExpense = transaction.tipo === 'Egreso' || transaction.tipo === 'expense';

  const handleSave = async () => {
    const normalizedAmount = amount.replace(',', '.');
    const parsedAmount = parseFloat(normalizedAmount);
    if (!parsedAmount || parsedAmount <= 0) return;
    
    setSaving(true);
    try {
      await onSave({
        monto: parsedAmount,
        categoria_id: selectedCategory,
        descripcion: note || undefined,
      });
    } catch (err) {
      console.error('Error updating transaction:', err);
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

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full lg:max-w-md bg-card rounded-t-3xl lg:rounded-2xl p-6 animate-slide-up lg:animate-fade-in max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 tap-target rounded-full hover:bg-background">
          <X className="w-5 h-5 text-foreground-muted" />
        </button>

        <h2 className="text-xl font-bold mb-4">
          Editar {isExpense ? 'Egreso' : 'Ingreso'}
        </h2>

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

        {/* Category Selection */}
        <div className="mb-4">
          <label className="text-foreground-muted text-sm block mb-2">Categoría</label>
          {categories.length === 0 ? (
            <p className="text-foreground-muted text-sm py-4">
              No hay categorías.
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

        {/* Note Input */}
        <div className="mb-4">
          <label className="text-foreground-muted text-sm block mb-2">Nota (opcional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Descripción..."
            className="input w-full"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!amount || parseFloat(amount.replace(',', '.')) <= 0 || saving}
          className={cn(
            "w-full py-4 text-lg font-bold rounded-xl",
            isExpense 
              ? "bg-danger hover:bg-danger/90 text-white" 
              : "bg-success hover:bg-success/90 text-white",
            (!amount || parseFloat(amount.replace(',', '.')) <= 0 || saving) && "opacity-50 cursor-not-allowed"
          )}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({ 
  transaction, 
  onConfirm, 
  onCancel 
}: { 
  transaction: Transaction; 
  onConfirm: () => void; 
  onCancel: () => void;
}) {
  const isExpense = transaction.tipo === 'Egreso' || transaction.tipo === 'expense';
  const categoryName = transaction.category || 'Otros';
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      
      <div className="relative w-full max-w-sm bg-card rounded-2xl p-6 shadow-2xl animate-fade-in">
        <h3 className="text-lg font-bold mb-4 text-center">¿Eliminar transacción?</h3>
        
        <div className="bg-background rounded-xl p-4 mb-4">
          <p className="text-center text-foreground-muted text-sm mb-2">
            Esta acción no se puede deshacer
          </p>
          <p className={cn("text-center text-2xl font-bold", isExpense ? "text-danger" : "text-success")}>
            {isExpense ? '-' : '+'}${transaction.monto.toFixed(2)}
          </p>
          <p className="text-center text-foreground-muted text-sm mt-1">
            {categoryName}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-background border border-border rounded-xl font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-danger text-white rounded-xl font-medium"
          >
            Eliminar
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}