import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Transaction, getCategoryConfig } from '../types';

interface ChartSectionProps {
  transactions: Transaction[];
}

export function ChartSection({ transactions }: ChartSectionProps) {
  // Filter only expenses and group by category
  const expensesByCategory = transactions
    .filter(t => t.tipo === 'Egreso' || t.tipo === 'expense')
    .reduce((acc, t) => {
      const cat = t.category || 'other';
      acc[cat] = (acc[cat] || 0) + t.monto;
      return acc;
    }, {} as Record<string, number>);

  // Convert to chart data format
  const chartData = Object.entries(expensesByCategory).map(([category, amount]) => {
    const config = getCategoryConfig(category);
    return {
      name: config.label,
      value: amount,
      color: config.color,
    };
  });

  // If no data, show empty state
  if (chartData.length === 0) {
    return (
      <div className="card mb-4 flex items-center justify-center h-64">
        <p className="text-foreground-muted text-center">
          No hay gastos registrados<br />
          <span className="text-sm">Selecciona una categoría para empezar</span>
        </p>
      </div>
    );
  }

  const totalExpenses = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="card mb-4">
      <h3 className="text-center text-foreground-muted text-sm mb-2">Gastos por Categoría</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '12px',
                color: '#fff',
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Monto']}
            />
            <Legend
              wrapperStyle={{
                color: '#a0a0a0',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <p className="text-center text-foreground-muted text-sm mt-2">
        Total: <span className="text-danger font-semibold">${totalExpenses.toFixed(2)}</span>
      </p>
    </div>
  );
}
