import { useState } from 'react';
import { Plus, LogOut, Loader2, Sun, Moon, Wallet, Download, Mail, Settings } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { BalanceCard } from './components/BalanceCard';
import { TransactionModal } from './components/TransactionModal';
import { TransactionList } from './components/TransactionList';
import { BudgetManager } from './components/BudgetManager';
import { CategoryManager } from './components/CategoryManager';
import { CategoryBudgetChart } from './components/CategoryBudgetChart';
import { useTransactions } from './hooks/useTransactions';
import { useBudgets } from './hooks/useBudgets';
import { LoginPage } from './pages/LoginPage';
import { exportToExcel } from './lib/exportExcel';
import { sendMonthlySummary } from './lib/emailService';

function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [budgetManagerOpen, setBudgetManagerOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { transactions, income, expenses, addTransaction } = useTransactions();
  const { budgets } = useBudgets();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

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

  const handleExportExcel = () => {
    exportToExcel(transactions, 'mis-transacciones');
  };

  const handleSendEmail = async () => {
    if (!user?.email) return;
    
    setSendingEmail(true);
    setEmailSent(false);
    
    await sendMonthlySummary(
      transactions,
      user.email,
      () => {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      },
      (error) => {
        alert('Error al enviar email: ' + error.message);
      }
    );
    
    setSendingEmail(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="p-4 pb-0 flex items-center justify-between">
        <h1 className="text-xl font-bold">Finance Tracker</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="p-2 tap-target rounded-full hover:bg-card transition-colors"
            title="Exportar Excel"
          >
            <Download className="w-5 h-5 text-foreground-muted" />
          </button>
          <button
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className="p-2 tap-target rounded-full hover:bg-card transition-colors"
            title="Enviar resumen por email"
          >
            {sendingEmail ? (
              <Loader2 className="w-5 h-5 text-foreground-muted animate-spin" />
            ) : emailSent ? (
              <span className="text-success">✓</span>
            ) : (
              <Mail className="w-5 h-5 text-foreground-muted" />
            )}
          </button>
          <button
            onClick={() => setBudgetManagerOpen(true)}
            className="p-2 tap-target rounded-full hover:bg-card transition-colors"
            title="Presupuestos"
          >
            <Wallet className="w-5 h-5 text-foreground-muted" />
          </button>
          <button
            onClick={() => setCategoryManagerOpen(true)}
            className="p-2 tap-target rounded-full hover:bg-card transition-colors"
            title="Gestionar categorías"
          >
            <Settings className="w-5 h-5 text-foreground-muted" />
          </button>
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

        {/* Category Budget Chart */}
        <CategoryBudgetChart transactions={transactions} budgets={budgets} />

        {/* Transaction List */}
        <TransactionList transactions={transactions} />
      </main>

      {/* Floating Action Button */}
      <button
        onClick={handleOpenModal}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all tap-target"
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
