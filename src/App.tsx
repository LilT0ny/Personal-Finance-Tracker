import { useState, useEffect } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { TransactionModal } from './components/TransactionModal';
import { BudgetManager } from './components/BudgetManager';
import { CategoryManager } from './components/CategoryManager';
import { Sidebar } from './components/Sidebar';
import { useTransactions } from './hooks/useTransactions';
import { useBudgets } from './hooks/useBudgets';
import { useCategories } from './hooks/useCategories';
import { LoginPage } from './pages/LoginPage';
import { Onboarding } from './pages/Onboarding';
import { TransactionPageList } from './pages/TransactionPageList';
import { ConfigPage } from './pages/ConfigPage';
import { BalanceCard } from './components/BalanceCard';
import { TransactionList } from './components/TransactionList';
import { BudgetBuckets } from './components/BudgetBuckets';

type SidebarSection = 'inicio' | 'presupuesto' | 'ingresos' | 'egresos' | 'config';

function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [budgetManagerOpen, setBudgetManagerOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentSection, setCurrentSection] = useState<SidebarSection>('inicio');
  
  const { transactions, allTransactions, income, expenses, period, setPeriod, customDateRange, setCustomDateRange, categoryFilter, setCategoryFilter, addTransaction } = useTransactions();
  const { budgets } = useBudgets();
  const { categories, loading: categoriesLoading } = useCategories();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Check if user needs onboarding - only first time (store in localStorage)
  useEffect(() => {
    if (!categoriesLoading && categories.length === 0) {
      const hasOnboarded = localStorage.getItem('hasOnboarded');
      if (!hasOnboarded) {
        setShowOnboarding(true);
      }
    }
  }, [categoriesLoading, categories.length]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasOnboarded', 'true');
    setShowOnboarding(false);
  };

  const handleSaveTransaction = async (
    amount: number,
    category: string,
    type: 'income' | 'expense',
    note?: string
  ) => {
    if (!category) return;
    
    await addTransaction(amount, category, type, note);
    setModalOpen(false);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  // Show onboarding if user has no categories
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Render current section content
  const renderContent = () => {
    switch (currentSection) {
      case 'presupuesto':
        return <BudgetBuckets />;
      case 'ingresos':
        return (
          <TransactionPageList 
            transactions={transactions} 
            type="income" 
            title="Ingresos"
            onAddTransaction={handleSaveTransaction}
            period={period}
            onPeriodChange={setPeriod}
            customDateRange={customDateRange}
            onCustomDateRangeChange={setCustomDateRange}
          />
        );
      case 'egresos':
        return (
          <TransactionPageList 
            transactions={transactions} 
            type="expense" 
            title="Egresos"
            onAddTransaction={handleSaveTransaction}
            period={period}
            onPeriodChange={setPeriod}
            customDateRange={customDateRange}
            onCustomDateRangeChange={setCustomDateRange}
          />
        );
      case 'config':
        return <ConfigPage />;
      case 'inicio':
      default:
        return (
          <>
            {/* Balance Card (Monthly by default) */}
            <BalanceCard 
              income={income} 
              expenses={expenses} 
              period={period}
              onPeriodChange={setPeriod}
              onCategoryChange={setCategoryFilter}
              categoryFilter={categoryFilter}
              allTransactions={allTransactions}
              budgets={budgets}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
            />
            
            {/* Transaction List */}
            <TransactionList transactions={transactions} />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onSectionChange={setCurrentSection}
        onThemeToggle={toggleTheme}
        theme={theme}
        onSignOut={signOut}
      />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 pb-24 lg:pb-4">
        {/* Mobile header */}
        <header className="lg:hidden mb-4">
          <h1 className="text-xl font-bold">
            {currentSection === 'inicio' && 'Finance Tracker'}
            {currentSection === 'presupuesto' && 'Presupuesto'}
            {currentSection === 'ingresos' && 'Ingresos'}
            {currentSection === 'egresos' && 'Egresos'}
            {currentSection === 'config' && 'Configuración'}
          </h1>
        </header>

        {/* Content */}
        <div className="max-w-md mx-auto lg:max-w-none">
          {renderContent()}
        </div>
      </main>

      {/* Floating Action Button - always visible */}
      <button
        onClick={handleOpenModal}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all tap-target lg:hidden z-40"
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTransaction}
      />

      {/* Budget Manager Modal */}
      <BudgetManager
        isOpen={budgetManagerOpen}
        onClose={() => setBudgetManagerOpen(false)}
      />

      {/* Category Manager Modal */}
      <CategoryManager
        isOpen={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
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
