import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface BalanceCardProps {
  income: number;
  expenses: number;
}

export function BalanceCard({ income, expenses }: BalanceCardProps) {
  const balance = income - expenses;
  const isPositive = balance >= 0;

  return (
    <div className="card mb-4">
      <div className="text-center">
        <p className="text-foreground-muted text-sm mb-1">Balance Total</p>
        <h2 
          className={cn(
            "text-4xl font-bold",
            isPositive ? "text-success" : "text-danger"
          )}
        >
          {isPositive ? '+' : '-'}${Math.abs(balance).toFixed(2)}
        </h2>
      </div>

      <div className="flex justify-center gap-8 mt-4">
        <div className="flex items-center gap-2">
          <ArrowUpCircle className="w-5 h-5 text-success" />
          <div>
            <p className="text-xs text-foreground-muted">Ingresos</p>
            <p className="text-success font-semibold">+${income.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ArrowDownCircle className="w-5 h-5 text-danger" />
          <div>
            <p className="text-xs text-foreground-muted">Gastos</p>
            <p className="text-danger font-semibold">-${expenses.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
