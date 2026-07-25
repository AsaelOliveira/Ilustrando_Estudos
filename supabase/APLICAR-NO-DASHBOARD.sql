-- ============================================================
-- APLICAR MANUALMENTE NO SUPABASE DASHBOARD > SQL EDITOR
-- Cola tudo de uma vez e clica em RUN. É aditivo, não mexe em nada existente.
-- ============================================================

-- ============ 1/2: Caixinha de sugestões ============
-- Caixinha de sugestões dos alunos.
-- ADITIVO: cria uma tabela nova, não altera nem remove nada existente.
-- Custo desprezível no free tier (linhas de texto curtas).

CREATE TABLE public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 3 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para o admin listar as mais recentes sem custo
CREATE INDEX suggestions_created_at_idx ON public.suggestions (created_at DESC);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Aluno autenticado envia a própria sugestão
CREATE POLICY "Alunos enviam suas sugestões" ON public.suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Aluno vê apenas as próprias sugestões
CREATE POLICY "Aluno ve as proprias sugestões" ON public.suggestions
  FOR SELECT USING (auth.uid() = user_id);

-- Admin lê todas (para triagem no painel)
CREATE POLICY "Admins veem todas as sugestões" ON public.suggestions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ============ 2/2: Corrida de Sinapses ============
-- Corrida de Sinapses: minijogo em tempo real com os avatares dos alunos.
-- ADITIVO: cria duas tabelas novas, não altera nem remove nada existente.
-- Custo: 1 linha por corrida + 1 por jogador (2-6). Progresso = poucos updates por partida.

CREATE TABLE public.races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,                -- código curto para os colegas entrarem
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turma_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'racing', 'finished')),
  questions JSONB NOT NULL,                 -- snapshot das questões da corrida (definidas pelo host)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ
);

CREATE TABLE public.race_players (
  race_id UUID NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  progress INT NOT NULL DEFAULT 0,          -- acertos (avatar avança na pista)
  answers INT NOT NULL DEFAULT 0,           -- questões respondidas
  finished_at TIMESTAMPTZ,
  PRIMARY KEY (race_id, user_id)
);

CREATE INDEX race_players_race_idx ON public.race_players (race_id);
CREATE INDEX races_code_idx ON public.races (code);

ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_players ENABLE ROW LEVEL SECURITY;

-- Corridas: qualquer autenticado lê (o código é o "convite"); só o host cria/altera
CREATE POLICY "Autenticados leem corridas" ON public.races
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Aluno cria sua corrida" ON public.races
  FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host atualiza a corrida" ON public.races
  FOR UPDATE USING (auth.uid() = host_id);

-- Jogadores: autenticados leem o placar; cada um entra/atualiza só a própria linha
CREATE POLICY "Autenticados leem jogadores da corrida" ON public.race_players
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Aluno entra na corrida" ON public.race_players
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Aluno atualiza o proprio progresso" ON public.race_players
  FOR UPDATE USING (auth.uid() = user_id);

-- Realtime (mesmo padrão de student_scores e duels)
ALTER PUBLICATION supabase_realtime ADD TABLE public.races;
ALTER PUBLICATION supabase_realtime ADD TABLE public.race_players;
