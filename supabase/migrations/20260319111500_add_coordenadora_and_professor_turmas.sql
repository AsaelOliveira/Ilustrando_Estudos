CREATE TABLE IF NOT EXISTS public.professor_turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turma_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, turma_id)
);

ALTER TABLE public.professor_turmas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view professor turmas" ON public.professor_turmas;
DROP POLICY IF EXISTS "Admins can manage professor turmas" ON public.professor_turmas;
DROP POLICY IF EXISTS "Professores can view own turma links" ON public.professor_turmas;
DROP POLICY IF EXISTS "Coordenadora can view professor turmas" ON public.professor_turmas;

CREATE POLICY "Admins can view professor turmas"
  ON public.professor_turmas FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage professor turmas"
  ON public.professor_turmas FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professores can view own turma links"
  ON public.professor_turmas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadora can view professor turmas"
  ON public.professor_turmas FOR SELECT
  USING (public.has_role(auth.uid(), 'coordenadora'));

DROP POLICY IF EXISTS "Admins can view all attempts" ON public.mission_attempts;
DROP POLICY IF EXISTS "Coordenadora can view all attempts" ON public.mission_attempts;
DROP POLICY IF EXISTS "Professores can view attempts in their turma" ON public.mission_attempts;
DROP POLICY IF EXISTS "Professores can view attempts in linked turmas" ON public.mission_attempts;

CREATE POLICY "Admins can view all attempts"
  ON public.mission_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coordenadora can view all attempts"
  ON public.mission_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'coordenadora'));

CREATE POLICY "Professores can view attempts in linked turmas"
  ON public.mission_attempts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'professor')
    AND EXISTS (
      SELECT 1
      FROM public.professor_turmas pt
      WHERE pt.user_id = auth.uid()
        AND pt.turma_id = mission_attempts.turma_id
    )
  );
