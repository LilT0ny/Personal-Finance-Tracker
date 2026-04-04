import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: { id: string; email: string } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Tiempo de inactividad antes de cerrar sesión (30 minutos)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Verificar sesión al cargar
  useEffect(() => {
    const checkSession = () => {
      const usuarioId = localStorage.getItem('usuario_id');
      const usuarioEmail = localStorage.getItem('usuario_email');
      
      if (usuarioId && usuarioEmail) {
        setUser({ id: usuarioId, email: usuarioEmail });
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    
    checkSession();
  }, []);

  // Función para cerrar sesión por inactividad
  const handleInactivitySignOut = useCallback(async () => {
    if (user) {
      localStorage.removeItem('usuario_id');
      localStorage.removeItem('usuario_email');
      setUser(null);
    }
  }, [user]);

  const resetInactivityTimer = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Efecto para monitorear inactividad
  useEffect(() => {
    if (!user) return;

    const checkInactivity = () => {
      const now = Date.now();
      if (now - lastActivity > INACTIVITY_TIMEOUT) {
        handleInactivitySignOut();
      }
    };

    const interval = setInterval(checkInactivity, 60000);
    return () => clearInterval(interval);
  }, [user, lastActivity, handleInactivitySignOut]);

  // Escuchar eventos de actividad
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user]);

  // Función simple para hashear password
  async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const signIn = async (email: string, password: string) => {
    try {
      // Buscar usuario por email
      const { data: usuario, error: findError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (findError || !usuario) {
        return { error: new Error('Usuario no encontrado') };
      }

      // Hashear y comparar contraseña
      const hashedPassword = await hashPassword(password);
      
      if (usuario.password_hash !== hashedPassword) {
        return { error: new Error('Contraseña incorrecta') };
      }

      // Guardar en localStorage
      localStorage.setItem('usuario_id', usuario.id);
      localStorage.setItem('usuario_email', usuario.email);
      setUser({ id: usuario.id, email: usuario.email });
      
      setLastActivity(Date.now());
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (_email: string, _password: string) => {
    // No usamos Supabase Auth, solo manejamos el flujo local
    // El signup real se hace en el LoginPage
    return { error: null };
  };

  const signOut = async () => {
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('usuario_email');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetInactivityTimer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
