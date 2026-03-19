CREATE TABLE IF NOT EXISTS public.activity_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turma_id TEXT NOT NULL,
  disciplina_id TEXT NOT NULL,
  tema_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('exercicio', 'simulado')),
  acertos INTEGER NOT NULL CHECK (acertos >= 0),
  total INTEGER NOT NULL CHECK (total > 0 AND acertos <= total),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_results_user_created_idx
  ON public.activity_results (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS activity_results_scope_idx
  ON public.activity_results (turma_id, disciplina_id, created_at DESC);

ALTER TABLE public.activity_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own activity results" ON public.activity_results;
DROP POLICY IF EXISTS "Users can view own activity results" ON public.activity_results;
DROP POLICY IF EXISTS "Admins can view all activity results" ON public.activity_results;
DROP POLICY IF EXISTS "Coordenadora can view all activity results" ON public.activity_results;
DROP POLICY IF EXISTS "Professores can view activity results in assignments" ON public.activity_results;

CREATE POLICY "Users can insert own activity results"
  ON public.activity_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own activity results"
  ON public.activity_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity results"
  ON public.activity_results FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coordenadora can view all activity results"
  ON public.activity_results FOR SELECT
  USING (public.has_role(auth.uid(), 'coordenadora'));

CREATE POLICY "Professores can view activity results in assignments"
  ON public.activity_results FOR SELECT
  USING (
    public.has_role(auth.uid(), 'professor')
    AND EXISTS (
      SELECT 1
      FROM public.professor_assignments pa
      WHERE pa.user_id = auth.uid()
        AND pa.turma_id = activity_results.turma_id
        AND pa.disciplina_id = activity_results.disciplina_id
    )
  );
