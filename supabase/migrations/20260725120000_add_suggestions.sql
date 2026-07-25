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
