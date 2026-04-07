import { useState, useMemo } from 'react';
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, Circle, UtensilsCrossed, Car, Heart, Gamepad2, ShoppingBag, Zap, PiggyBank, MoreHorizontal, Plus, X, Filter, Calendar, BarChart3, ListTree } from 'lucide-react';
import { Transaction } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCategories } from '../hooks/useCategories';
import { PeriodFilter, CustomDateRange } from '../hooks/useTransactions';
import { cn } from '../lib/utils';

interface TransactionPageListProps {
  transactions: Transaction[];
  type: 'income' | 'expense';
  title: string;
  onAddTransaction: (amount: number, category: string, type: 'income' | 'expense', note?: string) => void;
  period: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
  customDateRange?: CustomDateRange | null;
  onCustomDateRangeChange?: (range: CustomDateRange | null) => void;
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

export function TransactionPageList({ 
  transactions, 
  type, 
  title, 
  onAddTransaction, 
  period: _period, 
  onPeriodChange,
  customDateRange: _customDateRange,
  onCustomDateRangeChange
}: TransactionPageListProps) {
  const { categories } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly' | 'weekly' | 'daily'>('monthly');
  
  // Generate month string (YYYY-MM) for monthly view
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
  
  // Filter transactions by type, period, and category
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(t => (t.tipo === 'Egreso' && type === 'expense') || (t.tipo === 'Ingreso' && type === 'income'));
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    
    return filtered;
  }, [transactions, type, selectedCategory]);
  
  const total = filteredTransactions.reduce((sum, t) => sum + t.monto, 0);
  
  // Get unique categories from transactions
  const transactionCategories = useMemo(() => {
    const cats = new Set(transactions.filter(t => (t.tipo === 'Egreso' && type === 'expense') || (t.tipo === 'Ingreso' && type === 'income')).map(t => t.category || ''));
    return Array.from(cats).filter(Boolean);
  }, [transactions, type]);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('');
  const [note, setNote] = useState('');

  // Get category config
  const getCategoryConfig = (categoryId: string) => {
    const found = categories.find(c => c.id === categoryId);
    if (found) return { label: found.nombre, icon: found.icono, color: found.color };
    
    const predefined: Record<string, { label: string; icon: string; color: string }> = {
      'food': { label: 'Comida', icon: 'UtensilsCrossed', color: '#f97316' },
      'transport': { label: 'Transporte', icon: 'Car', color: '#3b82f6' },
      'entertainment': { label: 'Entretenimiento', icon: 'Gamepad2', color: '#a855f7' },
      'shopping': { label: 'Compras', icon: 'ShoppingBag', color: '#ec4899' },
      'health': { label: 'Salud', icon: 'Heart', color: '#ef4444' },
      'utilities': { label: 'Servicios', icon: 'Zap', color: '#eab308' },
      'savings': { label: 'Ahorros', icon: 'PiggyBank', color: '#22c55e' },
      'other': { label: 'Otros', icon: 'MoreHorizontal', color: '#6b7280' },
    };
    const predefinedFound = predefined[categoryId];
    if (predefinedFound) return predefinedFound;
    return { label: categoryId, icon: 'Circle', color: '#6b7280' };
  };

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || parsedAmount <= 0 || !transactionCategory) return;
    
    onAddTransaction(parsedAmount, transactionCategory, type, note || undefined);
    setShowModal(false);
    setAmount('');
    setTransactionCategory('');
    setNote('');
  };

  const handleAmountChange = (value: string) => {
    const regex = /^\d*\.?\d{0,2}$/;
    if (regex.test(value) || value === '') {
      setAmount(value);
    }
  };

  const getCategoryLabel = (categoryId: string) => {
    const config = getCategoryConfig(categoryId);
    return config.label;
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
    const [year, month] = e.target.value.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    onPeriodChange('custom');
    onCustomDateRangeChange?.({
      startDate,
      endDate
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    const date = new Date(e.target.value + 'T12:00:00'); // Use mid-day to avoid TZ issues
    onPeriodChange('day');
    onCustomDateRangeChange?.({
      startDate: date,
      endDate: date
    });
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

  return (
    <div className="space-y-4">
      {/* Header - separate card */}
      <div className="card mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              type === 'income' ? 'bg-success/20' : 'bg-danger/20'
            }`}>
              {type === 'income' ? (
                <ArrowUpCircle className="w-6 h-6 text-success" />
              ) : (
                <ArrowDownCircle className="w-6 h-6 text-danger" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="text-foreground-muted text-sm">
                Total: <span className={type === 'income' ? 'text-success font-bold' : 'text-danger font-bold'}>
                  ${total.toFixed(2)}
                </span>
              </p>
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
              onClick={() => setShowModal(true)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-medium",
                type === 'income' 
                  ? "bg-success text-white hover:bg-success/90" 
                  : "bg-danger text-white hover:bg-danger/90"
              )}
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
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
                      return `${format(start, "dd MMM")} - ${format(end, "dd MMM, yyyy")}`;
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
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input w-full text-xs h-[42px] bg-background border-border hover:border-primary/50 transition-colors"
              >
                <option value="all">Todas las categorías</option>
                {transactionCategories.map((cat) => (
                  <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          {type === 'income' ? (
            <TrendingUp className="w-12 h-12 text-foreground-muted mx-auto mb-2" />
          ) : (
            <ArrowDownCircle className="w-12 h-12 text-foreground-muted mx-auto mb-2" />
          )}
          <p className="text-foreground-muted">No hay {type === 'income' ? 'ingresos' : 'egresos'} aún</p>
          <button
            onClick={() => setShowModal(true)}
            className={cn(
              "mt-4 px-4 py-2 rounded-xl font-medium",
              type === 'income' 
                ? "bg-success text-white hover:bg-success/90" 
                : "bg-danger text-white hover:bg-danger/90"
            )}
          >
            Agregar tu primer {type === 'income' ? 'ingreso' : 'egreso'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const grouped = filteredTransactions.reduce((acc, transaction) => {
              const date = parseISO(transaction.fecha);
              const dayKey = format(date, 'yyyy-MM-dd');
              if (!acc[dayKey]) acc[dayKey] = [];
              acc[dayKey].push(transaction);
              return acc;
            }, {} as Record<string, Transaction[]>);

            const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

            return sortedKeys.map(dayKey => {
              const dayDate = parseISO(dayKey);
              const dayName = DAY_NAMES[dayDate.getDay()];

              return (
                <div key={dayKey}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-foreground">{dayName}</span>
                    <span className="text-xs text-foreground-muted">{format(dayDate, 'dd MMM', { locale: es })}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="space-y-2">
                    {grouped[dayKey].map((transaction) => {
                      const categoryName = transaction.category || 'Otros';
                      const categoryColor = transaction.category_color || '#6b7280';
                      const categoryIcon = transaction.category_icon || 'Circle';
                      
                      const Icon = ICON_MAP[categoryIcon] || Circle;
                      
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
                            <p className={type === 'expense' ? 'text-danger font-semibold' : 'text-success font-semibold'}>
                              {type === 'expense' ? '-' : '+'}${transaction.monto.toFixed(2)}
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
              );
            });
          })()}
        </div>
      )}

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          
          <div className="relative w-full lg:max-w-md bg-card rounded-t-3xl lg:rounded-2xl p-6 animate-slide-up lg:animate-fade-in max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 tap-target rounded-full hover:bg-background">
              <X className="w-5 h-5 text-foreground-muted" />
            </button>

            <h2 className="text-xl font-bold mb-4">
              Nuevo {type === 'income' ? 'Ingreso' : 'Egreso'}
            </h2>

            {/* Category Selection */}
            <div className="mb-4">
              <label className="text-foreground-muted text-sm block mb-2">Categoría</label>
              {categories.length === 0 ? (
                <p className="text-foreground-muted text-sm py-4">
                  No hay categorías. Agregá una en Configuración.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {categories.map(cat => {
                    const Icon = ICON_MAP[cat.icono] || Circle;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setTransactionCategory(cat.id)}
                        className={cn(
                          "flex flex-col items-center p-2 rounded-xl transition-all",
                          transactionCategory === cat.id ? "bg-card border-2" : "bg-background"
                        )}
                        style={transactionCategory === cat.id ? { borderColor: cat.color } : {}}
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
              disabled={!amount || !transactionCategory || parseFloat(amount) <= 0}
              className={cn(
                "w-full py-4 text-lg font-bold rounded-xl",
                type === 'income' 
                  ? "bg-success hover:bg-success/90 text-white" 
                  : "bg-danger hover:bg-danger/90 text-white",
                (!amount || !transactionCategory) && "opacity-50 cursor-not-allowed"
              )}
            >
              Guardar
            </button>
          </div>

          <style>{`
            @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
            @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            .animate-slide-up { animation: slide-up 0.3s ease-out; }
            .animate-fade-in { animation: fade-in 0.2s ease-out; }
          `}</style>
        </div>
      )}
    </div>
  );
}
