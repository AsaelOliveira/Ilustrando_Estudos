-- ============================================================
-- Sistema de Duelos — Batalhas de Perguntas e Respostas
-- Modo assíncrono (estilo Perguntados):
--   1. Desafiante cria e responde primeiro
--   2. Adversário aceita e responde depois
--   3. Pontos são concedidos automaticamente
-- Data: 2026-03-16
-- ============================================================

-- Limpar tabelas anteriores caso existam (segurança para migração limpa)
DROP TABLE IF EXISTS public.duel_sessions CASCADE;
DROP TABLE IF EXISTS public.duel_challenges CASCADE;

-- Tabela unificada de duelos
CREATE TABLE public.duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- === Participantes ===
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenged_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- === Modo e Visibilidade ===
  -- modo: 'aberto' (nome visível) ou 'anonimo' (identidade oculta)
  mode TEXT NOT NULL DEFAULT 'aberto' CHECK (mode IN ('aberto', 'anonimo')),
  -- visibilidade: 'publico' (qualquer um aceita) ou 'privado' (futuro: convite direto)
  visibility TEXT NOT NULL DEFAULT 'publico' CHECK (visibility IN ('publico', 'privado')),

  -- === Status do Duelo ===
  -- aberto:      desafiante está respondendo
  -- aguardando:  desafiante finalizou, aguardando adversário
  -- em_batalha:  adversário está respondendo
  -- concluido:   ambos finalizaram
  -- expirado:    ninguém aceitou dentro do prazo
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (
    status IN ('aberto', 'aguardando', 'em_batalha', 'concluido', 'expirado')
  ),

  -- === Identidade no Lobby ===
  challenger_display_name TEXT NOT NULL,
  challenger_display_turma TEXT,

  -- === Configuração das Questões ===
  question_ids JSONB NOT NULL DEFAULT '[]',
  turma_id TEXT NOT NULL,
  discipline_id TEXT,       -- NULL = todas as disciplinas
  interclass BOOLEAN NOT NULL DEFAULT false,
  num_questions INTEGER NOT NULL DEFAULT 5,
  time_limit INTEGER NOT NULL DEFAULT 180,  -- segundos

  -- === Respostas do Desafiante ===
  challenger_answers JSONB,
  challenger_score INTEGER NOT NULL DEFAULT 0,
  challenger_time_seconds INTEGER,
  challenger_anti_cheat JSONB DEFAULT '[]',

  -- === Respostas do Desafiado ===
  challenged_answers JSONB,
  challenged_score INTEGER NOT NULL DEFAULT 0,
  challenged_time_seconds INTEGER,
  challenged_anti_cheat JSONB DEFAULT '[]',

  -- === Resultado ===
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- === Datas ===
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  challenger_finished_at TIMESTAMPTZ,
  challenged_finished_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Índices para consultas frequentes
CREATE INDEX idx_duels_status ON public.duels(status);
CREATE INDEX idx_duels_challenger ON public.duels(challenger_id);
CREATE INDEX idx_duels_challenged ON public.duels(challenged_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ver duelos (necessário para o lobby)
CREATE POLICY "Autenticados podem ver duelos"
  ON public.duels FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Criador pode inserir seu duelo
CREATE POLICY "Criador pode inserir duelo"
  ON public.duels FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

-- Participantes podem atualizar (enviar respostas, aceitar)
CREATE POLICY "Participantes podem atualizar duelo"
  ON public.duels FOR UPDATE
  USING (
    auth.uid() = challenger_id
    OR auth.uid() = challenged_id
    OR (challenged_id IS NULL AND status = 'aguardando')
  );

-- Admins têm acesso total
CREATE POLICY "Admins gerenciam todos os duelos"
  ON public.duels FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.duels;

-- ============================================================
-- Função: finalizar duelo e conceder pontos ao vencedor
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_duel(p_duel_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenger_id UUID;
  v_challenged_id UUID;
  v_challenger_score INTEGER;
  v_challenged_score INTEGER;
  v_winner_id UUID;
  v_rows INTEGER;
BEGIN
  -- Verificar se o duelo está pronto para finalização
  SELECT challenger_id, challenged_id, challenger_score, challenged_score
  INTO v_challenger_id, v_challenged_id, v_challenger_score, v_challenged_score
  FROM duels
  WHERE id = p_duel_id
    AND status = 'em_batalha'
    AND challenger_answers IS NOT NULL
    AND challenged_answers IS NOT NULL;

  IF NOT FOUND THEN RETURN; END IF;

  -- Determinar vencedor
  IF v_challenger_score > v_challenged_score THEN
    v_winner_id := v_challenger_id;
  ELSIF v_challenged_score > v_challenger_score THEN
    v_winner_id := v_challenged_id;
  ELSE
    v_winner_id := NULL;
  END IF;

  -- Marcar como concluído (proteção contra chamadas duplas)
  UPDATE duels SET
    status = 'concluido',
    winner_id = v_winner_id
  WHERE id = p_duel_id AND status = 'em_batalha';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN; END IF;

  -- Conceder pontos de ranking
  IF v_winner_id IS NOT NULL THEN
    -- Vencedor: +15 pontos
    INSERT INTO student_scores (user_id, turma_id, points, missions_completed, streak_days)
    SELECT v_winner_id, COALESCE(p.turma_id, '6ano'), 15, 0, 0
    FROM profiles p WHERE p.user_id = v_winner_id
    ON CONFLICT (user_id) DO UPDATE SET
      points = student_scores.points + 15,
      updated_at = now();
  ELSE
    -- Empate: ambos +7 pontos
    INSERT INTO student_scores (user_id, turma_id, points, missions_completed, streak_days)
    SELECT v_challenger_id, COALESCE(p.turma_id, '6ano'), 7, 0, 0
    FROM profiles p WHERE p.user_id = v_challenger_id
    ON CONFLICT (user_id) DO UPDATE SET
      points = student_scores.points + 7,
      updated_at = now();

    INSERT INTO student_scores (user_id, turma_id, points, missions_completed, streak_days)
    SELECT v_challenged_id, COALESCE(p.turma_id, '6ano'), 7, 0, 0
    FROM profiles p WHERE p.user_id = v_challenged_id
    ON CONFLICT (user_id) DO UPDATE SET
      points = student_scores.points + 7,
      updated_at = now();
  END IF;
END;
$$;
