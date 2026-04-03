-- =============================================
-- Personal Finance Tracker - Supabase Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create custom_categories table
CREATE TABLE IF NOT EXISTS public.custom_categories (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  limit_amount NUMERIC(12, 2) NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly')),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for transactions
CREATE POLICY "users_can_view_own_transactions" 
ON public.transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_transactions" 
ON public.transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_transactions" 
ON public.transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- 6. Create RLS policies for custom_categories
CREATE POLICY "users_can_view_own_categories" 
ON public.custom_categories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_categories" 
ON public.custom_categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_categories" 
ON public.custom_categories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_categories" 
ON public.custom_categories 
FOR DELETE 
USING (auth.uid() = user_id);

-- 7. Create RLS policies for budgets
CREATE POLICY "users_can_view_own_budgets" 
ON public.budgets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_budgets" 
ON public.budgets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_budgets" 
ON public.budgets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_budgets" 
ON public.budgets 
FOR DELETE 
USING (auth.uid() = user_id);

-- 8. Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_categories_user_id ON public.custom_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
