ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_identifier TEXT;

UPDATE public.profiles
SET login_identifier = COALESCE(
  NULLIF(login_identifier, ''),
  'aluno_' || left(replace(user_id::text, '-', ''), 6)
)
WHERE login_identifier IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_login_identifier_key
  ON public.profiles (lower(login_identifier));

CREATE OR REPLACE FUNCTION public.resolve_login_email(p_identifier TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE lower(p.login_identifier) = lower(trim(p_identifier))
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.resolve_login_email(TEXT) TO anon, authenticated;
