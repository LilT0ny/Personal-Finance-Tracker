import { useState } from 'react';
import { Mail, Lock, Loader2, UserPlus, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

// Función simple para hashear password
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estados para mostrar/ocultar contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Perfil fields
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [tempEmail, setTempEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { data: usuario, error: findError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (findError || !usuario) {
        setError('No tienes cuenta. Crea una primero.');
        setSubmitting(false);
        return;
      }

      const hashedPassword = await hashPassword(password);
      
      if (usuario.password_hash !== hashedPassword) {
        setError('Email o contraseña incorrectos');
        setSubmitting(false);
        return;
      }

      localStorage.setItem('usuario_id', usuario.id);
      localStorage.setItem('usuario_email', usuario.email);
      
      window.location.reload();
      
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
      // Validar que las contraseñas coincidan
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        setSubmitting(false);
        return;
      }

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

      setTempEmail(email.toLowerCase().trim());
      setTempPassword(password);
      
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
      const hashedPassword = await hashPassword(tempPassword);
      
      // 1. Crear usuario
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert({
          email: tempEmail,
          password_hash: hashedPassword,
          cedula: cedula.trim(),
          nombre: nombre.trim(),
          apellido_paterno: apellidoPaterno.trim(),
          apellido_materno: apellidoMaterno.trim() || null,
          telefono: telefono.trim() || null,
          fecha_nacimiento: fechaNacimiento,
        });
      
      if (insertError) {
        console.error('Error inserting:', insertError);
        setError('Error al crear cuenta: ' + insertError.message);
        setSubmitting(false);
        return;
      }
      
      // 2. Obtener el usuario creado para obtener su ID
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', tempEmail.toLowerCase().trim())
        .single();
      
      // 3. Crear parámetros del sistema con color primario por defecto
      if (usuarioData?.id) {
        await supabase
          .from('parametros_sistema')
          .insert({
            usuario_id: usuarioData.id,
            color_primario: '#3b82f6', // default blue
          });
      }
      
      resetForm();
      setStep(2);
      alert('¡Cuenta creada! Iniciá sesión.');
      
    } catch (err) {
      console.error('Error en handleCompleteProfile:', err);
      setError('Error al guardar perfil');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setNombre('');
    setApellidoPaterno('');
    setApellidoMaterno('');
    setCedula('');
    setTelefono('');
    setFechaNacimiento('');
    setConfirmPassword('');
    setTempEmail('');
    setTempPassword('');
    setError(null);
    setSuccessMessage(null);
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
              onClick={() => { setStep(2); setError(null); setSuccessMessage(null); }}
              className="w-full bg-app-primary text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Iniciar Sesión
            </button>
            
            <button
              onClick={() => { setStep(3); setError(null); setSuccessMessage(null); }}
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
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input w-full pl-10 pr-10"
                    required
                    minLength={6}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-danger text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "w-full bg-app-primary text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2",
                  submitting && "opacity-50 cursor-not-allowed"
                )}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => { setStep(1); setError(null); setSuccessMessage(null); }}
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
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="input w-full pl-10 pr-10"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-foreground-muted text-sm block mb-2">Confirmar Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repetí tu contraseña"
                    className="input w-full pl-10 pr-10"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-danger text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "w-full bg-app-primary text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2",
                  submitting && "opacity-50 cursor-not-allowed"
                )}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Continuar'
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => { setStep(1); setError(null); }}
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

  // Vista de completar perfil
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
                  onClick={() => { setStep(3); setError(null); }}
                  className="flex-1 py-3 bg-card border border-border rounded-xl"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "flex-1 bg-app-primary text-white py-3 rounded-xl font-medium",
                    submitting && "opacity-50"
                  )}
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Crear Cuenta'}
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
