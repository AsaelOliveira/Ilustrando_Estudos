DROP POLICY IF EXISTS "Admins can view all attempts" ON public.mission_attempts;

CREATE POLICY "Admins can view all attempts"
  ON public.mission_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professores can view attempts in their turma"
  ON public.mission_attempts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'professor')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.turma_id = mission_attempts.turma_id
    )
  );
