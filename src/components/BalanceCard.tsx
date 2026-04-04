import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Download, Calendar, BarChart3, ListTree, Filter, Home, UtensilsCrossed, Car, Heart, Gamepad2, ShoppingBag, Zap, PiggyBank, MoreHorizontal, Circle, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { PeriodFilter, CustomDateRange } from '../hooks/useTransactions';
import { exportToExcel } from '../lib/exportExcel';
import { Transaction } from '../types';
import { useCategories } from '../hooks/useCategories';
import { Budget } from '../hooks/useBudgets';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BalanceCardProps {
  income: number;
  expenses: number;
  period: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
  onCategoryChange: (category: string) => void;
  categoryFilter: string;
  allTransactions: Transaction[];
  budgets: Budget[];
  customDateRange?: CustomDateRange | null;
  onCustomDateRangeChange?: (range: CustomDateRange | null) => void;
}

function getDailySpent(transactions: Transaction[], category: string): number {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  startOfDay.setHours(0, 0, 0, 0);
  return transactions
    .filter(t => t.category === category && (t.tipo === 'Egreso' || t.tipo === 'expense') && new Date(t.fecha) >= startOfDay)
    .reduce((sum, t) => sum + t.monto, 0);
}

function getWeeklySpent(transactions: Transaction[], category: string): number {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return transactions
    .filter(t => t.category === category && (t.tipo === 'Egreso' || t.tipo === 'expense') && new Date(t.fecha) >= startOfWeek)
    .reduce((sum, t) => sum + t.monto, 0);
}

function getMonthlySpent(transactions: Transaction[], category: string): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return transactions
    .filter(t => t.category === category && (t.tipo === 'Egreso' || t.tipo === 'expense') && new Date(t.fecha) >= startOfMonth)
    .reduce((sum, t) => sum + t.monto, 0);
}

function getYearlySpent(transactions: Transaction[], category: string): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return transactions
    .filter(t => t.category === category && (t.tipo === 'Egreso' || t.tipo === 'expense') && new Date(t.fecha) >= startOfYear)
    .reduce((sum, t) => sum + t.monto, 0);
}

// Icon mapping
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

