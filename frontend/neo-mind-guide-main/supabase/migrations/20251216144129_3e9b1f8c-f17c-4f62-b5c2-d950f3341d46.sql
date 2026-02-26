-- Add new columns for onboarding data
ALTER TABLE public.profiles
ADD COLUMN business TEXT,
ADD COLUMN content_type TEXT,
ADD COLUMN platform TEXT,
ADD COLUMN communication_style TEXT,
ADD COLUMN goal TEXT;