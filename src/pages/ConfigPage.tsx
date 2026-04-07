import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Edit3, User, Save } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Usuario } from '../types';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { ColorPicker } from '../components/ColorPicker';

export default function ConfigPage() {
  const { primaryColor } = useTheme();
  const [activeTab, setActiveTab] = useState<'perfil'>('perfil');
  const usuarioId = localStorage.getItem('usuario_id');
  
  // Usuario state
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loadingUsuario, setLoadingUsuario] = useState(true);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  
  // Formulario perfil
  const [formPerfil, setFormPerfil] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    telefono: '',
    fecha_nacimiento: '',
  });

  // Color temporal - solo se aplica cuando guardamos
  const [colorTemporal, setColorTemporal] = useState(primaryColor);

  // Sincronizar colorTemporal cuando cambia el color global
  useEffect(() => {
    setColorTemporal(primaryColor);
  }, [primaryColor]);

  // Cargar datos del usuario
  useEffect(() => {
    if (!usuarioId) return;
    
    const fetchUsuario = async () => {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', usuarioId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setUsuario(data);
          
          setFormPerfil({
            nombre: data.nombre || '',
            apellido_paterno: data.apellido_paterno || '',
            apellido_materno: data.apellido_materno || '',
            telefono: data.telefono || '',
            fecha_nacimiento: data.fecha_nacimiento || '',
          });
        }
      } catch (err) {
        console.error('Error fetching usuario:', err);
      } finally {
        setLoadingUsuario(false);
      }
    };

    fetchUsuario();
  }, [usuarioId]);

  // Guardar perfil y color
  const handleGuardarPerfil = async () => {
    if (!usuarioId || !usuario) return;
    
    setGuardandoPerfil(true);
    try {
      // Actualizar usuario
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          nombre: formPerfil.nombre,
          apellido_paterno: formPerfil.apellido_paterno,
          apellido_materno: formPerfil.apellido_materno,
          telefono: formPerfil.telefono,
          fecha_nacimiento: formPerfil.fecha_nacimiento,
        })
        .eq('id', usuario.id);

      if (updateError) throw updateError;

      // Guardar color en parametros_sistema
      await supabase
        .from('parametros_sistema')
        .upsert({ 
          usuario_id: usuarioId,
          color_primario: colorTemporal 
        }, { onConflict: 'usuario_id' });

      // Aplicar el color globalmente
      const channels = colorTemporal.replace('#', '');
      const r = parseInt(channels.substring(0, 2), 16);
      const g = parseInt(channels.substring(2, 4), 16);
      const b = parseInt(channels.substring(4, 6), 16);
      document.documentElement.style.setProperty('--primary', `${r} ${g} ${b}`);
      document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);

      setEditandoPerfil(false);
    } catch (err) {
      console.error('Error guardando perfil:', err);
      alert('Error al guardar perfil');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Configuración</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('perfil')}
          className={cn(
            "px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap",
            activeTab === 'perfil' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-foreground-muted'
          )}
        >
          <User className="w-4 h-4 inline mr-1" />
          Perfil
        </button>
      </div>

      {/* Perfil Tab */}
      {activeTab === 'perfil' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Información Personal</h3>
            {!editandoPerfil && (
              <button
                onClick={() => setEditandoPerfil(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm"
              >
                <Edit3 className="w-4 h-4" />
                Editar
              </button>
            )}
          </div>

          {loadingUsuario ? (
            <p className="text-foreground-muted">Cargando...</p>
          ) : (
            <div className="space-y-4">
              {/* Email (solo lectura) */}
              <div>
                <label className="text-foreground-muted text-sm block mb-1">Email</label>
                <input
                  type="email"
                  value={usuario?.email || localStorage.getItem('usuario_email') || ''}
                  disabled
                  className="input w-full opacity-60"
                />
              </div>

              {/* Nombre */}
              <div>
                <label className="text-foreground-muted text-sm block mb-1">Nombre</label>
                <input
                  type="text"
                  value={formPerfil.nombre}
                  onChange={(e) => setFormPerfil({...formPerfil, nombre: e.target.value})}
                  disabled={!editandoPerfil}
                  className="input w-full"
                  placeholder="Tu nombre"
                />
              </div>

              {/* Apellido Paterno */}
              <div>
                <label className="text-foreground-muted text-sm block mb-1">Apellido Paterno</label>
                <input
                  type="text"
                  value={formPerfil.apellido_paterno}
                  onChange={(e) => setFormPerfil({...formPerfil, apellido_paterno: e.target.value})}
                  disabled={!editandoPerfil}
                  className="input w-full"
                  placeholder="Tu apellido"
                />
              </div>

              {/* Apellido Materno */}
              <div>
                <label className="text-foreground-muted text-sm block mb-1">Apellido Materno</label>
                <input
                  type="text"
                  value={formPerfil.apellido_materno}
                  onChange={(e) => setFormPerfil({...formPerfil, apellido_materno: e.target.value})}
                  disabled={!editandoPerfil}
                  className="input w-full"
                  placeholder="Tu apellido (opcional)"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="text-foreground-muted text-sm block mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formPerfil.telefono}
                  onChange={(e) => setFormPerfil({...formPerfil, telefono: e.target.value})}
                  disabled={!editandoPerfil}
                  className="input w-full"
                  placeholder="0999999999"
                />
              </div>

              {/* Fecha de nacimiento */}
              <div>
                <label className="text-foreground-muted text-sm block mb-1">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={formPerfil.fecha_nacimiento}
                  onChange={(e) => setFormPerfil({...formPerfil, fecha_nacimiento: e.target.value})}
                  disabled={!editandoPerfil}
                  className="input w-full"
                />
                {usuario?.edad && (
                  <p className="text-xs text-foreground-muted mt-1">Edad: {usuario.edad} años</p>
                )}
              </div>

              {/* Color primario - solo editable cuando está en modo edición */}
              <div>
                <ColorPicker
                  color={editandoPerfil ? colorTemporal : primaryColor}
                  onChange={(c) => editandoPerfil && setColorTemporal(c)}
                  presets={['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#22c55e', '#f97316']}
                  label="Color de la App"
                />
                {!editandoPerfil && (
                  <p className="text-xs text-foreground-muted mt-1">Editable al presionar "Editar"</p>
                )}
              </div>

              {/* Botones guardar */}
              {editandoPerfil && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setEditandoPerfil(false);
                      setColorTemporal(primaryColor);
                      if (usuario) {
                        setFormPerfil({
                          nombre: usuario.nombre || '',
                          apellido_paterno: usuario.apellido_paterno || '',
                          apellido_materno: usuario.apellido_materno || '',
                          telefono: usuario.telefono || '',
                          fecha_nacimiento: usuario.fecha_nacimiento || '',
                        });
                      }
                    }}
                    className="flex-1 py-2 bg-background border border-border rounded-xl font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarPerfil}
                    disabled={guardandoPerfil}
                    className="flex-1 py-2 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    {guardandoPerfil ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Guardar
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
