import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Transaction, getCategoryConfig } from '../types';
import { Budget } from '../hooks/useBudgets';

interface CategoryBudgetChartProps {
  transactions: Transaction[];
  budgets: Budget[];
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
      t.type === 'expense' &&
      new Date(t.created_at) >= startOfWeek
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

// Get transactions for current month
function getMonthlySpent(transactions: Transaction[], category: string): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return transactions
    .filter(t => 
      t.category === category && 
      t.type === 'expense' &&
      new Date(t.created_at) >= startOfMonth
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

export function CategoryBudgetChart({ transactions, budgets }: CategoryBudgetChartProps) {
  const categories = [...new Set(transactions.map(t => t.category))];
  
  // Prepare chart data
  const chartData = categories.map(category => {
    const config = getCategoryConfig(category);
    const budget = budgets.find(b => b.category === category && b.type === 'expense');
    const weeklySpent = getWeeklySpent(transactions, category);
    const monthlySpent = getMonthlySpent(transactions, category);
    
    // Use weekly budget for display if available, otherwise monthly / 4
    const limit = budget?.limit_amount || (budget?.period === 'monthly' ? monthlySpent * 4 : 0);
    const displaySpent = budget?.period === 'weekly' ? weeklySpent : monthlySpent;
    
    return {
      name: config.label,
      spent: displaySpent,
      limit: limit,
      category: category,
      color: config.color,
      isOverBudget: limit > 0 && displaySpent > limit,
      percentage: limit > 0 ? (displaySpent / limit) * 100 : 0,
    };
  }).filter(d => d.limit > 0); // Only show categories with budgets

  // Sort by percentage (most over budget first)
  chartData.sort((a, b) => b.percentage - a.percentage);

  if (chartData.length === 0) {
    return (
      <div className="card mb-4">
        <h3 className="text-center text-foreground-muted text-sm mb-2">Presupuesto por Categoría</h3>
        <p className="text-center text-foreground-muted py-8">
          No hay presupuestos configurados.<br />
          <span className="text-sm">Agrega presupuestos en el ícono de 💰</span>
        </p>
      </div>
    );
  }

  const overBudgetCategories = chartData.filter(d => d.isOverBudget);

  return (
    <div className="card mb-4">
      <h3 className="text-center text-foreground-muted text-sm mb-2">Presupuesto por Categoría</h3>
      
      {/* Over Budget Alert */}
      {overBudgetCategories.length > 0 && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-xl">
          <p className="text-danger font-medium text-sm mb-2">⚠️ Categorías excedidas:</p>
          {overBudgetCategories.map(cat => (
            <p key={cat.category} className="text-danger text-sm">
              {cat.name}: ${cat.spent.toFixed(2)} / ${cat.limit.toFixed(2)}
            </p>
          ))}
        </div>
      )}

      {/* Bar Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
            <XAxis type="number" tick={{ fill: '#a0a0a0', fontSize: 12 }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fill: '#a0a0a0', fontSize: 12 }} 
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '12px',
                color: '#fff',
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Gastado']}
              labelFormatter={(label) => `Categoría: ${label}`}
            />
            <Bar dataKey="spent" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isOverBudget ? '#ef4444' : entry.color}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-2 flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-danger" />
          <span className="text-foreground-muted">Excedido</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-foreground-muted">En presupuesto</span>
        </div>
      </div>
    </div>
  );
}
