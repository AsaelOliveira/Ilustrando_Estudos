
-- Student scores table for leaderboard
CREATE TABLE public.student_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turma_id TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  missions_completed INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_mission_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Mission attempts table
CREATE TABLE public.mission_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  turma_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 5,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  anti_cheat_flags JSONB DEFAULT '{}',
  UNIQUE(user_id, mission_date)
);

-- Enable RLS
ALTER TABLE public.student_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_attempts ENABLE ROW LEVEL SECURITY;

-- RLS for student_scores
CREATE POLICY "Users can view scores in their turma"
  ON public.student_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own scores"
  ON public.student_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scores"
  ON public.student_scores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all scores"
  ON public.student_scores FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS for mission_attempts
CREATE POLICY "Users can view own attempts"
  ON public.mission_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON public.mission_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts"
  ON public.mission_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on student_scores
CREATE TRIGGER update_student_scores_updated_at
  BEFORE UPDATE ON public.student_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_scores;
