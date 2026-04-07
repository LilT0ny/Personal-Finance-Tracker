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

// Función para convertir hex a canales RGB (sin rgb() y sin espacios para Tailwind)
function hexToRgbChannels(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
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
          const channels = hexToRgbChannels(data.color_primario);
          const rgb = channels.replace(' ', ',');
          document.documentElement.style.setProperty('--primary', channels);
          document.documentElement.style.setProperty('--primary-rgb', rgb);
          setPrimaryColorState(data.color_primario);
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

    const channels = hexToRgbChannels(color);
    const rgb = channels.replace(' ', ',');
    
    document.documentElement.style.setProperty('--primary', channels);
    document.documentElement.style.setProperty('--primary-rgb', rgb);
    setPrimaryColorState(color);

    try {
      await supabase
        .from('parametros_sistema')
        .upsert({ 
          usuario_id: usuarioId,
          color_primario: color 
        }, { onConflict: 'usuario_id' });
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
