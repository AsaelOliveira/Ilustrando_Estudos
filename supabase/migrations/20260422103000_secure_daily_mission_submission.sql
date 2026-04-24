-- Transitional deploy: create the safe RPC while keeping existing write policies
-- so the currently deployed frontend keeps working until the new frontend is live.

CREATE OR REPLACE FUNCTION public.submit_daily_mission(
  p_turma_id TEXT,
  p_question_ids TEXT[],
  p_answers TEXT[],
  p_time_spent_seconds INTEGER DEFAULT NULL,
  p_anti_cheat_flags JSONB DEFAULT '{"flags":[]}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today DATE := (timezone('America/Sao_Paulo', now()))::date;
  v_previous DATE := v_today - 1;
  v_profile_turma_id TEXT;
  v_effective_turma_id TEXT;
  v_study_content JSONB := '[]'::jsonb;
  v_scoring JSONB := '{}'::jsonb;
  v_expected_count INTEGER := COALESCE(array_length(p_question_ids, 1), 0);
  v_found_count INTEGER := 0;
  v_correct_answers INTEGER := 0;
  v_easy_correct INTEGER := 0;
  v_medium_correct INTEGER := 0;
  v_hard_correct INTEGER := 0;
  v_base_points INTEGER := 0;
  v_fair_play_bonus INTEGER := 0;
  v_streak_bonus INTEGER := 0;
  v_total_points INTEGER := 0;
  v_flags_count INTEGER := 0;
  v_easy_points INTEGER := 1;
  v_medium_points INTEGER := 2;
  v_hard_points INTEGER := 3;
  v_config_fair_play_bonus INTEGER := 1;
  v_existing_points INTEGER := 0;
  v_existing_missions_completed INTEGER := 0;
  v_existing_streak_days INTEGER := 0;
  v_valid_streak_days INTEGER := 0;
  v_next_streak_days INTEGER := 1;
  v_last_mission_date DATE;
  v_existing_attempt RECORD;
  v_inserted_attempt_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF v_expected_count = 0 THEN
    RAISE EXCEPTION 'Nenhuma questão foi enviada para a missão.';
  END IF;

  IF v_expected_count <> COALESCE(array_length(p_answers, 1), 0) THEN
    RAISE EXCEPTION 'Questões e respostas da missão estão inconsistentes.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_question_ids) AS question_id
    GROUP BY question_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'A missão diária recebeu questões duplicadas.';
  END IF;

  SELECT turma_id
  INTO v_profile_turma_id
  FROM public.profiles
  WHERE user_id = v_user_id;

  v_effective_turma_id := COALESCE(NULLIF(v_profile_turma_id, ''), NULLIF(p_turma_id, ''));

  IF v_effective_turma_id IS NULL THEN
    RAISE EXCEPTION 'Turma do usuário não encontrada.';
  END IF;

  SELECT value::jsonb
  INTO v_study_content
  FROM public.app_settings
  WHERE key = 'study_content';

  IF v_study_content IS NULL OR jsonb_typeof(v_study_content) <> 'array' THEN
    RAISE EXCEPTION 'O conteúdo da missão diária não está configurado.';
  END IF;

  SELECT value::jsonb
  INTO v_scoring
  FROM public.app_settings
  WHERE key = 'mission_scoring';

  IF v_scoring IS NOT NULL THEN
    v_easy_points := GREATEST(0, COALESCE((v_scoring ->> 'easyPoints')::INTEGER, v_easy_points));
    v_medium_points := GREATEST(0, COALESCE((v_scoring ->> 'mediumPoints')::INTEGER, v_medium_points));
    v_hard_points := GREATEST(0, COALESCE((v_scoring ->> 'hardPoints')::INTEGER, v_hard_points));
    v_config_fair_play_bonus := GREATEST(0, COALESCE((v_scoring ->> 'fairPlayBonus')::INTEGER, v_config_fair_play_bonus));
  END IF;

  WITH selected_input AS (
    SELECT
      ids.question_id,
      COALESCE(ans.answer, '') AS answer,
      ids.ord
    FROM unnest(p_question_ids) WITH ORDINALITY AS ids(question_id, ord)
    JOIN unnest(p_answers) WITH ORDINALITY AS ans(answer, ord)
      USING (ord)
  ),
  question_bank AS (
    SELECT
      question ->> 'id' AS question_id,
      question ->> 'respostaCorreta' AS resposta_correta,
      question ->> 'dificuldade' AS dificuldade
    FROM jsonb_array_elements(v_study_content) AS tema
    CROSS JOIN LATERAL jsonb_array_elements(
      COALESCE(tema -> 'exercicios', '[]'::jsonb) || COALESCE(tema -> 'simulado', '[]'::jsonb)
    ) AS question
    WHERE tema ->> 'turmaId' = v_effective_turma_id
  ),
  selected_questions AS (
    SELECT
      input.question_id,
      input.answer,
      bank.resposta_correta,
      bank.dificuldade
    FROM selected_input AS input
    JOIN question_bank AS bank
      ON bank.question_id = input.question_id
  )
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(CASE WHEN answer = resposta_correta THEN 1 ELSE 0 END), 0)::INTEGER,
    COALESCE(SUM(CASE WHEN answer = resposta_correta AND dificuldade = 'facil' THEN 1 ELSE 0 END), 0)::INTEGER,
    COALESCE(SUM(CASE WHEN answer = resposta_correta AND dificuldade = 'medio' THEN 1 ELSE 0 END), 0)::INTEGER,
    COALESCE(SUM(CASE WHEN answer = resposta_correta AND dificuldade = 'dificil' THEN 1 ELSE 0 END), 0)::INTEGER
  INTO
    v_found_count,
    v_correct_answers,
    v_easy_correct,
    v_medium_correct,
    v_hard_correct
  FROM selected_questions;

  IF v_found_count <> v_expected_count THEN
    RAISE EXCEPTION 'A missão diária recebeu questões inválidas ou fora da turma do aluno.';
  END IF;

  v_base_points :=
    (v_easy_correct * v_easy_points) +
    (v_medium_correct * v_medium_points) +
    (v_hard_correct * v_hard_points);

  v_flags_count := COALESCE(jsonb_array_length(COALESCE(p_anti_cheat_flags -> 'flags', '[]'::jsonb)), 0);
  v_fair_play_bonus := CASE WHEN v_flags_count = 0 THEN v_config_fair_play_bonus ELSE 0 END;

  SELECT
    points,
    missions_completed,
    streak_days,
    last_mission_date
  INTO
    v_existing_points,
    v_existing_missions_completed,
    v_existing_streak_days,
    v_last_mission_date
  FROM public.student_scores
  WHERE user_id = v_user_id
  FOR UPDATE;

  v_valid_streak_days := CASE
    WHEN v_last_mission_date = v_today OR v_last_mission_date = v_previous THEN COALESCE(v_existing_streak_days, 0)
    ELSE 0
  END;

  v_streak_bonus := CASE
    WHEN v_valid_streak_days >= 7 THEN 5
    WHEN v_valid_streak_days >= 5 THEN 3
    WHEN v_valid_streak_days >= 3 THEN 2
    ELSE 0
  END;

  v_total_points := v_base_points + v_fair_play_bonus + v_streak_bonus;

  INSERT INTO public.mission_attempts (
    user_id,
    mission_date,
    turma_id,
    score,
    total_questions,
    correct_answers,
    time_spent_seconds,
    anti_cheat_flags
  )
  VALUES (
    v_user_id,
    v_today,
    v_effective_turma_id,
    v_total_points,
    v_expected_count,
    v_correct_answers,
    GREATEST(0, LEAST(COALESCE(p_time_spent_seconds, 0), 3600)),
    COALESCE(p_anti_cheat_flags, '{"flags":[]}'::jsonb)
  )
  ON CONFLICT (user_id, mission_date) DO NOTHING
  RETURNING id INTO v_inserted_attempt_id;

  IF v_inserted_attempt_id IS NULL THEN
    SELECT *
    INTO v_existing_attempt
    FROM public.mission_attempts
    WHERE user_id = v_user_id
      AND mission_date = v_today;

    RETURN jsonb_build_object(
      'alreadyRecorded', true,
      'message', 'Sua missão de hoje já estava registrada. Os pontos não foram somados novamente.',
      'score', COALESCE(v_existing_attempt.score, 0),
      'correctAnswers', COALESCE(v_existing_attempt.correct_answers, 0),
      'totalQuestions', COALESCE(v_existing_attempt.total_questions, v_expected_count),
      'streakDaysAfter', COALESCE(v_existing_streak_days, 0)
    );
  END IF;

  v_next_streak_days := CASE
    WHEN v_last_mission_date = v_previous THEN COALESCE(v_existing_streak_days, 0) + 1
    ELSE 1
  END;

  INSERT INTO public.student_scores (
    user_id,
    turma_id,
    points,
    missions_completed,
    streak_days,
    last_mission_date
  )
  VALUES (
    v_user_id,
    v_effective_turma_id,
    v_total_points,
    1,
    v_next_streak_days,
    v_today
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    turma_id = EXCLUDED.turma_id,
    points = public.student_scores.points + EXCLUDED.points,
    missions_completed = public.student_scores.missions_completed + 1,
    streak_days = EXCLUDED.streak_days,
    last_mission_date = EXCLUDED.last_mission_date,
    updated_at = now();

  RETURN jsonb_build_object(
    'alreadyRecorded', false,
    'message', 'Pontuação registrada com sucesso no ranking.',
    'score', v_total_points,
    'correctAnswers', v_correct_answers,
    'totalQuestions', v_expected_count,
    'easyCorrect', v_easy_correct,
    'mediumCorrect', v_medium_correct,
    'hardCorrect', v_hard_correct,
    'basePoints', v_base_points,
    'fairPlayBonus', v_fair_play_bonus,
    'streakBonus', v_streak_bonus,
    'streakDaysAfter', v_next_streak_days
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_daily_mission(TEXT, TEXT[], TEXT[], INTEGER, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_daily_mission(TEXT, TEXT[], TEXT[], INTEGER, JSONB) TO authenticated;
