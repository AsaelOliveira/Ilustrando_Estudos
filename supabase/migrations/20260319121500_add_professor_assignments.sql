CREATE TABLE IF NOT EXISTS public.professor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turma_id TEXT NOT NULL,
  disciplina_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, turma_id, disciplina_id)
);

ALTER TABLE public.professor_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view professor assignments" ON public.professor_assignments;
DROP POLICY IF EXISTS "Admins can manage professor assignments" ON public.professor_assignments;
DROP POLICY IF EXISTS "Professores can view own assignments" ON public.professor_assignments;
DROP POLICY IF EXISTS "Coordenadora can view professor assignments" ON public.professor_assignments;

CREATE POLICY "Admins can view professor assignments"
  ON public.professor_assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage professor assignments"
  ON public.professor_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professores can view own assignments"
  ON public.professor_assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadora can view professor assignments"
  ON public.professor_assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'coordenadora'));
