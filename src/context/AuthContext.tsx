import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
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
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
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
