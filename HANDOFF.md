# HANDOFF — Redesign da plataforma "Ilustrando Estudos"

> Retomar sessão com este arquivo. Data: 2026-07-24.
> **Atualizado: 2026-07-25 — redesign visual "moderno" IMPLEMENTADO e PUBLICADO (push para `main`, commit `3e48db8`, repo AsaelOliveira/Ilustrando_Estudos → Cloudflare Pages).**
> **Importante:** as migrations `suggestions` + `races` foram aplicadas manualmente no Supabase (produção) via SQL Editor — já estão ativas.

## Contexto

Professor (dono do projeto) quer dar uma cara nova à plataforma educacional gamificada que os alunos do 6º–9º ano **já usam em produção** (Cloudflare Pages + Supabase free tier, sem orçamento). Esta pasta `V2` é uma cópia local para editar e testar antes de publicar.

## REGRA DE OURO (crucial, repetida pelo dono)

**Não apagar nem resetar nada.** Alunos já têm perfis, pontos, compras de avatar e progresso. Toda mudança deve ser **aditiva**. Dados intocáveis:

- Tabelas: `student_scores` (ranking vivo), `mission_attempts`, `duels`, `activity_results`
- Colunas de `profiles`: `avatar_unlocks`, `avatar_shop_spent`, `avatar_style`, `avatar_url` (compras dos alunos)
- `app_settings`: `study_content` (todo o conteúdo pedagógico), `custom_avatar_catalog`
- Nada de migrations destrutivas; localStorage só tem preferências voláteis (ok mexer)

## Decisões do dono até aqui

1. **Visual primeiro** (prioridade de implementação). ✅ FEITO (ver "Estado dos arquivos").
2. **Direção visual: ESCOLHIDA = "moderno"** (base `mockups-visuais/moderno.html`), com exigências: sem coruja (parecia cópia do Duolingo); logo da escola + mascote próprio (placeholder criado, dono vai desenhar o definitivo); **modo claro E escuro** (padrão = seguir o sistema do aparelho); **cores personalizáveis pelo aluno** (5 accents, se não pesasse — foi feito com CSS vars, ~2 KB, zero custo); **foco total em mobile** (alunos usam celular iOS/Android, não tablet).
3. **Avatares**: manter os atuais (DiceBear) **E** criar uma nova linha de **sprites 2D próprios** para futuros minijogos (minijogos ainda indefinidos). Eliminar dependência do `api.dicebear.com` é desejável mas não urgente.
4. Quer depois: sistema de progressão melhor (níveis/conquistas) e mais conteúdo nos temas vazios (7º–9º ano têm poucos temas importados).
5. **Supabase é COMPARTILHADO com produção** mesmo no dev local — máximo cuidado com qualquer write (o redesign não fez nenhum; preferências de tema ficam em localStorage de propósito).

## Achados técnicos (da exploração)

- Stack: React 18 + Vite + Tailwind + shadcn/ui + Supabase. Dev: `npm run dev` (usa `scripts/dev-proxy.cjs`).
- Identidade atual: template Lovable genérico (verde `153 100% 28%`, blobs, glass, fonte Outfit). `src/App.css` é boilerplate Vite puro. `Layout.tsx:176` tem sombra roxa fora da paleta; várias páginas com cores hardcoded quebram o dark mode (ex: `PerfilPage.tsx` emerald/`#ffffff`).
- SVGs com identidade já existentes e subaproveitados: `public/Knigth.svg`, `public/Duels.svg`, `public/Brasao.svg`.
- Avatares: imagens da API externa DiceBear; loja compra com "Sinapses" (moeda). Fórmula: `points + missions_completed*10 + streak_days*3 − avatar_shop_spent` (`src/lib/avatar-system.ts:124` + `Layout.tsx:95`).
- **Sistema de RPG completo mas desligado** em `src/lib/avatar-system.ts`: battle pass 30 níveis (nível = pontos/180), raridades, metas. Nada importa esse arquivo — pode ser reativado para progressão real **sem mexer no banco** (níveis derivados de pontos existentes = retroativo para todos).
- **Dado falso**: "desempenho por disciplina" no Dashboard é hash aleatório (`DashboardPage.tsx:75-77`). Trocar por dados reais de `activity_results`.
- Páginas stub: `ModoProvaPage.tsx`, `FavoritosPage.tsx` (anunciadas na nav sem funcionalidade). `Index.tsx` é código morto.
- Conteúdo: 457 JSONs em `content-imports/` (6º ano = 227, 7º = 50, 8º = 90, 9º = 90) → importados via AdminPage para `app_settings.study_content` + tabelas `content_*`. Temas "vazios" = falta de importação, não bug.
- Testes: vitest configurado mas cobertura zero (só `src/test/example.test.ts` com `expect(true)`). Cuidado redobrado ao mudar.
- Encoding quebrado (ISO-8859-1) em `avatar-system.ts` e `mission-scoring.ts` — preservar/corrigir com cuidado ao editar.
- Edge functions: `manage-users`, `self-register`. Já houve reset de plataforma antes (`20260316170000_reset_platform_preserve_admins.sql`) — ter cautela extra.

