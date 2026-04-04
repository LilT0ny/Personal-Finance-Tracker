import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Categoria, PREDEFINED_CATEGORIES } from '../types';

export function useCategories() {
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCategories = async () => {
    if (!user) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Obtener el usuario_id de la tabla usuarios
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (usuarioError) {
        console.error('Error fetching usuario:', usuarioError);
        setCategories([]);
        setLoading(false);
        return;
      }
      
      if (!usuarioData) {
        console.warn('Usuario no encontrado, saltando fetch de categorías');
        setCategories([]);
        setLoading(false);
        return;
      }

      const usuarioId = usuarioData.id;

      // Obtener categorías del usuario
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('nombre');

      if (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      } else if (!data || data.length === 0) {
        // Si no hay categorías, crear las predefinidas
        const defaultCategories = PREDEFINED_CATEGORIES.map(cat => ({
          usuario_id: usuarioId,
          nombre: cat.label,
          icono: cat.icon,
          color: cat.color,
          limite_gastos: 0,
        }));

        const { error: insertError } = await supabase
          .from('categorias')
          .insert(defaultCategories);

        if (insertError) {
          console.error('Error inserting default categories:', insertError);
        }

        // Recargar categorías
        const { data: newData, error: newError } = await supabase
          .from('categorias')
          .select('*')
          .eq('usuario_id', usuarioId)
          .order('nombre');

        if (newError) {
          console.error('Error re-fetching categories:', newError);
          setCategories([]);
        } else {
          setCategories(newData || []);
        }
      } else {
        console.log('Categories loaded:', data.length);
        setCategories(data);
      }
    } catch (err) {
      console.error('Error fetching categories (catch):', err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (category: {
    nombre: string;
    icono: string;
    color: string;
    limite_gastos?: number;
  }) => {
    if (!user) throw new Error('Debes iniciar sesión');

    // Obtener usuario_id
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError) throw usuarioError;

    const { data, error } = await supabase
      .from('categorias')
      .insert({
        usuario_id: usuarioData.id,
        nombre: category.nombre,
        icono: category.icono,
        color: category.color,
        limite_gastos: category.limite_gastos || 0,
      })
      .select()
      .single();

    if (error) throw error;

    await fetchCategories();
    return data;
  };

  const updateCategory = async (id: string, updates: {
    nombre?: string;
    icono?: string;
    color?: string;
    limite_gastos?: number;
  }) => {
    if (!user) throw new Error('Debes iniciar sesión');

    const { error } = await supabase
      .from('categorias')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    if (!user) throw new Error('Debes iniciar sesión');

    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchCategories();
  };

  // Obtener categoría por ID
  const getCategoryById = (id: string): Categoria | undefined => {
    return categories.find(c => c.id === id);
  };

  useEffect(() => {
    fetchCategories();
  }, [user?.id]);

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    refetch: fetchCategories,
  };
}
