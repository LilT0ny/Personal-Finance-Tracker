import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  loadingColor: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getUsuarioId(): string | null {
  return localStorage.getItem('usuario_id');
}

// Función para aplicar el color primario al CSS
function applyPrimaryColor(color: string) {
  document.documentElement.style.setProperty('--primary', color);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [primaryColor, setPrimaryColorState] = useState<string>('#6366f1');
  const [loadingColor, setLoadingColor] = useState(true);

  // Cargar color primario desde Supabase
  useEffect(() => {
    const loadPrimaryColor = async () => {
      const usuarioId = getUsuarioId();
      if (!usuarioId) {
        setLoadingColor(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('parametros_sistema')
          .select('color_primario')
          .eq('usuario_id', usuarioId)
          .single();

        if (data?.color_primario) {
          setPrimaryColorState(data.color_primario);
          applyPrimaryColor(data.color_primario);
        }
      } catch (err) {
        console.error('Error loading primary color:', err);
      } finally {
        setLoadingColor(false);
      }
    };

    loadPrimaryColor();
  }, []);

  // Cargar tema desde localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setThemeState(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const setPrimaryColor = async (color: string) => {
    const usuarioId = getUsuarioId();
    if (!usuarioId) return;

    // Aplicar visualmente de inmediato
    setPrimaryColorState(color);
    applyPrimaryColor(color);

    // Guardar en Supabase
    try {
      await supabase
        .from('parametros_sistema')
        .update({ color_primario: color })
        .eq('usuario_id', usuarioId);
    } catch (err) {
      console.error('Error saving primary color:', err);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, primaryColor, setPrimaryColor, loadingColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
