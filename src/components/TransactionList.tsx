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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-foreground-muted">No hay transacciones aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-foreground-muted text-sm mb-3">Últimas Transacciones</h3>
      
      {transactions.map((transaction) => {
        // Use category data from database or fallback to config
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
                {format(new Date(transaction.fecha), 'dd MMM', { locale: es })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
