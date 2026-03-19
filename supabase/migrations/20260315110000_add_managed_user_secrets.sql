CREATE TABLE IF NOT EXISTS public.managed_user_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  visible_password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.managed_user_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view managed user secrets" ON public.managed_user_secrets;
CREATE POLICY "Admins can view managed user secrets"
  ON public.managed_user_secrets FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert managed user secrets" ON public.managed_user_secrets;
CREATE POLICY "Admins can insert managed user secrets"
  ON public.managed_user_secrets FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update managed user secrets" ON public.managed_user_secrets;
CREATE POLICY "Admins can update managed user secrets"
  ON public.managed_user_secrets FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete managed user secrets" ON public.managed_user_secrets;
CREATE POLICY "Admins can delete managed user secrets"
  ON public.managed_user_secrets FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_managed_user_secrets_updated_at ON public.managed_user_secrets;
CREATE TRIGGER update_managed_user_secrets_updated_at
  BEFORE UPDATE ON public.managed_user_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
