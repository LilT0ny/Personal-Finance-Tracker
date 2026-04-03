import { useState } from 'react';
import { Plus, LogOut, Loader2, Sun, Moon } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { BalanceCard } from './components/BalanceCard';
import { ChartSection } from './components/ChartSection';
import { CategoryGrid } from './components/CategoryGrid';
import { TransactionModal } from './components/TransactionModal';
import { TransactionList } from './components/TransactionList';
import { useTransactions } from './hooks/useTransactions';
import { LoginPage } from './pages/LoginPage';
import { CATEGORIES } from './types';

function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const { transactions, income, expenses, addTransaction } = useTransactions();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setModalOpen(true);
  };

  const handleSaveTransaction = async (
    amount: number,
    type: 'income' | 'expense',
    note?: string
  ) => {
    if (!selectedCategory) return;
    
    await addTransaction(amount, selectedCategory, type, note);
    setModalOpen(false);
    setSelectedCategory(undefined);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCategory(undefined);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="p-4 pb-0 flex items-center justify-between">
        <h1 className="text-xl font-bold">Finance Tracker</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 tap-target rounded-full hover:bg-card transition-colors"
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-foreground-muted" />
            ) : (
              <Moon className="w-5 h-5 text-foreground-muted" />
            )}
          </button>
          <button
            onClick={signOut}
            className="p-2 tap-target rounded-full hover:bg-card transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5 text-foreground-muted" />
          </button>
        </div>
      </header>

      {/* User email */}
      <p className="text-center text-foreground-muted text-xs px-4">{user?.email}</p>

      {/* Main Content */}
      <main className="p-4 max-w-md mx-auto">
        {/* Balance Card */}
        <BalanceCard income={income} expenses={expenses} />

        {/* Chart Section */}
        <ChartSection transactions={transactions} />

        {/* Category Grid */}
        <div className="mb-4">
          <p className="text-foreground-muted text-sm mb-3">Selecciona una categoría</p>
          <CategoryGrid
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        </div>

        {/* Transaction List */}
        <TransactionList transactions={transactions} />
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => {
          setSelectedCategory(undefined);
          setModalOpen(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all tap-target"
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={modalOpen}
        selectedCategory={selectedCategory}
        onClose={handleCloseModal}
        onSave={handleSaveTransaction}
      />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
