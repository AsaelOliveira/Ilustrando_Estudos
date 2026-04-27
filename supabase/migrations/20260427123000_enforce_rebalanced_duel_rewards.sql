CREATE OR REPLACE FUNCTION public.finalize_duel(p_duel_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duel RECORD;
  v_rows INTEGER;
  v_winner_id UUID;
  v_challenger_id UUID;
  v_challenged_id UUID;
BEGIN
  SELECT *
  INTO v_duel
  FROM duels
  WHERE id = p_duel_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  IF v_duel.status <> 'em_batalha'
     OR v_duel.challenger_score IS NULL
     OR v_duel.challenged_score IS NULL THEN
    RETURN;
  END IF;

  v_challenger_id := v_duel.challenger_id;
  v_challenged_id := v_duel.challenged_id;

  IF v_duel.challenger_score > v_duel.challenged_score THEN
    v_winner_id := v_challenger_id;
  ELSIF v_duel.challenged_score > v_duel.challenger_score THEN
    v_winner_id := v_challenged_id;
  ELSE
    v_winner_id := NULL;
  END IF;

  UPDATE duels
  SET
    status = 'concluido',
    winner_id = v_winner_id
  WHERE id = p_duel_id
    AND status = 'em_batalha';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN; END IF;

  IF v_winner_id IS NOT NULL THEN
    INSERT INTO student_scores (user_id, turma_id, points, missions_completed, streak_days)
    SELECT v_winner_id, COALESCE(p.turma_id, '6ano'), 5, 0, 0
    FROM profiles p
    WHERE p.user_id = v_winner_id
    ON CONFLICT (user_id) DO UPDATE SET
      points = student_scores.points + 5,
      updated_at = now();
  ELSE
    INSERT INTO student_scores (user_id, turma_id, points, missions_completed, streak_days)
    SELECT v_challenger_id, COALESCE(p.turma_id, '6ano'), 2, 0, 0
    FROM profiles p
    WHERE p.user_id = v_challenger_id
    ON CONFLICT (user_id) DO UPDATE SET
      points = student_scores.points + 2,
      updated_at = now();

    INSERT INTO student_scores (user_id, turma_id, points, missions_completed, streak_days)
    SELECT v_challenged_id, COALESCE(p.turma_id, '6ano'), 2, 0, 0
    FROM profiles p
    WHERE p.user_id = v_challenged_id
    ON CONFLICT (user_id) DO UPDATE SET
      points = student_scores.points + 2,
      updated_at = now();
  END IF;
END;
$$;
