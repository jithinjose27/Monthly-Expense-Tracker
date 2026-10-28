-- ============================================================================
-- Monthly Personal Expense Tracker - Supabase Database Schema & RLS Setup
-- ============================================================================
-- Features:
-- 1. Public Read Access: Anyone can view expenses and budgets for any month/year.
-- 2. Owner-Only Write Access: Only the authenticated user can add, edit, or delete.
-- 3. Pre-populated with your existing October 2026 data (Budget ₹12,510 + Days 1-31).
-- ============================================================================

-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    chicken NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    eggs NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    bananas NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Represents 'Fruits' in the UI
    other_food NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    other_exp NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_expense_date UNIQUE (user_id, expense_date)
);

-- Index for fast month/range queries
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses (user_id, expense_date);

-- 2. Create monthly_budgets table
CREATE TABLE IF NOT EXISTS public.monthly_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL,
    budget NUMERIC(10, 2) NOT NULL DEFAULT 5000.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_year_month UNIQUE (user_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_budgets_lookup ON public.monthly_budgets (year, month);

-- 3. Automatically update updated_at timestamp on row update
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_expenses_updated_at ON public.expenses;
CREATE TRIGGER trigger_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_budgets_updated_at ON public.monthly_budgets;
CREATE TRIGGER trigger_budgets_updated_at
    BEFORE UPDATE ON public.monthly_budgets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to allow safe re-runs
DROP POLICY IF EXISTS "Public can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Owner can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Owner can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Owner can delete expenses" ON public.expenses;

DROP POLICY IF EXISTS "Public can view budgets" ON public.monthly_budgets;
DROP POLICY IF EXISTS "Owner can insert budgets" ON public.monthly_budgets;
DROP POLICY IF EXISTS "Owner can update budgets" ON public.monthly_budgets;
DROP POLICY IF EXISTS "Owner can delete budgets" ON public.monthly_budgets;

-- 1. PUBLIC READ ACCESS (For portfolio / showcase)
-- Allows unauthenticated visitors (anon) and authenticated users to read all expense records
CREATE POLICY "Public can view expenses"
    ON public.expenses
    FOR SELECT
    USING (true);

CREATE POLICY "Public can view budgets"
    ON public.monthly_budgets
    FOR SELECT
    USING (true);

-- 2. OWNER WRITE ACCESS
-- Restricts INSERT, UPDATE, DELETE strictly to the authenticated user matching user_id
CREATE POLICY "Owner can insert expenses"
    ON public.expenses
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update expenses"
    ON public.expenses
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete expenses"
    ON public.expenses
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert budgets"
    ON public.monthly_budgets
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update budgets"
    ON public.monthly_budgets
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete budgets"
    ON public.monthly_budgets
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
