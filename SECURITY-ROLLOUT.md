# Rollout de seguranca sem perder progresso

Este repositorio ja foi ajustado localmente para reduzir acoplamento com acessos mais permissivos do banco. O passo seguinte, quando for seguro mexer no projeto Supabase compartilhado, e endurecer as policies sem apagar dados.

## Objetivo

- Nao apagar progresso existente
- Nao recriar usuarios
- Nao mudar esquema de tabelas de forma destrutiva
- Fechar apenas escrita/leitura indevida

## Ordem recomendada

1. Publicar primeiro o frontend local ajustado.
2. Validar em homologacao ou em uma janela curta de baixo uso.
3. Aplicar mudancas de policy no Supabase em etapas pequenas.
4. Validar login, missao diaria, duelo, painel admin e autocadastro.

## Mudancas de banco recomendadas

### 1. `student_scores`

Remover escrita direta por aluno.

- Revogar `Users can update own scores`
- Se ainda existir fluxo legitimo de insert direto, manter so o minimo necessario
- Concentrar alteracao de pontos em RPC segura

Impacto esperado:
- Nenhum dado e apagado
- Ranking e pontos existentes permanecem

### 2. `duels`

Manter leitura e criacao necessarias para o app, mas remover update direto amplo.

- Remover policy antiga de `UPDATE` em `duels`
- Deixar aceite/cancelamento/resposta apenas pelas RPCs:
  - `accept_duel`
  - `cancel_duel`
  - `submit_duel_attempt`

Impacto esperado:
- Duelos existentes continuam no banco
- Fluxo novo passa pelas regras seguras ja existentes

### 3. `app_settings`

Separar o que e publico do que e administrativo.

- Fechar leitura ampla de `app_settings`
- Permitir ao aluno apenas chaves estritamente necessarias
- Tirar `student_signup_roster` do alcance de usuario comum

Impacto esperado:
- Conteudo e configuracoes continuam existindo
- So muda quem pode ler cada chave

### 4. `profiles`

Restringir leitura e update de campos sensiveis.

- Evitar expor `login_identifier` para consultas gerais
- Limitar update do proprio perfil a campos realmente editaveis
- Preservar leitura do proprio perfil

Impacto esperado:
- Perfis continuam intactos
- So muda a superficie exposta

## Checklist de validacao

- Aluno consegue fazer login
- Aluno consegue jogar missao diaria
- Aluno consegue criar duelo
- Aluno consegue aceitar duelo por codigo
- Resultado do duelo continua fechando
- Admin consegue listar usuarios
- Admin consegue redefinir senha
- Admin consegue gerenciar conteudo
- Autocadastro continua funcionando

## Rollback

Se alguma etapa falhar, reverta apenas a migration daquela etapa. Como o plano acima nao remove dados nem altera ids, o rollback tende a ser simples.
