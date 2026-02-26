-- ============================================================
-- Jednorázový setup nového Supabase projektu (NeoBot)
-- Spusť celý soubor v SQL Editoru v Supabase Dashboard.
-- ============================================================

-- 1) Tabulka profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name) VALUES (new.id, new.raw_user_meta_data ->> 'name') ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Sloupce profilu (onboarding)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business TEXT, ADD COLUMN IF NOT EXISTS content_type TEXT, ADD COLUMN IF NOT EXISTS platform TEXT, ADD COLUMN IF NOT EXISTS communication_style TEXT, ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_stage text, ADD COLUMN IF NOT EXISTS ideal_customer text, ADD COLUMN IF NOT EXISTS customer_problem text, ADD COLUMN IF NOT EXISTS customer_problem_other text, ADD COLUMN IF NOT EXISTS unique_value text, ADD COLUMN IF NOT EXISTS marketing_goal text[], ADD COLUMN IF NOT EXISTS marketing_blocker text, ADD COLUMN IF NOT EXISTS active_channels text[], ADD COLUMN IF NOT EXISTS priority_channel text, ADD COLUMN IF NOT EXISTS content_frequency text, ADD COLUMN IF NOT EXISTS content_struggle text, ADD COLUMN IF NOT EXISTS brand_keywords text, ADD COLUMN IF NOT EXISTS inspiration_brands text, ADD COLUMN IF NOT EXISTS neobot_expectation text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS brand_name TEXT, ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;

-- 3) Tabulka content_plans
CREATE TABLE IF NOT EXISTS public.content_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Obsahový plán',
  period TEXT NOT NULL DEFAULT 'tyden',
  goal TEXT,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own content plans" ON public.content_plans;
CREATE POLICY "Users can view their own content plans" ON public.content_plans FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own content plans" ON public.content_plans;
CREATE POLICY "Users can create their own content plans" ON public.content_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own content plans" ON public.content_plans;
CREATE POLICY "Users can update their own content plans" ON public.content_plans FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own content plans" ON public.content_plans;
CREATE POLICY "Users can delete their own content plans" ON public.content_plans FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_content_plans_updated_at ON public.content_plans;
CREATE TRIGGER update_content_plans_updated_at BEFORE UPDATE ON public.content_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_content_plans_user_id ON public.content_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_content_plans_created_at ON public.content_plans(created_at DESC);

CREATE OR REPLACE FUNCTION public.update_task_status(plan_id UUID, task_index INTEGER, new_status TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE updated_tasks JSONB;
BEGIN
  SELECT jsonb_set(tasks, ARRAY[task_index::TEXT, 'status'], to_jsonb(new_status)) INTO updated_tasks FROM content_plans WHERE id = plan_id AND user_id = auth.uid();
  UPDATE content_plans SET tasks = updated_tasks, updated_at = now() WHERE id = plan_id AND user_id = auth.uid();
  RETURN updated_tasks;
END;
$$;

-- 4) Storage – politiky pro bucket brand-logos (bucket vytvoř v UI: Storage → New bucket → brand-logos, Public ON)
DROP POLICY IF EXISTS "brand-logos: authenticated insert own folder" ON storage.objects;
DROP POLICY IF EXISTS "brand-logos: authenticated update own folder" ON storage.objects;
DROP POLICY IF EXISTS "brand-logos: public read" ON storage.objects;
DROP POLICY IF EXISTS "brand-logos: authenticated delete own folder" ON storage.objects;
CREATE POLICY "brand-logos: authenticated insert own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
CREATE POLICY "brand-logos: authenticated update own folder" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
CREATE POLICY "brand-logos: public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'brand-logos');
CREATE POLICY "brand-logos: authenticated delete own folder" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