export function BalanceCard(props: BalanceCardProps) {
  const { income, expenses, period, onPeriodChange, onCategoryChange, categoryFilter, allTransactions, budgets, customDateRange, onCustomDateRangeChange } = props;
  
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly' | 'weekly' | 'daily'>('monthly');
  const [showFilters, setShowFilters] = useState(false);
  const balance = income - expenses;
  const isPositive = balance >= 0;
  const { categories } = useCategories();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [selectedDate, setSelectedDate] = useState(
    now.toISOString().split('T')[0]
  );
  const [selectedYear, setSelectedYear] = useState(
    now.getFullYear().toString()
  );

  const handleExportExcel = () => {
    exportToExcel(allTransactions, 'mis-transacciones');
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
    const [year, month] = e.target.value.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    onPeriodChange('custom');
    onCustomDateRangeChange?.({ startDate, endDate });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    const date = new Date(e.target.value + 'T12:00:00');
    onPeriodChange('day');
    onCustomDateRangeChange?.({ startDate: date, endDate: date });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const yearVal = e.target.value;
    setSelectedYear(yearVal);
    const year = parseInt(yearVal);
    if (!isNaN(year) && yearVal.length === 4) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      onPeriodChange('custom');
      onCustomDateRangeChange?.({ startDate, endDate });
    }
  };

  const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    const date = new Date(e.target.value + 'T12:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const startDate = new Date(new Date(date).setDate(diff));
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(new Date(startDate).setDate(startDate.getDate() + 6));
    endDate.setHours(23, 59, 59, 999);
    onPeriodChange('custom');
    onCustomDateRangeChange?.({ startDate, endDate });
  };

  const budgetCategories = budgets.filter(b => b.type === 'expense').map(b => b.category);
  const allCategories = [...new Set([...budgetCategories, ...allTransactions.map(t => t.category || '')])];
  
  const chartData = allCategories.filter(Boolean).map(category => {
    const budget = budgets.find(b => b.category === category && b.type === 'expense');
    const dailySpent = getDailySpent(allTransactions, category || 'other');
    const weeklySpent = getWeeklySpent(allTransactions, category || 'other');
    const monthlySpent = getMonthlySpent(allTransactions, category || 'other');
    const yearlySpent = getYearlySpent(allTransactions, category || 'other');
    
    let displaySpent: number;
    let limitValue: number;
    
    if (period === 'day') {
      displaySpent = dailySpent;
      limitValue = budget?.limit_amount ? budget.limit_amount / 30 : monthlySpent * 0.033;
    } else if (period === 'week') {
      displaySpent = weeklySpent;
      limitValue = budget?.limit_amount ? budget.limit_amount / 4.33 : monthlySpent * 0.25;
    } else if (period === 'month') {
      displaySpent = monthlySpent;
      limitValue = budget?.limit_amount || monthlySpent * 1.2;
    } else if (period === 'year') {
      displaySpent = yearlySpent;
      limitValue = (budget?.limit_amount || monthlySpent * 12) * 12;
    } else {
      displaySpent = allTransactions
        .filter(t => t.category === category && (t.tipo === 'Egreso' || t.tipo === 'expense'))
        .reduce((sum, t) => sum + t.monto, 0);
      limitValue = displaySpent * 1.2;
    }
    
    // Get color and icon from categories (either from transactions or from the categories table directly)
    const categoryTransactions = allTransactions.filter(t => t.category === category);
    const categoryData = categories.find(c => c.nombre === category);
    const categoryColor = categoryTransactions[0]?.category_color || categoryData?.color || '#6b7280';
    const categoryIcon = categoryTransactions[0]?.category_icon || categoryData?.icono || 'Circle';
    
    return {
      name: category || 'Otros',
      spent: displaySpent,
      limit: limitValue,
      color: categoryColor,
      icon: categoryIcon,
      isOverBudget: displaySpent > limitValue && limitValue > 0,
    };
  }).filter(d => d.limit > 0);

  chartData.sort((a, b) => b.spent - a.spent);
  // Round up to nice numbers for the Y-axis
  const rawMaxValue = chartData.length > 0 ? Math.max(...chartData.map(d => Math.max(d.spent, d.limit))) : 0;
  const roundToNice = (val: number) => {
    if (val === 0) return 0;
    const magnitude = Math.pow(10, Math.floor(Math.log10(val)));
    const normalized = val / magnitude;
    if (normalized <= 1.5) return 1.5 * magnitude;
    if (normalized <= 3) return 3 * magnitude;
    if (normalized <= 5) return 5 * magnitude;
    return 10 * magnitude;
  };
  const maxValue = roundToNice(rawMaxValue);
  
  // Y-axis tick values
  const yAxisTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => maxValue * ratio);
  
  const periodLabelText = period === 'custom' && customDateRange 
    ? `${customDateRange.startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${customDateRange.endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
    : viewMode === 'yearly'
      ? `Año ${selectedYear}`
      : viewMode === 'monthly' 
        ? format(new Date(selectedMonth + "-01T12:00:00"), "MMMM yyyy", { locale: es })
        : viewMode === 'weekly'
          ? (() => {
              const date = new Date(selectedDate + 'T12:00:00');
              const day = date.getDay();
              const diff = date.getDate() - day + (day === 0 ? -6 : 1);
              const start = new Date(new Date(date).setDate(diff));
              const end = new Date(new Date(start).setDate(start.getDate() + 6));
              return `${format(start, "dd MMM")} - ${format(end, "dd MMM")}`;
            })()
          : format(new Date(selectedDate + 'T12:00:00'), "dd MMM, yyyy", { locale: es });

  return (
    <>
      {/* Header - outside card */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Home className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Inicio</h2>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-sm",
                showFilters 
                  ? "bg-primary text-white shadow-md active:scale-95" 
                  : "bg-background border border-border text-foreground-muted hover:bg-background/80"
              )}
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>
      </div>
      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden mb-4">
          <div className="p-3 flex flex-col lg:flex-row flex-wrap items-center gap-3 bg-card/50">
            {/* Date Picker */}
            <div className="flex items-center relative w-full lg:w-auto min-w-[200px] bg-background border border-border rounded-xl px-4 py-2.5 hover:bg-background/80 transition-all group shadow-sm">
              <Calendar className="w-4 h-4 text-primary absolute left-4 z-10 pointer-events-none group-hover:scale-110 transition-transform" />
              
              {viewMode === "yearly" ? (
                <div className="relative group flex items-center w-full">
                  <span className="pl-10 pr-2 text-xs font-medium text-foreground w-full text-center">
                    Año {selectedYear}
                  </span>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={selectedYear}
                    onChange={handleYearChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  />
                </div>
              ) : viewMode === "monthly" ? (
                <div className="relative group flex items-center w-full">
                  <span className="pl-10 pr-2 text-xs font-medium text-foreground w-full text-center">
                    {format(new Date(selectedMonth + "-01T12:00:00"), "MMMM yyyy", {
                      locale: es,
                    })}
                  </span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  />
                </div>
              ) : viewMode === "weekly" ? (
                <div className="relative group flex items-center w-full">
                  <span className="pl-10 pr-2 text-[10px] font-medium text-foreground w-full text-center">
                    {(() => {
                      const date = new Date(selectedDate + 'T12:00:00');
                      const day = date.getDay();
                      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
                      const start = new Date(new Date(date).setDate(diff));
                      const end = new Date(new Date(start).setDate(start.getDate() + 6));
                      return `${format(start, "dd MMM")} - ${format(end, "dd MMM")}`;
                    })()}
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleWeekChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  />
                </div>
              ) : (
                <div className="relative group flex items-center w-full">
                  <span className="pl-10 pr-2 text-xs font-medium text-foreground w-full text-center">
                    {format(new Date(selectedDate + 'T12:00:00'), "dd MMM, yyyy", {
                      locale: es,
                    })}
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  />
                </div>
              )}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex bg-background p-1 rounded-xl shrink-0 shadow-inner border border-border w-full lg:w-auto">
              {[
                { id: 'yearly', label: 'Anual', icon: BarChart3 },
                { id: 'monthly', label: 'Mensual', icon: BarChart3 },
                { id: 'weekly', label: 'Semanal', icon: ListTree },
                { id: 'daily', label: 'Diario', icon: ListTree },
              ].map((mode) => (
                <button 
                  key={mode.id}
                  onClick={() => setViewMode(mode.id as any)}
                  className={cn(
                    "flex-1 lg:flex-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5",
                    viewMode === mode.id 
                      ? "bg-primary text-white shadow-md scale-[1.02]" 
                      : "text-foreground-muted hover:text-foreground"
                  )}
                >
                  <mode.icon className="w-3.5 h-3.5" /> {mode.label}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div className="flex-1 min-w-[200px] w-full lg:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="input w-full text-xs h-[42px] bg-background border-border hover:border-primary/50 transition-colors"
              >
                <option value="all">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
      {/* Balance Card */}
      <div className="card">
        <div className="text-center">
          <p className="text-foreground-muted text-sm mb-1">Balance {periodLabelText.charAt(0).toUpperCase() + periodLabelText.slice(1)}</p>
          <h2 className={cn("text-4xl font-bold", isPositive ? "text-success" : "text-danger")}>
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


        {chartData.length > 0 && (
          <div className="mt-6">
            <h3 className="text-foreground-muted text-sm text-center mb-4">Gastos por Categoría</h3>
            <div className="bg-background/50 rounded-xl p-3 border border-border/50">
              <div className="flex">
                {/* Y-axis labels */}
                <div className="flex flex-col justify-between h-40 py-2 pr-2 text-[10px] text-foreground-muted">
                  {yAxisTicks.slice().reverse().map((val, i) => (
                    <span key={i}>${val.toFixed(0)}</span>
                  ))}
                </div>
                {/* Chart bars */}
                <div className="flex-1 flex items-end justify-around gap-2 h-40">
                  {chartData.map((item) => {
                    const spentHeight = maxValue > 0 ? (item.spent / maxValue) * 100 : 0;
                    const limitHeight = maxValue > 0 ? (item.limit / maxValue) * 100 : 0;
                    const isOver = item.isOverBudget;
                    const IconComponent = ICON_MAP[item.icon] || Circle;
                    const diff = item.limit - item.spent;
                    
                    return (
                      <div key={item.name} className="flex flex-col items-center flex-1 max-w-[60px] group relative">
                        {/* Value on top of bar */}
                        <span className="text-[10px] font-bold mb-1" style={{ color: item.color }}>
                          ${item.spent.toFixed(0)}
                        </span>
                        <div className="relative w-full flex justify-center h-36">
                          <div 
                            className="w-6 sm:w-8 rounded-t-md transition-all duration-500"
                            style={{ 
                              height: `${spentHeight}%`,
                              backgroundColor: item.color,
                              minHeight: item.spent > 0 ? '4px' : '0',
                              position: 'absolute',
                              bottom: 0
                            }}
                          />
                          <div className="absolute w-6 sm:w-8 border border-dashed border-white/60" style={{ bottom: `${limitHeight}%` }} />
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                          <p className="text-xs font-semibold" style={{ color: item.color }}>{item.name}</p>
                          <p className="text-[10px] text-gray-300">Gastado: <span className="font-medium" style={{ color: item.color }}>${item.spent.toFixed(2)}</span></p>
                          <p className="text-[10px] text-gray-300">Límite: <span className="font-medium">${item.limit.toFixed(2)}</span></p>
                          <p className="text-[10px]" style={{ color: diff >= 0 ? '#22c55e' : '#ef4444' }}>
                            {diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} restante
                          </p>
                        </div>
                        {/* Icon, name and alert if over budget */}
                        <div className="mt-1 flex flex-col items-center gap-0.5">
                          {isOver && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                          <span style={{ color: item.color }}>
                            <IconComponent className="w-4 h-4" />
                          </span>
                          <span className="text-[10px] font-medium truncate w-full text-center" style={{ color: item.color }}>
                            {item.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-2 text-center">
              <span className="text-xs text-foreground-muted">
                Límite: ${chartData[0]?.limit.toFixed(0) || 0} ({periodLabelText})
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
