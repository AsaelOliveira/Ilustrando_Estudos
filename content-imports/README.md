# Conteúdo Em Lote

Esta pasta foi organizada para receber os arquivos JSON que serão importados pelo painel admin.

## Objetivo

O foco aqui é permitir produção em escala, sem depender de edição manual tema por tema dentro do código.

## Estrutura Recomendada

- `content-imports/6ano`
- `content-imports/7ano`
- `content-imports/8ano`
- `content-imports/9ano`

Cada arquivo deve conter um tema completo, no mesmo formato aceito pelo admin.

Exemplo:

- `content-imports/6ano/port6-substantivos.json`
- `content-imports/6ano/mat6-fracoes-equivalentes.json`
- `content-imports/7ano/cien7-celulas.json`

## Padrão Pedagógico Inicial

Para evitar conteúdo raso, adote este padrão por tema:

- `4 a 6` itens de resumo
- `2 a 4` blocos de explicação
- `2 a 3` exemplos resolvidos
- `20 a 30` exercícios
- `5 a 10` questões de simulado

## Validação

Antes de importar, rode:

```bash
npm run content:validate
```

Esse comando verifica:

- JSON válido
- campos obrigatórios
- ids de tema duplicados
- ids de questões duplicados
- tipo de questão válido
- dificuldade válida
- quantidade de alternativas
- correspondência entre `respostaCorreta` e alternativas

## Fluxo Recomendado

1. Gerar temas em lote por turma e disciplina.
2. Salvar cada tema em um arquivo próprio.
3. Rodar `npm run content:validate`.
4. Importar os arquivos aprovados no painel admin.
5. Revisar visualmente uma amostra dentro do app.

## Observação Importante

Mesmo com validação estrutural, qualidade pedagógica e correção conceitual ainda precisam de cuidado na geração. A validação ajuda muito, mas não substitui um padrão rigoroso de escrita.
