import { useState, useEffect } from 'react';
import { Mail, Lock, Loader2, ArrowRight, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export function LoginPage() {
  const { signIn, signUp, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1); // 1 = login/signup choice, 2 = login form, 3 = signup credentials
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  
  // Check if user needs to complete profile on first login
  useEffect(() => {
    const checkProfileNeeded = async () => {
      if (!email) return;
      
      // Find user by email
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (user) {
        // Check if profile exists
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();
        
        if (!usuario) {
          setNeedsProfile(true);
        }
      }
    };
    
    checkProfileNeeded();
  }, [email]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Primero verificar si existe en la tabla usuarios
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id, email')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (!usuarioData) {
        setError('No tienes cuenta. Crea una primero.');
        setSubmitting(false);
        return;
      }

      // Ahora intentar login en Auth
      const { error: authError } = await signIn(email, password);
      
      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Primero confirmá tu email. Revisa tu bandeja de entrada.');
        } else {
          setError(authError.message);
        }
      }
      // Si no hay error, el usuario quedará logueado y el componente se re-renderiza
    } catch (err) {
      console.error('Error en login:', err);
      setError('Error al iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      // Verificar si ya existe el email
      const { data: existingUsuario } = await supabase
        .from('usuarios')
        .select('id, email')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (existingUsuario) {
        setError('Ya tienes una cuenta. Iniciá sesión.');
        setSubmitting(false);
        return;
      }

      // Crear cuenta en Supabase Auth (envía email de confirmación)
      const { error: authError } = await signUp(email, password);
      
      if (authError) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }
      
      // Mostrar mensaje de confirmación
      setSuccessMessage('¡Revisa tu email para confirmar tu cuenta! Haz click en el enlace y luego iniciá sesión.');
      setStep(2); // Volver al login
      
    } catch (err) {
      console.error('Error en signup:', err);
      setError('Error al crear cuenta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteFirstLogin = async () => {
    if (!email) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Obtener el usuario de auth
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const authUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!authUser) {
        setError('Usuario no encontrado. Iniciá sesión primero.');
        return;
      }
      
      // Verificar si ya tiene perfil
      const { data: existingUsuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .single();
      
      if (existingUsuario) {
        setError('Tu perfil ya existe. Iniciá sesión.');
        setNeedsProfile(false);
        return;
      }
      
      // Pedir datos del perfil
      const nombre = prompt('Nombre:');
      if (!nombre) return;
      
      const apellidoPaterno = prompt('Apellido Paterno:');
      if (!apellidoPaterno) return;
      
      const cedula = prompt('Cédula:');
      if (!cedula) return;
      
      const fechaNacimiento = prompt('Fecha de nacimiento (YYYY-MM-DD):');
      if (!fechaNacimiento) return;
      
      // Crear perfil
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert({
          auth_user_id: authUser.id,
          email: email.toLowerCase().trim(),
          cedula: cedula.trim(),
          nombre: nombre.trim(),
          apellido_paterno: apellidoPaterno.trim(),
          fecha_nacimiento: fechaNacimiento,
        });
      
      if (insertError) {
        setError('Error al crear perfil: ' + insertError.message);
        return;
      }
      
      alert('¡Perfil completado! Ahora podés usar la app.');
      setNeedsProfile(false);
      
    } catch (err) {
      console.error('Error:', err);
      setError('Error al completar perfil');
    } finally {
      setSubmitting(false);
    }
  };

  // Vista de elección login/signup
  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Finance Tracker</h1>
            <p className="text-foreground-muted mt-2">
              Tu gestor de finanzas personales
            </p>
          </div>

          {successMessage && (
            <div className="mb-4 bg-success/10 border border-success/30 rounded-lg p-4 text-success text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>{successMessage}</div>
              </div>
            </div>
          )}

          <div className="card space-y-4">
            <button
              onClick={() => setStep(2)}
              className="w-full btn-primary py-4 flex items-center justify-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Iniciar Sesión
            </button>
            
            <button
              onClick={() => setStep(3)}
              className="w-full py-4 bg-card border border-border rounded-xl flex items-center justify-center gap-2 hover:bg-background"
            >
              <UserPlus className="w-5 h-5" />
              Crear Cuenta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista de login
  if (step === 2) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Iniciar Sesión</h1>
            <p className="text-foreground-muted mt-2">
              Ingresá a tu cuenta
            </p>
          </div>

          {needsProfile && (
            <div className="mb-4 bg-primary/10 border border-primary/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Necesitás completar tu perfil</p>
                  <button
                    onClick={handleCompleteFirstLogin}
                    disabled={submitting}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
                    Completar ahora →
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-foreground-muted text-sm block mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="input w-full pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="text-foreground-muted text-sm block mb-2">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input w-full pl-10"
                    required
                    minLength={6}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-danger text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || loading}
                className={cn(
                  "w-full btn-primary py-3 flex items-center justify-center gap-2",
                  (submitting || loading) && "opacity-50 cursor-not-allowed"
                )}
              >
                {submitting || loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setStep(1);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-primary hover:underline text-sm"
              >
                ← Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista de signup - crear credenciales
  if (step === 3) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Crear Cuenta</h1>
            <p className="text-foreground-muted mt-2">
              Elegí tu email y contraseña
            </p>
          </div>

          <div className="card">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="text-foreground-muted text-sm block mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="input w-full pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="text-foreground-muted text-sm block mb-2">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="input w-full pl-10"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-danger text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || loading}
                className={cn(
                  "w-full btn-primary py-3 flex items-center justify-center gap-2",
                  (submitting || loading) && "opacity-50 cursor-not-allowed"
                )}
              >
                {submitting || loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Crear Cuenta
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                className="text-primary hover:underline text-sm"
              >
                ← Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
