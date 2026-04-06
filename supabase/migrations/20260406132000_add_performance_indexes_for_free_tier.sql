-- Indices extras para reduzir leituras custosas no plano free.
-- Foco: ranking, missao diaria e lobby de duelos.

CREATE INDEX IF NOT EXISTS idx_student_scores_turma_points
  ON public.student_scores (turma_id, points DESC, user_id);

CREATE INDEX IF NOT EXISTS idx_student_scores_points
  ON public.student_scores (points DESC, user_id);

CREATE INDEX IF NOT EXISTS idx_mission_attempts_user_mission_date
  ON public.mission_attempts (user_id, mission_date DESC);

CREATE INDEX IF NOT EXISTS idx_duels_lobby_lookup
  ON public.duels (status, visibility, turma_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_duels_challenged_status
  ON public.duels (challenged_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_duels_challenger_status
  ON public.duels (challenger_id, status, created_at DESC);
