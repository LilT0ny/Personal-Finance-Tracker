import { useState } from 'react';
import { Mail, Lock, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export function LoginPage() {
  const { signIn, signUp, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState(1); // 1 = login/signup, 2 = perfil
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Perfil fields
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          setSuccessMessage('¡Revisa tu email para confirmar tu cuenta!');
          // No avanzar al paso 2 aún - esperar confirmación
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompletePerfil = async () => {
    if (!email || !nombre.trim() || !apellidoPaterno.trim() || !cedula.trim() || !fechaNacimiento) {
      setError('Por favor completá todos los campos requeridos');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Intentar crear el usuario en la tabla usuarios
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert({
          auth_user_id: (await supabase.auth.getUser()).data.user?.id,
          email,
          cedula,
          nombre,
          apellido_paterno: apellidoPaterno,
          apellido_materno: apellidoMaterno,
          telefono,
          fecha_nacimiento: fechaNacimiento,
        });
      
      if (insertError) {
        console.error('Error creando usuario:', insertError);
        setError('Error al crear perfil. Intentalo de nuevo.');
        return;
      }
      
      // Recargar la página para que se muestre el dashboard
      window.location.reload();
    } catch (err) {
      console.error('Error en handleCompletePerfil:', err);
      setError('Error al guardar perfil');
    } finally {
      setSubmitting(false);
    }
  };

  // Si está en paso 2 (completar perfil), mostrar el formulario de registro
  if (step === 2) {
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
            <form onSubmit={(e) => { e.preventDefault(); handleCompletePerfil(); }} className="space-y-4">
              {/* Cédula */}
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

              {/* Nombre */}
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

              {/* Apellido Paterno */}
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

              {/* Apellido Materno */}
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

              {/* Teléfono */}
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

              {/* Fecha de nacimiento */}
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

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
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
                    <>
                      Completar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Paso 1: Login o Signup
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Finance Tracker</h1>
          <p className="text-foreground-muted mt-2">
            {isSignUp ? 'Crea tu cuenta' : 'Inicia sesión'}
          </p>
        </div>

        {/* Form Card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
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

            {/* Password Input */}
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
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-danger text-sm">
                {error}
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-success text-sm">
                {successMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || loading}
              className={cn(
                "w-full btn-primary py-3 flex items-center justify-center gap-2",
                (submitting || loading) && "opacity-50 cursor-not-allowed"
              )}
            >
              {submitting || loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isSignUp ? 'Creando cuenta...' : 'Iniciando sesión...'}
                </>
              ) : (
                isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-primary hover:underline text-sm"
            >
              {isSignUp 
                ? '¿Ya tenés cuenta? Inicia sesión' 
                : '¿No tenés cuenta? Crea una'}
            </button>
          </div>

          {/* En signup, mostrar botón para ir a completar perfil */}
          {isSignUp && successMessage && (
            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => setStep(2)}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                Completar mi perfil
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
