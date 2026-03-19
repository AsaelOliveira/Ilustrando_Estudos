ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS senha_visivel;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view scores in their turma" ON public.student_scores;
CREATE POLICY "Authenticated users can view scores"
  ON public.student_scores FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;
CREATE POLICY "Authenticated users can view app settings"
  ON public.app_settings FOR SELECT
  USING (auth.role() = 'authenticated');