## Próximos passos (ordem)

1. ~~Perguntar ao dono qual maquete ele escolheu~~ → escolheu "moderno" com ajustes (sem coruja, claro+escuro, accents, mobile-first). ✅
2. ~~Implementar tema~~ → ✅ feito. Falta só o dono revisar/aprovar visualmente e então publicar (build + deploy Cloudflare Pages).
3. **Ideia anotada — minijogo "Mão Rápida" ⚡ (pedido do dono em 2026-07-25, para depois)**: sala com código (até ~8 alunos), desafios de reação em tempo real (conta mental / completar palavra / resposta mais rápida), quem acerta primeiro pontua, erro congela 2s, placar ao vivo. **Zero tabelas novas** — só Supabase Realtime broadcast/presence (não conta como escrita); desafios gerados no aparelho ou vindos de `study_content`. Variante futura da Corrida: pontuação por acerto + velocidade (estilo Kahoot). Decisão pendente: tipo de desafio (contas / matéria / misto).
4. Depois: ativar progressão por níveis (reativar lógica de `avatar-system.ts` como camada derivada, sem migration destrutiva).
5. Depois: sprites 2D próprios para avatares/minijogos (assets em `public/avatars/`), corrigir Dashboard fake, mascote definitivo (substituir `public/mascote.svg`).
6. Só publicar depois de testar local (`npm run build` + revisão); deploy Cloudflare Pages.

## O que foi implementado no redesign (2026-07-25)

