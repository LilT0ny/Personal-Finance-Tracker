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
  Trash2
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
  const { deleteTransaction, updateTransaction } = useTransactions();
  const { categories } = useCategories();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
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
              
              const isDeleting = deleteConfirmId === transaction.id;
              
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
                      onClick={() => isDeleting ? deleteTransaction(transaction.id).then(() => setDeleteConfirmId(null)) : setDeleteConfirmId(transaction.id)}
                      className={cn(
                        "p-2 rounded-lg",
                        isDeleting ? "bg-danger text-white" : "hover:bg-background"
                      )}
                      title={isDeleting ? "Confirmar eliminar" : "Eliminar"}
                    >
                      <Trash2 className={cn("w-4 h-4", isDeleting ? "text-white" : "text-danger")} />
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

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full lg:max-w-md bg-card rounded-t-3xl lg:rounded-2xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-background">
          ✕
        </button>
        
        <h3 className="font-bold text-lg mb-4">Editar Transacción</h3>
        
        {/* Amount */}
        <div className="mb-4">
          <label className="text-foreground-muted text-sm block mb-2">Monto</label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const val = e.target.value.replace(',', '.');
              if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
                setAmount(val);
              }
            }}
            className="input w-full text-2xl font-bold text-center"
            placeholder="0.00"
          />
        </div>
        
        {/* Category */}
        <div className="mb-4">
          <label className="text-foreground-muted text-sm block mb-2">Categoría</label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "p-3 rounded-xl border transition-all flex items-center gap-2",
                  selectedCategory === cat.id 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:bg-background"
                )}
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <span style={{ color: cat.color }} className="text-xs font-bold">{cat.nombre[0]}</span>
                </div>
                <span className="text-sm">{cat.nombre}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Note */}
        <div className="mb-4">
          <label className="text-foreground-muted text-sm block mb-2">Descripción (opcional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input w-full"
            placeholder="Descripción..."
          />
        </div>
        
        <button
          onClick={handleSave}
          disabled={!amount || parseFloat(amount.replace(',', '.')) <= 0 || saving}
          className={cn(
            "w-full bg-primary text-white py-3 rounded-xl font-medium",
            (!amount || parseFloat(amount.replace(',', '.')) <= 0 || saving) && "opacity-50 cursor-not-allowed"
          )}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        
        <style>{`
          @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
          .animate-slide-up { animation: slide-up 0.3s ease-out; }
        `}</style>
      </div>
    </div>
  );
}