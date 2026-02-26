-- Add status field to content_plans tasks
-- Since tasks is JSONB, we don't need to alter the table structure
-- The tasks array items will now include a "status" field: "planned" | "done"

-- Add a function to update task status within a plan
CREATE OR REPLACE FUNCTION public.update_task_status(
  plan_id UUID,
  task_index INTEGER,
  new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_tasks JSONB;
BEGIN
  -- Get current tasks and update the specific task's status
  SELECT jsonb_set(
    tasks,
    ARRAY[task_index::TEXT, 'status'],
    to_jsonb(new_status)
  )
  INTO updated_tasks
  FROM content_plans
  WHERE id = plan_id AND user_id = auth.uid();
  
  -- Update the plan
  UPDATE content_plans
  SET tasks = updated_tasks, updated_at = now()
  WHERE id = plan_id AND user_id = auth.uid();
  
  RETURN updated_tasks;
END;
$$;