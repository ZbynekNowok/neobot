-- Add brand_name and brand_logo_url columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS brand_name TEXT,
ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;