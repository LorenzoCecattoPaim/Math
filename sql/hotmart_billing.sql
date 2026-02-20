-- ============================================
-- Hotmart Billing + Free Usage Control (Supabase)
-- ============================================
-- Use este script quando o ID do usuario vem de auth.users (Supabase Auth).

CREATE TABLE IF NOT EXISTS public.users_profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    free_uses INTEGER NOT NULL DEFAULT 5,
    uses_count INTEGER NOT NULL DEFAULT 0,
    hotmart_purchase_id TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users_profile ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS free_uses INTEGER NOT NULL DEFAULT 5;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS uses_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS hotmart_purchase_id TEXT;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_users_profile_email ON public.users_profile(email);
CREATE INDEX IF NOT EXISTS idx_users_profile_plan ON public.users_profile(plan);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_profile_updated_at ON public.users_profile;
CREATE TRIGGER update_users_profile_updated_at
    BEFORE UPDATE ON public.users_profile
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
