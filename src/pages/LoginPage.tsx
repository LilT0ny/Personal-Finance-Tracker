import { useState } from 'react';
import { Mail, Lock, Loader2, ArrowRight, ArrowLeft, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export function LoginPage() {
  const { signIn, signUp, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1); // 1 = login/signup choice, 2 = login form, 3 = signup form, 4 = complete profile
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Profile fields for signup
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');

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

      // Ahora sí intentar login en Auth
      const { error: authError } = await signIn(email, password);
      
      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos');
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
    setSubmitting(true);

    try {
      // Intentar crear cuenta en Supabase Auth
      const { error: authError } = await signUp(email, password);
      
      if (authError) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }
      
      // Si todo bien, ir al paso de completar perfil
      setStep(4);
    } catch (err) {
      console.error('Error en signup:', err);
      setError('Error al crear cuenta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!nombre.trim() || !apellidoPaterno.trim() || !cedula.trim() || !fechaNacimiento) {
      setError('Por favor completá todos los campos requeridos');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Obtener el usuario actual de Auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        setError('Sesión expirada. Iniciá sesión nuevamente.');
        setStep(2);
        return;
      }
      
      // Crear el registro en la tabla usuarios
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert({
          auth_user_id: authUser.id,
          email: email.toLowerCase().trim(),
          cedula: cedula.trim(),
          nombre: nombre.trim(),
          apellido_paterno: apellidoPaterno.trim(),
          apellido_materno: apellidoMaterno.trim() || null,
          telefono: telefono.trim() || null,
          fecha_nacimiento: fechaNacimiento,
        });
      
      if (insertError) {
        console.error('Error creando usuario:', insertError);
        setError('Error al crear perfil: ' + insertError.message);
        setSubmitting(false);
        return;
      }
      
      // Cerrar sesión para que inicie sesión con las credenciales
      await supabase.auth.signOut();
      
      // Limpiar y volver al login
      setStep(2);
      setEmail('');
      setPassword('');
      setNombre('');
      setApellidoPaterno('');
      setApellidoMaterno('');
      setCedula('');
      setTelefono('');
      setFechaNacimiento('');
      setError(null);
      alert('¡Cuenta creada! Ahora podés iniciar sesión.');
      
    } catch (err) {
      console.error('Error en handleCompleteProfile:', err);
      setError('Error al guardar perfil');
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

  // Vista de signup - paso 1 (crear credenciales)
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
                    Continuar
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

  // Vista de signup - paso 2 (completar perfil)
  if (step === 4) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Completá tu perfil</h1>
            <p className="text-foreground-muted mt-2">
              Último paso para crear tu cuenta
            </p>
          </div>

          <div className="card space-y-4">
            <form onSubmit={(e) => { e.preventDefault(); handleCompleteProfile(); }} className="space-y-4">
              <div>
                <label className="text-foreground-muted text-sm block mb-2">Cédula *</label>
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="1234567890"
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="text-foreground-muted text-sm block mb-2">Nombre *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="text-foreground-muted text-sm block mb-2">Apellido Paterno *</label>
                <input
                  type="text"
                  value={apellidoPaterno}
                  onChange={(e) => setApellidoPaterno(e.target.value)}
                  placeholder="Tu apellido"
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="text-foreground-muted text-sm block mb-2">Apellido Materno</label>
                <input
                  type="text"
                  value={apellidoMaterno}
                  onChange={(e) => setApellidoMaterno(e.target.value)}
                  placeholder="Tu apellido (opcional)"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="text-foreground-muted text-sm block mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="0999999999"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="text-foreground-muted text-sm block mb-2">Fecha de Nacimiento *</label>
                <input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="input w-full"
                  required
                />
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-danger text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-card border border-border rounded-xl flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "flex-1 btn-primary py-3 flex items-center justify-center gap-2",
                    submitting && "opacity-50"
                  )}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Crear Cuenta'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
