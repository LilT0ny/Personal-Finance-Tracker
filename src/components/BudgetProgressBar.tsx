import { cn } from '../lib/utils';

interface BudgetProgressBarProps {
  spent: number;
  limit: number;
  type: 'income' | 'expense';
}

export function BudgetProgressBar({ spent, limit, type }: BudgetProgressBarProps) {
  if (!limit || limit <= 0) return null;

  const percentage = Math.min((spent / limit) * 100, 100);
  const isOverBudget = type === 'expense' && spent > limit;
  const warningThreshold = type === 'expense' && spent >= limit * 0.8;

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-foreground-muted">${spent.toFixed(2)}</span>
        <span className="text-foreground-muted">${limit.toFixed(2)}</span>
      </div>
      <div className="h-2 bg-background rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isOverBudget ? "bg-danger" : warningThreshold ? "bg-yellow-500" : "bg-success"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isOverBudget && (
        <p className="text-xs text-danger mt-1">¡Presupuesto excedido!</p>
      )}
    </div>
  );
}
