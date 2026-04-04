import { useState } from 'react'; 
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Settings, 
  Moon, 
  Sun, 
  LogOut,
  Menu,
  X,
  PieChart
} from 'lucide-react';
import { cn } from '../lib/utils';

type SidebarSection = 'inicio' | 'ingresos' | 'egresos' | 'config';

interface SidebarProps {
  currentSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  onThemeToggle: () => void;
  theme: 'light' | 'dark';
  onSignOut: () => void;
}

export function Sidebar({ 
  currentSection, 
  onSectionChange, 
  onThemeToggle, 
  theme,
  onSignOut
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'inicio' as const, label: 'Inicio', icon: PieChart },
    { id: 'ingresos' as const, label: 'Ingresos', icon: ArrowUpCircle },
    { id: 'egresos' as const, label: 'Egresos', icon: ArrowDownCircle },
    { id: 'config' as const, label: 'Config', icon: Settings },
  ];

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-lg shadow-lg"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-40 flex flex-col transition-transform duration-300",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold text-primary">Finance</h1>
          <p className="text-xs text-foreground-muted">Tracker</p>
        </div>

        {/* Main Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSectionChange(item.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  isActive 
                    ? "bg-primary text-white" 
                    : "hover:bg-background text-foreground-muted hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-border space-y-2">
          {/* Theme toggle */}
          <button
            onClick={() => {
              onThemeToggle();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-background text-foreground-muted hover:text-foreground transition-all"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="font-medium">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>

          {/* Sign out */}
          <button
            onClick={async () => {
              console.log('Cerrando sesión...');
              try {
                await onSignOut();
                console.log('Sesión cerrada, redirigiendo...');
                // Redirigir al login
                window.location.href = '/';
              } catch (err) {
                console.error('Error al cerrar sesión:', err);
              }
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-danger/10 text-danger transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
