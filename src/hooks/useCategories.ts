import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CategoryConfig, DEFAULT_CATEGORIES } from '../types';

export interface CustomCategory extends CategoryConfig {
  user_id: string;
  is_default: boolean;
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCategories = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('label');

      if (error) throw error;

      // Merge default categories with custom ones
      const customCats = data || [];
      const mergedCategories = [...DEFAULT_CATEGORIES];
      
      customCats.forEach((custom: CustomCategory) => {
        // Replace default if custom exists with same id
        const index = mergedCategories.findIndex(c => c.id === custom.id);
        if (index >= 0) {
          mergedCategories[index] = custom;
        } else {
          // Add new custom category
          mergedCategories.push(custom);
        }
      });

      setCategories(mergedCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Fallback to default
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (category: Omit<CategoryConfig, 'id' | 'is_default'>) => {
    if (!user) throw new Error('Debes iniciar sesión');

    const newId = `custom_${Date.now()}`;
    const { data, error } = await supabase
      .from('custom_categories')
      .insert({
        user_id: user.id,
        id: newId,
        label: category.label,
        icon: category.icon,
        color: category.color,
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;
    
    await fetchCategories();
    return data;
  };

  const updateCategory = async (id: string, updates: Partial<CategoryConfig>) => {
    if (!user) throw new Error('Debes iniciar sesión');

    const { error } = await supabase
      .from('custom_categories')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    if (!user) throw new Error('Debes iniciar sesión');

    const { error } = await supabase
      .from('custom_categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_default', false);

    if (error) throw error;
    await fetchCategories();
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
    refetch: fetchCategories,
  };
}
