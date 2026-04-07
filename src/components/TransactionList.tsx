import { 
  UtensilsCrossed, 
  Car, 
  Heart, 
  Gamepad2, 
  ShoppingBag, 
  Zap, 
  PiggyBank, 
  MoreHorizontal,
  Circle
} from 'lucide-react';
import { Transaction } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo } from 'react';

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
              
              return (
                <div 
                  key={transaction.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
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
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}