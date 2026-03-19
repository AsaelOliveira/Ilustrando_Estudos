# Hospedagem do Projeto

## Objetivo

Publicar o site da escola **Ilustrando o Aprender** do jeito mais rapido, barato e pratico, sem refazer o projeto agora.

## Caminho recomendado

Para este projeto atual, a opcao mais simples e com menor custo inicial e:

- `Supabase Free` para login, banco de dados, storage e funcoes
- `Vercel Hobby` para publicar o frontend

Esse caminho aproveita a arquitetura que ja existe no projeto. Trocar tudo para outra plataforma agora seria mais lento e exigiria reescrever partes importantes do sistema.

## Custo atual estimado

Em **12 de marco de 2026**, os planos que fazem sentido para este projeto sao:

- `Supabase Free`: gratis
- `Vercel Hobby`: gratis

Observacoes:

- O `Supabase Free` permite ate `2 projetos free` por organizacao.
- O `Vercel Hobby` e gratis, mas e voltado para projeto pessoal/pequena escala.
- Se o projeto crescer bastante depois, pode ser necessario subir para plano pago.

## Quantas pessoas suporta

Para o estado atual do sistema, uma estimativa prudente e:

- `ate 100 usuarios cadastrados`: tranquilo
- `acessos nao simultaneos`: tranquilo
- `acessos simultaneos baixos a moderados`: deve funcionar bem para fase de testes e inicio de uso

Importante:

- Isso e uma **estimativa pratica**, nao uma garantia contratual.
- O limite real depende de uso de banco, imagens, funcoes, ranking em tempo real e quantidade de acessos no mesmo horario.
- Para uma escola pequena em fase inicial, o plano gratis costuma ser suficiente para validar o projeto.

## O que precisa ser criado

Voce precisa criar:

1. Uma conta no `Supabase`
2. Um projeto no `Supabase`
3. Uma conta no `Vercel`
4. Um projeto no `Vercel`

## Nomes recomendados

Use estes nomes para manter organizacao:

- Nome da organizacao/escola: `Ilustrando o Aprender`
- Nome tecnico do projeto no Supabase: `ilustrando-o-aprender-dev`
- Nome do projeto no Vercel: `ilustrando-o-aprender`

Como o sistema ainda nao esta finalizado, o ideal e comecar com ambiente de desenvolvimento:

- `ilustrando-o-aprender-dev`

Mais para frente, quando o sistema estiver mais estavel, voce pode criar:

- `ilustrando-o-aprender-prod`

## Passo a passo para hospedar

### 1. Criar o projeto no Supabase

No Supabase:

1. Crie sua conta
2. Crie um projeto novo
3. Use o nome `ilustrando-o-aprender-dev`
4. Guarde:
   - `Project URL`
   - `Publishable Key`

Esses dados vao entrar no arquivo `.env`.

## 2. Configurar o projeto local

No arquivo `.env`, os campos principais sao:

```env
VITE_SUPABASE_URL="SUA_URL_DO_SUPABASE"
VITE_SUPABASE_PUBLISHABLE_KEY="SUA_CHAVE_PUBLICA"
```

## 3. Subir o banco e as funcoes do Supabase

Este projeto ja tem pasta `supabase/` com migrations e funcao.

Voce vai precisar:

1. Instalar o `Supabase CLI`
2. Fazer login no CLI
3. Linkar o projeto
4. Rodar as migrations
5. Publicar a funcao `manage-users`

Comandos esperados:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
supabase functions deploy manage-users
```

## 4. Criar um admin real no Supabase

Isso e importante.

Hoje o projeto tinha um admin local legado para testes, mas para funcionar como site normal o ideal e ter um **admin real no Supabase**.

O admin real sera necessario para:

- criar alunos
- listar alunos
- redefinir senhas
- remover alunos

Depois da conta admin existir no Supabase, o login passa a funcionar em:

- navegador normal
- guia anonima
- Chrome
- Edge
- celular

## 5. Publicar o frontend no Vercel

No Vercel:

1. Crie sua conta
2. Importe este projeto
3. Configure as variaveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Publique

O Vercel gera uma URL publica do site.

## Fluxo final esperado

Depois de tudo configurado:

1. O admin entra no site
2. O admin cria o aluno
3. O aluno recebe `email + senha`
4. O aluno consegue entrar em qualquer navegador
5. O cadastro nao fica preso ao navegador onde foi criado

## O que nao e recomendado agora

Nao e recomendado neste momento:

- migrar para outra plataforma antes de terminar o sistema
- pagar plano caro antes de validar o uso real
- manter login baseado apenas em `localStorage`

## Quando pensar em plano pago

Vale considerar upgrade apenas se comecar a acontecer:

- muitos acessos ao mesmo tempo
- necessidade de mais armazenamento
- uso intenso de funcoes
- necessidade de mais estabilidade operacional

## Resumo curto

Melhor opcao para agora:

- `Supabase Free`
- `Vercel Hobby`
- custo inicial: `R$ 0`
- suficiente para fase atual do projeto e cerca de `100 usuarios`

## Fontes oficiais consultadas

Precos e limites podem mudar. Esta recomendacao foi baseada nas paginas oficiais consultadas em **12 de marco de 2026**:

- Supabase billing: https://supabase.com/docs/guides/platform/billing-on-supabase
- Vercel pricing: https://vercel.com/pricing
- Vercel Hobby: https://vercel.com/docs/plans/hobby
