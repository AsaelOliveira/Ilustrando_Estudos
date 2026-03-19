CREATE OR REPLACE FUNCTION public.admin_reset_student_progress(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turma_id TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(p.turma_id, ss.turma_id, '6ano')
    INTO v_turma_id
  FROM public.profiles p
  LEFT JOIN public.student_scores ss ON ss.user_id = p.user_id
  WHERE p.user_id = p_user_id;

  v_turma_id := COALESCE(v_turma_id, '6ano');

  DELETE FROM public.mission_attempts
  WHERE user_id = p_user_id;

  INSERT INTO public.student_scores (
    user_id,
    turma_id,
    points,
    missions_completed,
    streak_days,
    last_mission_date
  )
  VALUES (
    p_user_id,
    v_turma_id,
    0,
    0,
    0,
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    turma_id = EXCLUDED.turma_id,
    points = 0,
    missions_completed = 0,
    streak_days = 0,
    last_mission_date = NULL;

  UPDATE public.profiles
  SET
    avatar_unlocks = '[]'::jsonb,
    avatar_shop_spent = 0,
    avatar_style = jsonb_build_object(
      'skin', 'skin-aurora',
      'hair', 'hair-neo',
      'eyes', 'eyes-spark',
      'outfit', 'outfit-campus',
      'boots', 'boots-dash',
      'accessory', 'accessory-pin',
      'aura', 'aura-none'
    ),
    avatar_url = NULL
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_student_progress(UUID) TO authenticated;
