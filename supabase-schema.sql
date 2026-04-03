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

-- 2. Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
-- Users can only see their own transactions
CREATE POLICY "users_can_view_own_transactions" 
ON public.transactions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only insert their own transactions
CREATE POLICY "users_can_insert_own_transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own transactions
CREATE POLICY "users_can_update_own_transactions" 
ON public.transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can only delete their own transactions
CREATE POLICY "users_can_delete_own_transactions" 
ON public.transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- 5. Insert demo data (optional - remove in production)
-- INSERT INTO public.transactions (user_id, amount, category, type, note)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000001', 1500.00, 'food', 'income', 'Salario'),
--   ('00000000-0000-0000-0000-000000000001', 45.50, 'food', 'expense', 'Supermercado'),
--   ('00000000-0000-0000-0000-000000000001', 25.00, 'transport', 'expense', 'Nafta');
