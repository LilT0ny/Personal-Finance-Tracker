import { Transaction, getCategoryConfig } from '../types';
import { Budget } from '../hooks/useBudgets';
import { PeriodFilter } from '../hooks/useTransactions';

interface CategoryBudgetChartProps {
  transactions: Transaction[];
  budgets: Budget[];
  period: PeriodFilter;
}

// Get transactions for current week
function getWeeklySpent(transactions: Transaction[], category: string): number {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  return transactions
    .filter(t => 
      t.category === category && 
      (t.tipo === 'Egreso' || t.tipo === 'expense') &&
      new Date(t.fecha) >= startOfWeek
    )
    .reduce((sum, t) => sum + t.monto, 0);
}

// Get transactions for current day
function getDailySpent(transactions: Transaction[], category: string): number {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  startOfDay.setHours(0, 0, 0, 0);

  return transactions
    .filter(t => 
      t.category === category && 
      (t.tipo === 'Egreso' || t.tipo === 'expense') &&
      new Date(t.fecha) >= startOfDay
    )
    .reduce((sum, t) => sum + t.monto, 0);
}

// Get transactions for current year
function getYearlySpent(transactions: Transaction[], category: string): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  return transactions
    .filter(t => 
      t.category === category && 
      (t.tipo === 'Egreso' || t.tipo === 'expense') &&
      new Date(t.fecha) >= startOfYear
    )
    .reduce((sum, t) => sum + t.monto, 0);
}
function getMonthlySpent(transactions: Transaction[], category: string): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return transactions
    .filter(t => 
      t.category === category && 
      (t.tipo === 'Egreso' || t.tipo === 'expense') &&
      new Date(t.fecha) >= startOfMonth
    )
    .reduce((sum, t) => sum + t.monto, 0);
}

export function CategoryBudgetChart({ transactions, budgets, period }: CategoryBudgetChartProps) {
  // Get all categories that have budgets
  const budgetCategories = budgets
    .filter(b => b.type === 'expense')
    .map(b => b.category);
  
  const allCategories = [...new Set([...budgetCategories, ...transactions.map(t => t.category || '')])];
  
  // Prepare chart data
  const chartData = allCategories.filter(Boolean).map(category => {
    const config = getCategoryConfig(category || 'other');
    const budget = budgets.find(b => b.category === category && b.type === 'expense');
    const dailySpent = getDailySpent(transactions, category || 'other');
    const weeklySpent = getWeeklySpent(transactions, category || 'other');
    const monthlySpent = getMonthlySpent(transactions, category || 'other');
    const yearlySpent = getYearlySpent(transactions, category || 'other');
    
    // Determine spent and limit based on period
    let displaySpent: number;
    let limitValue: number;
    
    if (period === 'day') {
      displaySpent = dailySpent;
      limitValue = budget?.limit_amount 
        ? budget.limit_amount / 30 
        : monthlySpent * 0.033;
    } else if (period === 'week') {
      displaySpent = weeklySpent;
      limitValue = budget?.limit_amount 
        ? budget.limit_amount / 4.33 
        : monthlySpent * 0.25;
    } else if (period === 'month') {
      displaySpent = monthlySpent;
      limitValue = budget?.limit_amount || monthlySpent * 1.2;
    } else if (period === 'year') {
      displaySpent = yearlySpent;
      limitValue = (budget?.limit_amount || monthlySpent * 12) * 12;
    } else {
      // All time
      displaySpent = transactions
        .filter(t => t.category === category && (t.tipo === 'Egreso' || t.tipo === 'expense'))
        .reduce((sum, t) => sum + t.monto, 0);
      limitValue = displaySpent * 1.2;
    }
    
    return {
      name: config.label,
      spent: displaySpent,
      limit: limitValue,
      category: category,
      color: config.color,
      isOverBudget: displaySpent > limitValue && limitValue > 0,
    };
  }).filter(d => d.limit > 0); // Only show categories with limits

  // Sort by spent amount (highest first)
  chartData.sort((a, b) => b.spent - a.spent);

  if (chartData.length === 0) {
    return (
      <div className="card mb-4">
        <h3 className="text-center text-foreground-muted text-sm mb-2">Gastos por Categoría</h3>
        <p className="text-center text-foreground-muted py-8">
          Configurá presupuestos en Configuración
        </p>
      </div>
    );
  }

  // Find max value for scaling
  const maxValue = Math.max(...chartData.map(d => Math.max(d.spent, d.limit)));
  const totalExpenses = chartData.reduce((sum, d) => sum + d.spent, 0);
  
  const periodLabel = period === 'day' ? 'hoy' : period === 'week' ? 'semana' : period === 'month' ? 'mes' : period === 'year' ? 'año' : 'total';

  return (
    <div className="card mb-4">
      <h3 className="text-center text-foreground-muted text-sm mb-2">Gastos por Categoría</h3>
      
      {/* Total expenses */}
      <p className="text-center text-foreground-muted text-xs mb-2">
        Total: <span className="text-danger font-bold">${totalExpenses.toFixed(2)}</span>
      </p>
      
      {/* Period label */}
      <p className="text-center text-foreground-muted text-xs mb-4">
        Período: <span className="font-medium">{periodLabel}</span>
      </p>

      {/* Vertical Bar Chart */}
      <div className="flex items-end justify-around gap-2 h-48 pt-4">
        {chartData.map((item) => {
          const spentHeight = maxValue > 0 ? (item.spent / maxValue) * 100 : 0;
          const limitHeight = maxValue > 0 ? (item.limit / maxValue) * 100 : 0;
          const isOver = item.isOverBudget;
          
          return (
            <div key={item.category} className="flex flex-col items-center flex-1 max-w-[60px]">
              {/* Bars container */}
              <div className="relative w-full flex justify-center h-40">
                {/* Spent bar */}
                <div 
                  className="w-6 sm:w-8 rounded-t-md transition-all duration-500"
                  style={{ 
                    height: `${spentHeight}%`,
                    backgroundColor: isOver ? '#ef4444' : item.color,
                    minHeight: item.spent > 0 ? '4px' : '0',
                    position: 'absolute',
                    bottom: 0
                  }}
                />
                {/* Limit line */}
                <div 
                  className="absolute w-8 border-2 border-dashed border-white/80"
                  style={{ bottom: `${limitHeight}%` }}
                />
              </div>
              
              {/* Values */}
              <div className="text-center mt-1">
                <p className="text-xs font-bold" style={{ color: item.color }}>
                  ${item.spent.toFixed(0)}
                </p>
                <p className="text-xs text-foreground-muted">
                  / ${item.limit.toFixed(0)}
                </p>
              </div>
              
              {/* Category initial */}
              <span 
                className="text-xs font-medium truncate w-full text-center mt-1" 
                style={{ color: item.color }}
              >
                {item.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-foreground-muted">Gastado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 border-t-2 border-dashed border-white/60" />
          <span className="text-foreground-muted">Límite ({periodLabel})</span>
        </div>
      </div>
    </div>
  );
}
