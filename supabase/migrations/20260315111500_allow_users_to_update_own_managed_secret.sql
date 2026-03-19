DROP POLICY IF EXISTS "Users can insert own managed secret" ON public.managed_user_secrets;
CREATE POLICY "Users can insert own managed secret"
  ON public.managed_user_secrets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own managed secret" ON public.managed_user_secrets;
CREATE POLICY "Users can update own managed secret"
  ON public.managed_user_secrets FOR UPDATE
  USING (auth.uid() = user_id);
