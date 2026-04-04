import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Tiempo de inactividad antes de cerrar sesión (30 minutos)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos en ms

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Crear registro en tabla usuarios si no existe
async function ensureUsuarioExists(user: User) {
  try {
    // Verificar si ya existe el registro
    const { data: existing } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    
    if (existing) return; // Ya existe
    
    // Crear registro con valores por defecto (el usuario lo completará después)
    const { error: insertError } = await supabase
      .from('usuarios')
      .insert({
        auth_user_id: user.id,
        email: user.email || '',
        cedula: 'XXX', // Placeholder temporal
        nombre: 'Usuario',
        apellido_paterno: '',
        fecha_nacimiento: '1990-01-01', // Fecha por defecto
      });
    
    if (insertError) {
      console.error('Error creating usuario record:', insertError);
    }
  } catch (err) {
    console.error('Error ensuring usuario exists:', err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Función para cerrar sesión por inactividad
  const handleInactivitySignOut = useCallback(async () => {
    if (user) {
      console.log('Cerrando sesión por inactividad');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    }
  }, [user]);

  // Resetear el timer de inactividad
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

    // Verificar cada minuto
    const interval = setInterval(checkInactivity, 60000);

    return () => clearInterval(interval);
  }, [user, lastActivity, handleInactivitySignOut]);

  // Escuchar eventos de actividad del usuario
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

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Si hay un nuevo usuario, crear registro en usuarios si no existe
      if (session?.user) {
        await ensureUsuarioExists(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // Resetear timer al hacer login
    setLastActivity(Date.now());
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, resetInactivityTimer }}>
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
