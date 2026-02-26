-- Add new columns to profiles table for extended onboarding
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS business_stage text,
ADD COLUMN IF NOT EXISTS ideal_customer text,
ADD COLUMN IF NOT EXISTS customer_problem text,
ADD COLUMN IF NOT EXISTS customer_problem_other text,
ADD COLUMN IF NOT EXISTS unique_value text,
ADD COLUMN IF NOT EXISTS marketing_goal text[],
ADD COLUMN IF NOT EXISTS marketing_blocker text,
ADD COLUMN IF NOT EXISTS active_channels text[],
ADD COLUMN IF NOT EXISTS priority_channel text,
ADD COLUMN IF NOT EXISTS content_frequency text,
ADD COLUMN IF NOT EXISTS content_struggle text,
ADD COLUMN IF NOT EXISTS brand_keywords text,
ADD COLUMN IF NOT EXISTS inspiration_brands text,
ADD COLUMN IF NOT EXISTS neobot_expectation text;