ALTER TABLE public.activity_results
  ADD COLUMN IF NOT EXISTS counts_for_points BOOLEAN NOT NULL DEFAULT true;

UPDATE public.activity_results
SET counts_for_points = true
WHERE counts_for_points IS NULL;
