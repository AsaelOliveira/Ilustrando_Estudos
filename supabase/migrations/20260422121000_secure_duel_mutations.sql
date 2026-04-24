-- Transitional deploy: create safe duel mutation RPCs while keeping the existing
-- update policy so the currently deployed frontend keeps working during rollout.

CREATE OR REPLACE FUNCTION public.accept_duel(p_duel_id UUID)
RETURNS public.duels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_duel public.duels%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  SELECT *
  INTO v_duel
  FROM public.duels
  WHERE id = p_duel_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Duelo nao encontrado.';
  END IF;

  IF v_duel.status <> 'aguardando' THEN
    RAISE EXCEPTION 'Este duelo nao esta disponivel para aceite.';
  END IF;

  IF v_duel.expires_at <= now() THEN
    RAISE EXCEPTION 'Este duelo expirou.';
  END IF;

  IF v_duel.challenger_id = v_user_id THEN
    RAISE EXCEPTION 'Voce nao pode aceitar o proprio duelo.';
  END IF;

  IF v_duel.challenged_id IS NOT NULL AND v_duel.challenged_id <> v_user_id THEN
    RAISE EXCEPTION 'Este duelo foi reservado para outro aluno.';
  END IF;

  UPDATE public.duels
  SET
    challenged_id = v_user_id,
    status = 'em_batalha'
  WHERE id = p_duel_id
  RETURNING * INTO v_duel;

  RETURN v_duel;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_duel(p_duel_id UUID)
RETURNS public.duels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_duel public.duels%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  UPDATE public.duels
  SET status = 'expirado'
  WHERE id = p_duel_id
    AND challenger_id = v_user_id
    AND status IN ('aberto', 'aguardando')
  RETURNING * INTO v_duel;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nao foi possivel cancelar este duelo.';
  END IF;

  RETURN v_duel;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_duel_attempt(
  p_duel_id UUID,
  p_answers TEXT[],
  p_time_spent_seconds INTEGER DEFAULT NULL,
  p_anti_cheat_flags JSONB DEFAULT '[]'::jsonb
)
RETURNS public.duels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_duel public.duels%ROWTYPE;
  v_study_content JSONB := '[]'::jsonb;
  v_question_ids TEXT[] := ARRAY[]::TEXT[];
  v_expected_count INTEGER := 0;
  v_found_count INTEGER := 0;
  v_score INTEGER := 0;
  v_elapsed INTEGER := GREATEST(0, LEAST(COALESCE(p_time_spent_seconds, 0), 7200));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  SELECT *
  INTO v_duel
  FROM public.duels
  WHERE id = p_duel_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Duelo nao encontrado.';
  END IF;

  SELECT COALESCE(array_agg(question_id), ARRAY[]::TEXT[])
  INTO v_question_ids
  FROM jsonb_array_elements_text(v_duel.question_ids) AS ids(question_id);

  v_expected_count := COALESCE(array_length(v_question_ids, 1), 0);

  IF v_expected_count = 0 THEN
    RAISE EXCEPTION 'O duelo nao possui questoes configuradas.';
  END IF;

  IF v_expected_count <> COALESCE(array_length(p_answers, 1), 0) THEN
    RAISE EXCEPTION 'Questoes e respostas do duelo estao inconsistentes.';
  END IF;

  IF v_user_id = v_duel.challenger_id THEN
    IF v_duel.status <> 'aberto' THEN
      RAISE EXCEPTION 'O desafiante nao pode mais enviar respostas para este duelo.';
    END IF;
  ELSIF v_user_id = v_duel.challenged_id THEN
    IF v_duel.status <> 'em_batalha' THEN
      RAISE EXCEPTION 'O duelo nao esta liberado para a resposta do adversario.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Voce nao participa deste duelo.';
  END IF;

  SELECT value::jsonb
  INTO v_study_content
  FROM public.app_settings
  WHERE key = 'study_content';

  IF v_study_content IS NULL OR jsonb_typeof(v_study_content) <> 'array' THEN
    RAISE EXCEPTION 'O banco de questoes do duelo nao esta configurado.';
  END IF;

  WITH selected_input AS (
    SELECT
      ids.question_id,
      COALESCE(ans.answer, '') AS answer,
      ids.ord
    FROM unnest(v_question_ids) WITH ORDINALITY AS ids(question_id, ord)
    JOIN unnest(p_answers) WITH ORDINALITY AS ans(answer, ord)
      USING (ord)
  ),
  question_bank AS (
    SELECT
      question ->> 'id' AS question_id,
      question ->> 'respostaCorreta' AS resposta_correta
    FROM jsonb_array_elements(v_study_content) AS tema
    CROSS JOIN LATERAL jsonb_array_elements(
      COALESCE(tema -> 'exercicios', '[]'::jsonb) || COALESCE(tema -> 'simulado', '[]'::jsonb)
    ) AS question
  ),
  selected_questions AS (
    SELECT
      input.question_id,
      input.answer,
      bank.resposta_correta
    FROM selected_input AS input
    JOIN question_bank AS bank
      ON bank.question_id = input.question_id
  )
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(CASE WHEN answer = resposta_correta THEN 1 ELSE 0 END), 0)::INTEGER
  INTO
    v_found_count,
    v_score
  FROM selected_questions;

  IF v_found_count <> v_expected_count THEN
    RAISE EXCEPTION 'O duelo recebeu questoes invalidas ou desatualizadas.';
  END IF;

  IF v_user_id = v_duel.challenger_id THEN
    UPDATE public.duels
    SET
      challenger_answers = to_jsonb(p_answers),
      challenger_score = v_score,
      challenger_time_seconds = v_elapsed,
      challenger_anti_cheat = COALESCE(p_anti_cheat_flags, '[]'::jsonb),
      challenger_finished_at = now(),
      status = 'aguardando'
    WHERE id = p_duel_id
    RETURNING * INTO v_duel;
  ELSE
    UPDATE public.duels
    SET
      challenged_answers = to_jsonb(p_answers),
      challenged_score = v_score,
      challenged_time_seconds = v_elapsed,
      challenged_anti_cheat = COALESCE(p_anti_cheat_flags, '[]'::jsonb),
      challenged_finished_at = now()
    WHERE id = p_duel_id
    RETURNING * INTO v_duel;

    PERFORM public.finalize_duel(p_duel_id);

    SELECT *
    INTO v_duel
    FROM public.duels
    WHERE id = p_duel_id;
  END IF;

  RETURN v_duel;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_duel(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_duel(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_duel_attempt(UUID, TEXT[], INTEGER, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.accept_duel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_duel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_duel_attempt(UUID, TEXT[], INTEGER, JSONB) TO authenticated;