- **Tokens** (`src/index.css`, `tailwind.config.ts`): paleta da maquete (verde/azul/amarelo/roxo/rosa/laranja com pares de sombra 3D) em claro **e** escuro; tokens novos `brand-*`, `sinapses`, `xp`, `streak`, `rank-*`; classes `.card-flat`, `.btn-3d` (+variantes de cor), `.progress-3d`; classes antigas (`.glass-card`, `.bento-card`, `.medal-*`…) mantidas e reestilizadas. Fonte **Nunito** (Outfit/Inter/Figtree/Space Grotesk removidas). `src/App.css` (morto) e `src/components/BackgroundBlobs.tsx` (substituído por `BackgroundConfetti.tsx`) apagados.
- **Claro/escuro**: `App.tsx` agora `defaultTheme="system"` (next-themes, mesma storageKey). Toggle continua no Layout/menu.
- **Cor do app (aluno)**: `src/lib/accent-theme.ts` + `src/components/AccentPicker.tsx` — 5 accents (verde padrão/azul/roxo/rosa/laranja) via `data-accent` no `<html>`, gravado em **localStorage `ilustrando-accent`** (por aparelho, zero Supabase). Picker embutido na PerfilPage (seção "Aparência").
- **Marca**: `BrandMark` corrigido p/ dark (chip claro); **mascote placeholder** `public/mascote.svg` (estrela — trocar só o arquivo depois) + `src/components/MascotMark.tsx`.
- **Layout** (`src/components/Layout.tsx` reescrito): **bottom tab bar mobile** (Início, Estudar, Progresso, Competição + Menu em `Drawer` com Duelo/Loja/Admin/Sair/ModeToggle), safe-area iOS/Android, Sinapses sempre visível no header mobile, `min-h-dvh`, badges rose→`brand-pink`, sombras roxas removidas. Desktop mantém nav no header (≥xl).
- **Páginas**: todas passadas (Login, Home, Sobre, AppHome, Dashboard, Turmas, Disciplinas, Temas, Aula, Competição, Duelo, Perfil+loja, Favoritos, ModoProva, Admin e Acompanhamento — estas duas só dark-mode, sem redesenho). `discipline-visuals.ts` reescrito com tokens brand (API idêntica). **Nenhuma lógica/dado/query alterada.**
- **Verificação**: `tsc --noEmit` 0 erros; `npm run build` ok; capturas Playwright em `verificacao-visual/` (públicas × iPhone/Android/desktop × claro/escuro × accent). Script: `node scripts/verificar-visual.cjs` (telas autenticadas: exportar `ILUSTRANDO_TEST_EMAIL`/`ILUSTRANDO_TEST_SENHA` da conta de teste).
- **Ajuste de contraste (feedback do dono, 2026-07-25)**: fundo do claro ficou azul-acinzentado (`215 35% 92%`) para os cards brancos se destacarem; no escuro o fundo escureceu (`223 38% 7%`) e os cards clarearam (`221 26% 16%`). Novo token `--avatar-bg` (classe `bg-avatar`) — círculo azul atrás de todos os avatares (`SimpleProfileAvatar`), pois alguns são brancos/transparentes. `meta theme-color` atualizado.
- **Ajuste de legibilidade 2 (feedback do dono, 2026-07-25)**: novo token `--frame` (classe `border-frame`) — borda forte para superfícies interativas. Alternativas das questões (`AulaPage`) ganharam frame real (`border-2 border-frame` + sombra 3D `--frame`), chip de letra A/B/C/D com fundo+borda, input dissertativo com `border-2`. Preview do Perfil: avatar + nome do aluno agora dentro de um frame (`border-frame bg-background shadow-card`). `muted-foreground` do dark clareado (62%→68%). Capturas da aula: `node scripts/capturar-aula.cjs` (mesmas envs de conta de teste).
- **Caixinha de sugestões (2026-07-25)**: nova tabela `suggestions` (migration `20260725120000_add_suggestions.sql` — ADITIVA, custo desprezível) + componente `src/components/SuggestionBox.tsx` no Perfil (abaixo de "Estilo atual"). RLS: aluno insere/vê as próprias, admin lê todas (`has_role`). Tipos TS adicionados à mão em `types.ts` (mesmo formato do gerado). **ATENÇÃO: migration ainda NÃO aplicada no Supabase** — o CLI daqui não conecta (rede sem IPv6; precisa de `supabase link` com credenciais do dono). Para aplicar: colar o SQL no SQL Editor do Dashboard **ou** `npx supabase link --project-ref vzhsqbsxlvrgngnatdcu && npx supabase db push`. Enquanto não aplicar, o botão Enviar mostra toast de erro (a caixa renderiza normal). Falta: UI de triagem no AdminPage para ler as sugestões — não feita.
- **Próxima frente combinada com o dono**: melhorar o Duelo (sem remover o legacy) + nova modalidade de minijogo em tempo real usando os avatares. Ideias apresentadas em 2026-07-25 (corrida com avatares, boss cooperativo, rematch/emotes/progresso ao vivo no duelo) — aguardando escolha do dono.
- **Duelo melhorado (2026-07-25, feito)**: tela de resultado agora mostra os avatares dos dois jogadores no placar + botão **"Revanche"** (reabre a config pré-preenchida como desafio direto ao mesmo oponente; tipo `RematchTarget` + preset no `PageView`/`ConfigView` de `DuelPage.tsx`). Descoberta: a tela VS JÁ usava avatares reais (`ProfileAvatar`) — o cavaleiro só aparece em modo anônimo/aguardando. Duelo é assíncrono por schema (challenger responde, adversário depois), então "ao vivo simultâneo" não existe no legacy — por isso a Corrida cobre essa lacuna.
- **Corrida de Sinapses (2026-07-25, feita)**: minijogo em tempo real em `/app/corrida` (`src/pages/CorridaPage.tsx` + rota em `App.tsx` + itens "Corrida" no drawer e na nav desktop do `Layout.tsx`). Fluxo: criar corrida (host, snapshot de 5 questões aleatórias da turma via `useStudyContent`) ou entrar com código de 6 chars → sala de espera ao vivo → host inicia → todos respondem as mesmas questões e os avatares avançam na pista via realtime (`races`/`race_players`) → pódio com medalhas. Migration `20260725130000_add_races.sql` **ainda NÃO aplicada no Supabase** (mesmo caminho da de suggestions: SQL Editor do Dashboard). Sem concessão de pontos por enquanto (`TODO(pontos)` na página). Testada só até o lobby (criar/entrar precisa da migration aplicada) — testar fluxo completo com 2 contas após aplicar.
- **Fundo branco nos avatares (feedback do dono, 2026-07-25)**: `--avatar-bg` agora é branco/quase-branco nos dois temas (line-art transparente continua legível até no dark) + borda `border-frame` no círculo do `SimpleProfileAvatar`. Vale para header, perfil, loja, ranking, duelo e corrida (componente único). **Complemento**: os `<img>` diretos da loja (itens do catálogo custom/Florks, editor admin e chip de coleção em `PerfilPage.tsx`) também ganharam `bg-avatar` + `border-frame` — verificado em captura dark.
- **Aplicação manual das migrations**: `supabase/APLICAR-NO-DASHBOARD.sql` contém as DUAS migrations (suggestions + races) prontas para colar no SQL Editor do Dashboard de uma vez. **APLICADAS PELO DONO EM 2026-07-25** ✅ — fluxo completo da corrida testado com a conta de teste (`scripts/testar-corrida.cjs`): criar → código → sala de espera → iniciar → 5 questões → pódio. Multiplayer ainda não testado (precisa 2ª conta). Caixinha de sugestões: insert não testado ponta a ponta (mesmo padrão de RLS das races, que funcionou). **ATUALIZAÇÃO 2026-07-25: multiplayer testado e aprovado** ✅ — 2ª conta de teste `aluno2@ilustrando`; `scripts/testar-corrida-multi.cjs` rodou 2 janelas (aluno cria, aluno2 entra com código, ambos correm em ritmos diferentes): sala de espera com 2 corredores ao vivo, pistas sincronizadas com nomes/raiças corretas, mesmas questões para ambos. Sugestão do aluno2 gravada com sucesso (RLS ok — há 1 linha de teste em `suggestions`).
- **Corrida v2 (feedback do dono, 2026-07-25)**: página reescrita com cara de jogo — lobby com hero animado, **config da sala** (matéria da turma / dificuldade / nº de perguntas 3-10, aplicada na montagem das questões, sem mudança de schema), sala de espera com código toca-para-copiar e raias coloridas por jogador, pista com raias maiores + chegada quadriculada + coroa no líder + pulo animado, combo "🔥 X seguidos", pips de progresso, e **pódio físico** (1º mais alto com coroa, 2º/3º ao lado, demais em lista). Bug do pódio solo (mostrava 2º) corrigido. Fluxo solo re-testado ok.
- **Fix bônus**: `scripts/dev-proxy.cjs` quebrava no Windows (`spawn EINVAL` ao executar `vite.cmd` — CVE-2024-27980); agora spawna `node node_modules/vite/bin/vite.js`.

## Estado dos arquivos

- **PUBLICADO EM PRODUÇÃO (2026-07-25)** — commit `3e48db8` na `main`. Auditoria mobile (`scripts/auditar-mobile.cjs`, 12 páginas a 390px) passou com 0 overflow antes do deploy; `tsc` 0 erros; build ok. As deleções antigas de `content-imports/6ano/Passados/` ficaram propositalmente FORA do commit (estavam na working tree desde antes; revisar depois se eram intencionais).
- Única coisa criada antes do redesign: pasta `mockups-visuais/` (3 HTML + 3 PNG + `capturar.cjs` — para recapturar: `node mockups-visuais/capturar.cjs`).
- Playwright Chromium instalado globalmente (`AppData/Local/ms-playwright`) — usado nas capturas de `verificacao-visual/` (pasta no .gitignore, não sobe pro repo).
- Próxima revisão do dono já pode ser feita em produção.
