-- Create content_plans table for storing generated content plans
CREATE TABLE public.content_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Obsahový plán',
  period TEXT NOT NULL DEFAULT 'tyden', -- tyden | mesic
  goal TEXT,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of task objects
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own content plans" 
ON public.content_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own content plans" 
ON public.content_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content plans" 
ON public.content_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content plans" 
ON public.content_plans 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_content_plans_updated_at
BEFORE UPDATE ON public.content_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_content_plans_user_id ON public.content_plans(user_id);
CREATE INDEX idx_content_plans_created_at ON public.content_plans(created_at DESC);