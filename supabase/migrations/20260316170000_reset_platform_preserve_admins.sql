-- Reset geral da plataforma preservando apenas usuários com papel de admin.
-- Objetivo:
-- 1. Remover alunos, professores e seus dados relacionados.
-- 2. Limpar progresso, ranking, duelos e solicitações pendentes.
-- 3. Manter o acesso dos administradores para recomeçar do zero.

DO $$
DECLARE
  default_avatar_style jsonb := '{
    "skin": "skin-aurora",
    "hair": "hair-neo",
    "eyes": "eyes-spark",
    "outfit": "outfit-campus",
    "boots": "boots-dash",
    "accessory": "accessory-pin",
    "aura": "aura-none"
  }'::jsonb;
  profile_reset_sql text := '
    UPDATE public.profiles
    SET
      turma_id = NULL,
      avatar_url = NULL,
      avatar_locked = false,
      updated_at = now()';
BEGIN
  DELETE FROM public.duels;
  DELETE FROM public.mission_attempts;
  DELETE FROM public.photo_change_requests;
  DELETE FROM public.student_scores;

  DELETE FROM auth.users
  WHERE id NOT IN (
    SELECT user_id
    FROM public.user_roles
    WHERE role = 'admin'
  );

  DELETE FROM public.user_roles
  WHERE role <> 'admin';

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'avatar_shop_spent'
  ) THEN
    profile_reset_sql := profile_reset_sql || ',
      avatar_shop_spent = 0';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'avatar_unlocks'
  ) THEN
    profile_reset_sql := profile_reset_sql || ',
      avatar_unlocks = ''[]''::jsonb';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'avatar_style'
  ) THEN
    profile_reset_sql := profile_reset_sql || format(',
      avatar_style = %L::jsonb', default_avatar_style::text);
  END IF;

  profile_reset_sql := profile_reset_sql || '
    WHERE user_id IN (
      SELECT user_id
      FROM public.user_roles
      WHERE role = ''admin''
    )';

  EXECUTE profile_reset_sql;

  INSERT INTO public.student_scores (user_id, turma_id, points, missions_completed, streak_days, last_mission_date)
  SELECT user_id, '6ano', 0, 0, 0, NULL
  FROM public.user_roles
  WHERE role = 'admin'
  ON CONFLICT (user_id) DO UPDATE SET
    turma_id = EXCLUDED.turma_id,
    points = 0,
    missions_completed = 0,
    streak_days = 0,
    last_mission_date = NULL,
    updated_at = now();
END $$;
