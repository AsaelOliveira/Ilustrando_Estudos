import { pickRandomItems } from "@/lib/random";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Questao, Tema } from "@/data/content-types";

type ThemeRow = Database["public"]["Tables"]["content_themes"]["Row"];
type SummaryRow = Database["public"]["Tables"]["content_summary_items"]["Row"];
type ExplanationRow = Database["public"]["Tables"]["content_explanation_blocks"]["Row"];
type ExampleRow = Database["public"]["Tables"]["content_examples"]["Row"];
type ExampleStepRow = Database["public"]["Tables"]["content_example_steps"]["Row"];
type QuestionRow = Database["public"]["Tables"]["content_questions"]["Row"];
type QuestionOptionRow = Database["public"]["Tables"]["content_question_options"]["Row"];

export type ThemeSummary = {
  id: string;
  titulo: string;
  disciplinaId: string;
  turmaId: string;
  unidade?: string;
  resumoCount: number;
  explanationCount: number;
  exampleCount: number;
  exerciseCount: number;
  simuladoCount: number;
};

export type ContentQuestion = Questao & {
  themeId: string;
  disciplinaId: string;
  turmaId: string;
  pool: "exercicio" | "simulado";
};

type QuestionPool = "exercicio" | "simulado";

type QuestionSource = {
  question: QuestionRow;
  theme: ThemeRow;
};

const QUESTION_TYPE_VALUES = new Set(["multipla_escolha", "resposta_curta"]);
const QUESTION_DIFFICULTY_VALUES = new Set(["facil", "medio", "dificil"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function ensureStringArray(value: unknown, field: string, themeId: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`O campo "${field}" do tema "${themeId}" precisa ser uma lista de textos.`);
  }

  return value.map((item) => item.trim());
}

function mapThemeSummary(row: ThemeRow): ThemeSummary {
  return {
    id: row.id,
    titulo: row.titulo,
    disciplinaId: row.disciplina_id,
    turmaId: row.turma_id,
    unidade: row.unidade || undefined,
    resumoCount: row.summary_count,
    explanationCount: row.explanation_count,
    exampleCount: row.example_count,
    exerciseCount: row.exercise_count,
    simuladoCount: row.simulado_count,
  };
}

function shuffleInPlace<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function mapQuestionRow(
  row: QuestionRow,
  theme: ThemeRow,
  options: QuestionOptionRow[],
): ContentQuestion {
  return {
    id: row.id,
    enunciado: row.enunciado,
    tipo: row.tipo as Questao["tipo"],
    alternativas:
      row.tipo === "multipla_escolha"
        ? options
            .sort((a, b) => a.ordem - b.ordem)
            .map((option) => option.texto)
        : undefined,
    respostaCorreta: row.resposta_correta,
    explicacao: row.explicacao,
    dificuldade: row.dificuldade as Questao["dificuldade"],
    themeId: row.theme_id,
    disciplinaId: theme.disciplina_id,
    turmaId: theme.turma_id,
    pool: row.pool as QuestionPool,
  };
}

function buildTema(
  theme: ThemeRow,
  summaries: SummaryRow[],
  explanations: ExplanationRow[],
  examples: ExampleRow[],
  exampleSteps: ExampleStepRow[],
  questions: QuestionRow[],
  options: QuestionOptionRow[],
): Tema {
  const exampleStepsByExample = new Map<string, ExampleStepRow[]>();
  exampleSteps.forEach((step) => {
    const list = exampleStepsByExample.get(step.example_id) || [];
    list.push(step);
    exampleStepsByExample.set(step.example_id, list);
  });

  const optionsByQuestion = new Map<string, QuestionOptionRow[]>();
  options.forEach((option) => {
    const list = optionsByQuestion.get(option.question_id) || [];
    list.push(option);
    optionsByQuestion.set(option.question_id, list);
  });

  const mappedQuestions = questions
    .sort((a, b) => a.ordem - b.ordem)
    .map((question) => mapQuestionRow(question, theme, optionsByQuestion.get(question.id) || []));

  return {
    id: theme.id,
    titulo: theme.titulo,
    disciplinaId: theme.disciplina_id,
    turmaId: theme.turma_id,
    unidade: theme.unidade || undefined,
    resumo: summaries.sort((a, b) => a.ordem - b.ordem).map((item) => item.texto),
    explicacao: explanations
      .sort((a, b) => a.ordem - b.ordem)
      .map((block) => ({
        subtitulo: block.subtitulo,
        texto: block.texto,
        dica: block.dica || undefined,
      })),
    exemplos: examples
      .sort((a, b) => a.ordem - b.ordem)
      .map((example) => ({
        enunciado: example.enunciado,
        passos: (exampleStepsByExample.get(example.id) || [])
          .sort((a, b) => a.ordem - b.ordem)
          .map((step) => step.texto),
        resposta: example.resposta,
      })),
    exercicios: mappedQuestions.filter((question) => question.pool === "exercicio"),
    simulado: mappedQuestions.filter((question) => question.pool === "simulado"),
  };
}

async function fetchThemeRows(themeIds?: string[]) {
  let query = supabase
    .from("content_themes")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("titulo", { ascending: true });

  if (themeIds && themeIds.length > 0) {
    query = query.in("id", themeIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function fetchThemeChildren(themeIds: string[]) {
  if (themeIds.length === 0) {
    return {
      summaries: [] as SummaryRow[],
      explanations: [] as ExplanationRow[],
      examples: [] as ExampleRow[],
      exampleSteps: [] as ExampleStepRow[],
      questions: [] as QuestionRow[],
      options: [] as QuestionOptionRow[],
    };
  }

  const [
    summariesRes,
    explanationsRes,
    examplesRes,
    questionsRes,
  ] = await Promise.all([
    supabase.from("content_summary_items").select("*").in("theme_id", themeIds).order("ordem", { ascending: true }),
    supabase.from("content_explanation_blocks").select("*").in("theme_id", themeIds).order("ordem", { ascending: true }),
    supabase.from("content_examples").select("*").in("theme_id", themeIds).order("ordem", { ascending: true }),
    supabase.from("content_questions").select("*").in("theme_id", themeIds).eq("ativo", true).order("ordem", { ascending: true }),
  ]);

  if (summariesRes.error) throw summariesRes.error;
  if (explanationsRes.error) throw explanationsRes.error;
  if (examplesRes.error) throw examplesRes.error;
  if (questionsRes.error) throw questionsRes.error;

  const examples = examplesRes.data || [];
  const questions = questionsRes.data || [];

  const [stepsRes, optionsRes] = await Promise.all([
    examples.length > 0
      ? supabase.from("content_example_steps").select("*").in("example_id", examples.map((item) => item.id)).order("ordem", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    questions.length > 0
      ? supabase.from("content_question_options").select("*").in("question_id", questions.map((item) => item.id)).order("ordem", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (stepsRes.error) throw stepsRes.error;
  if (optionsRes.error) throw optionsRes.error;

  return {
    summaries: summariesRes.data || [],
    explanations: explanationsRes.data || [],
    examples,
    exampleSteps: stepsRes.data || [],
    questions,
    options: optionsRes.data || [],
  };
}

export async function listAllThemeSummaries(): Promise<ThemeSummary[]> {
  const rows = await fetchThemeRows();
  return rows.map(mapThemeSummary);
}

export async function listThemesByTurma(turmaId: string): Promise<ThemeSummary[]> {
  const { data, error } = await supabase
    .from("content_themes")
    .select("*")
    .eq("ativo", true)
    .eq("turma_id", turmaId)
    .order("ordem", { ascending: true })
    .order("titulo", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapThemeSummary);
}

export async function listThemesByDisciplina(turmaId: string, disciplinaId: string): Promise<ThemeSummary[]> {
  const { data, error } = await supabase
    .from("content_themes")
    .select("*")
    .eq("ativo", true)
    .eq("turma_id", turmaId)
    .eq("disciplina_id", disciplinaId)
    .order("ordem", { ascending: true })
    .order("titulo", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapThemeSummary);
}

export async function getThemeOverview(themeId: string): Promise<ThemeSummary | null> {
  const { data, error } = await supabase
    .from("content_themes")
    .select("*")
    .eq("id", themeId)
    .eq("ativo", true)
    .maybeSingle();

  if (error) throw error;
  return data ? mapThemeSummary(data) : null;
}

export async function getThemeContent(themeId: string): Promise<Tema | null> {
  const { data: theme, error } = await supabase
    .from("content_themes")
    .select("*")
    .eq("id", themeId)
    .eq("ativo", true)
    .maybeSingle();

  if (error) throw error;
  if (!theme) return null;

  const children = await fetchThemeChildren([theme.id]);

  return buildTema(
    theme,
    children.summaries.filter((item) => item.theme_id === theme.id),
    children.explanations.filter((item) => item.theme_id === theme.id),
    children.examples.filter((item) => item.theme_id === theme.id),
    children.exampleSteps,
    children.questions.filter((item) => item.theme_id === theme.id),
    children.options,
  );
}

export async function listAllThemeContent(): Promise<Tema[]> {
  const themes = await fetchThemeRows();
  const themeIds = themes.map((theme) => theme.id);
  const children = await fetchThemeChildren(themeIds);

  return themes.map((theme) =>
    buildTema(
      theme,
      children.summaries.filter((item) => item.theme_id === theme.id),
      children.explanations.filter((item) => item.theme_id === theme.id),
      children.examples.filter((item) => item.theme_id === theme.id),
      children.exampleSteps.filter((item) =>
        children.examples.some((example) => example.id === item.example_id && example.theme_id === theme.id),
      ),
      children.questions.filter((item) => item.theme_id === theme.id),
      children.options,
    ),
  );
}

export async function getQuestionsByIds(ids: string[]): Promise<ContentQuestion[]> {
  if (ids.length === 0) return [];

  const { data: questions, error } = await supabase
    .from("content_questions")
    .select("*")
    .in("id", ids)
    .eq("ativo", true);

  if (error) throw error;
  const questionRows = questions || [];
  if (questionRows.length === 0) return [];

  const themeIds = [...new Set(questionRows.map((question) => question.theme_id))];
  const [themes, optionsRes] = await Promise.all([
    fetchThemeRows(themeIds),
    supabase.from("content_question_options").select("*").in("question_id", questionRows.map((question) => question.id)).order("ordem", { ascending: true }),
  ]);

  if (optionsRes.error) throw optionsRes.error;

  const themeMap = new Map(themes.map((theme) => [theme.id, theme]));
  const optionsByQuestion = new Map<string, QuestionOptionRow[]>();

  (optionsRes.data || []).forEach((option) => {
    const list = optionsByQuestion.get(option.question_id) || [];
    list.push(option);
    optionsByQuestion.set(option.question_id, list);
  });

  const questionMap = new Map(
    questionRows.map((question) => {
      const theme = themeMap.get(question.theme_id);
      if (!theme) return [question.id, null] as const;
      return [question.id, mapQuestionRow(question, theme, optionsByQuestion.get(question.id) || [])] as const;
    }),
  );

  return ids
    .map((id) => questionMap.get(id) || null)
    .filter((question): question is ContentQuestion => Boolean(question));
}

export async function getQuestionsForMission({
  turmaId,
  disciplineId,
  limit,
  interclass = false,
  pools = ["exercicio", "simulado"] as QuestionPool[],
  excludeIds = [],
}: {
  turmaId: string;
  disciplineId: string | null;
  limit: number;
  interclass?: boolean;
  pools?: QuestionPool[];
  excludeIds?: string[];
}): Promise<ContentQuestion[]> {
  let themeQuery = supabase
    .from("content_themes")
    .select("id, turma_id, disciplina_id, exercise_count, simulado_count")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (!interclass) {
    themeQuery = themeQuery.eq("turma_id", turmaId);
  }

  if (disciplineId) {
    themeQuery = themeQuery.eq("disciplina_id", disciplineId);
  }

  const { data: themes, error: themesError } = await themeQuery;
  if (themesError) throw themesError;

  const themeRows = ((themes || []) as Pick<
    ThemeRow,
    "id" | "turma_id" | "disciplina_id" | "exercise_count" | "simulado_count"
  >[]);
  if (themeRows.length === 0) return [];

  const minimumPoolSize = Math.max(limit * 4, 24);
  const shuffledThemes = shuffleInPlace([...themeRows]);
  const selectedThemes: typeof themeRows = [];
  let availableCount = 0;

  for (const theme of shuffledThemes) {
    selectedThemes.push(theme);
    availableCount += pools.reduce((sum, pool) => {
      return sum + (pool === "exercicio" ? theme.exercise_count : theme.simulado_count);
    }, 0);

    if (availableCount >= minimumPoolSize) {
      break;
    }
  }

  const targetThemeRows = selectedThemes.length > 0 ? selectedThemes : themeRows;

  let questionsQuery = supabase
    .from("content_questions")
    .select("*")
    .in("theme_id", targetThemeRows.map((theme) => theme.id))
    .eq("ativo", true)
    .in("pool", pools);

  if (excludeIds.length > 0) {
    questionsQuery = questionsQuery.not("id", "in", `(${excludeIds.map((id) => `"${id}"`).join(",")})`);
  }

  const { data: questions, error: questionsError } = await questionsQuery;
  if (questionsError) throw questionsError;

  const questionRows = questions || [];
  if (questionRows.length === 0) return [];

  const pickedQuestions = pickRandomItems(questionRows, limit);
  const { data: options, error: optionsError } = await supabase
    .from("content_question_options")
    .select("*")
    .in("question_id", pickedQuestions.map((question) => question.id))
    .order("ordem", { ascending: true });

  if (optionsError) throw optionsError;

  const themeMap = new Map(
    targetThemeRows.map((theme) => [
      theme.id,
      {
        id: theme.id,
        turma_id: theme.turma_id,
        disciplina_id: theme.disciplina_id,
      } as ThemeRow,
    ]),
  );
  const optionsByQuestion = new Map<string, QuestionOptionRow[]>();
  (options || []).forEach((option) => {
    const list = optionsByQuestion.get(option.question_id) || [];
    list.push(option);
    optionsByQuestion.set(option.question_id, list);
  });

  return pickedQuestions
    .map((question) => {
      const theme = themeMap.get(question.theme_id);
      if (!theme) return null;
      return mapQuestionRow(question, theme, optionsByQuestion.get(question.id) || []);
    })
    .filter((question): question is ContentQuestion => Boolean(question));
}

export async function getReplacementQuestion(
  currentQuestion: ContentQuestion,
  usedIds: Set<string>,
): Promise<ContentQuestion | null> {
  const sameDiscipline = await getQuestionsForMission({
    turmaId: currentQuestion.turmaId,
    disciplineId: currentQuestion.disciplinaId,
    interclass: true,
    limit: 1,
    excludeIds: [...usedIds],
  });

  if (sameDiscipline.length > 0) {
    return sameDiscipline[0];
  }

  const sameTurma = await getQuestionsForMission({
    turmaId: currentQuestion.turmaId,
    disciplineId: null,
    interclass: false,
    limit: 1,
    excludeIds: [...usedIds],
  });

  return sameTurma[0] || null;
}

export async function deleteThemeContent(themeId: string) {
  const { error } = await supabase.from("content_themes").delete().eq("id", themeId);
  if (error) throw error;
}

export function parseImportedThemes(payload: unknown): Tema[] {
  const rawThemes = Array.isArray(payload) ? payload : [payload];
  const themeIds = new Set<string>();
  const questionIds = new Set<string>();

  return rawThemes.map((rawTheme) => {
    if (!isRecord(rawTheme)) {
      throw new Error("Cada item importado precisa ser um objeto de tema.");
    }

    const themeId = asNonEmptyString(rawTheme.id);
    const titulo = asNonEmptyString(rawTheme.titulo);
    const disciplinaId = asNonEmptyString(rawTheme.disciplinaId);
    const turmaId = asNonEmptyString(rawTheme.turmaId);

    if (!themeId || !titulo || !disciplinaId || !turmaId) {
      throw new Error("Cada tema precisa informar id, titulo, disciplinaId e turmaId.");
    }

    if (themeIds.has(themeId)) {
      throw new Error(`O tema "${themeId}" aparece repetido no arquivo de importacao.`);
    }
    themeIds.add(themeId);

    const resumo = ensureStringArray(rawTheme.resumo ?? [], "resumo", themeId);

    if (!Array.isArray(rawTheme.explicacao)) {
      throw new Error(`O campo "explicacao" do tema "${themeId}" precisa ser uma lista.`);
    }
    const explicacao = rawTheme.explicacao.map((rawBlock, index) => {
      if (!isRecord(rawBlock)) {
        throw new Error(`O bloco de explicacao ${index + 1} do tema "${themeId}" esta invalido.`);
      }

      const subtitulo = asNonEmptyString(rawBlock.subtitulo);
      const texto = asNonEmptyString(rawBlock.texto);
      const dica = asOptionalString(rawBlock.dica);

      if (!subtitulo || !texto) {
        throw new Error(`Cada bloco de explicacao do tema "${themeId}" precisa ter subtitulo e texto.`);
      }

      return {
        subtitulo,
        texto,
        dica: dica || undefined,
      };
    });

    if (!Array.isArray(rawTheme.exemplos)) {
      throw new Error(`O campo "exemplos" do tema "${themeId}" precisa ser uma lista.`);
    }
    const exemplos = rawTheme.exemplos.map((rawExample, index) => {
      if (!isRecord(rawExample)) {
        throw new Error(`O exemplo ${index + 1} do tema "${themeId}" esta invalido.`);
      }

      const enunciado = asNonEmptyString(rawExample.enunciado);
      const resposta = asNonEmptyString(rawExample.resposta);
      const passos = ensureStringArray(rawExample.passos ?? [], "passos", themeId);

      if (!enunciado || !resposta) {
        throw new Error(`Cada exemplo do tema "${themeId}" precisa ter enunciado e resposta.`);
      }

      return {
        enunciado,
        passos,
        resposta,
      };
    });

    const parseQuestions = (rawQuestions: unknown, pool: QuestionPool) => {
      if (!Array.isArray(rawQuestions)) {
        throw new Error(`O campo "${pool}" do tema "${themeId}" precisa ser uma lista.`);
      }

      return rawQuestions.map((rawQuestion, index) => {
        if (!isRecord(rawQuestion)) {
          throw new Error(`A questao ${index + 1} do tema "${themeId}" esta invalida.`);
        }

        const questionId = asNonEmptyString(rawQuestion.id);
        const enunciado = asNonEmptyString(rawQuestion.enunciado);
        const tipo = asNonEmptyString(rawQuestion.tipo);
        const respostaCorreta = asNonEmptyString(rawQuestion.respostaCorreta);
        const explicacaoTexto = asNonEmptyString(rawQuestion.explicacao);
        const dificuldade = asNonEmptyString(rawQuestion.dificuldade);

        if (!questionId || !enunciado || !tipo || !respostaCorreta || !explicacaoTexto || !dificuldade) {
          throw new Error(`Cada questao do tema "${themeId}" precisa informar id, enunciado, tipo, respostaCorreta, explicacao e dificuldade.`);
        }

        if (questionIds.has(questionId)) {
          throw new Error(`A questao "${questionId}" aparece repetida no arquivo de importacao.`);
        }
        questionIds.add(questionId);

        if (!QUESTION_TYPE_VALUES.has(tipo)) {
          throw new Error(`A questao "${questionId}" usa um tipo invalido.`);
        }

        if (!QUESTION_DIFFICULTY_VALUES.has(dificuldade)) {
          throw new Error(`A questao "${questionId}" usa uma dificuldade invalida.`);
        }

        const alternativas =
          tipo === "multipla_escolha"
            ? ensureStringArray(rawQuestion.alternativas ?? [], "alternativas", themeId)
            : undefined;

        if (tipo === "multipla_escolha") {
          if (!alternativas || alternativas.length !== 4) {
            throw new Error(`A questao "${questionId}" precisa ter exatamente 4 alternativas.`);
          }

          if (!alternativas.includes(respostaCorreta)) {
            throw new Error(`A resposta correta da questao "${questionId}" precisa existir entre as alternativas.`);
          }
        }

        return {
          id: questionId,
          enunciado,
          tipo: tipo as Questao["tipo"],
          alternativas,
          respostaCorreta,
          explicacao: explicacaoTexto,
          dificuldade: dificuldade as Questao["dificuldade"],
        };
      });
    };

    return {
      id: themeId,
      titulo,
      disciplinaId,
      turmaId,
      unidade: asOptionalString(rawTheme.unidade) || undefined,
      resumo,
      explicacao,
      exemplos,
      exercicios: parseQuestions(rawTheme.exercicios ?? [], "exercicio"),
      simulado: parseQuestions(rawTheme.simulado ?? [], "simulado"),
    } satisfies Tema;
  });
}

export async function replaceThemeContent(theme: Tema, order = 0) {
  const themeRow = {
    id: theme.id,
    titulo: theme.titulo,
    turma_id: theme.turmaId,
    disciplina_id: theme.disciplinaId,
    unidade: theme.unidade || null,
    ativo: true,
    ordem: order,
    summary_count: theme.resumo.length,
    explanation_count: theme.explicacao.length,
    example_count: theme.exemplos.length,
    exercise_count: theme.exercicios.length,
    simulado_count: theme.simulado.length,
  };

  const { error: themeError } = await supabase.from("content_themes").upsert(themeRow);
  if (themeError) throw themeError;

  const [deleteSummaryRes, deleteExplanationRes, deleteExamplesRes, deleteQuestionsRes] = await Promise.all([
    supabase.from("content_summary_items").delete().eq("theme_id", theme.id),
    supabase.from("content_explanation_blocks").delete().eq("theme_id", theme.id),
    supabase.from("content_examples").delete().eq("theme_id", theme.id),
    supabase.from("content_questions").delete().eq("theme_id", theme.id),
  ]);

  if (deleteSummaryRes.error) throw deleteSummaryRes.error;
  if (deleteExplanationRes.error) throw deleteExplanationRes.error;
  if (deleteExamplesRes.error) throw deleteExamplesRes.error;
  if (deleteQuestionsRes.error) throw deleteQuestionsRes.error;

  if (theme.resumo.length > 0) {
    const { error } = await supabase.from("content_summary_items").insert(
      theme.resumo.map((texto, index) => ({
        theme_id: theme.id,
        ordem: index,
        texto,
      })),
    );
    if (error) throw error;
  }

  if (theme.explicacao.length > 0) {
    const { error } = await supabase.from("content_explanation_blocks").insert(
      theme.explicacao.map((block, index) => ({
        theme_id: theme.id,
        ordem: index,
        subtitulo: block.subtitulo,
        texto: block.texto,
        dica: block.dica || null,
      })),
    );
    if (error) throw error;
  }

  if (theme.exemplos.length > 0) {
    const { data: insertedExamples, error } = await supabase
      .from("content_examples")
      .insert(
        theme.exemplos.map((example, index) => ({
          theme_id: theme.id,
          ordem: index,
          enunciado: example.enunciado,
          resposta: example.resposta,
        })),
      )
      .select("id, ordem");

    if (error) throw error;

    const exampleIdByOrder = new Map((insertedExamples || []).map((item) => [item.ordem, item.id]));
    const stepRows = theme.exemplos.flatMap((example, exampleIndex) =>
      example.passos.map((texto, stepIndex) => ({
        example_id: exampleIdByOrder.get(exampleIndex) as string,
        ordem: stepIndex,
        texto,
      })),
    );

    if (stepRows.length > 0) {
      const { error: stepError } = await supabase.from("content_example_steps").insert(stepRows);
      if (stepError) throw stepError;
    }
  }

  const questionRows = [
    ...theme.exercicios.map((question, index) => ({ ...question, pool: "exercicio" as const, ordem: index })),
    ...theme.simulado.map((question, index) => ({ ...question, pool: "simulado" as const, ordem: index })),
  ];

  if (questionRows.length > 0) {
    const { error } = await supabase.from("content_questions").insert(
      questionRows.map((question) => ({
        id: question.id,
        theme_id: theme.id,
        pool: question.pool,
        ordem: question.ordem,
        enunciado: question.enunciado,
        tipo: question.tipo,
        resposta_correta: question.respostaCorreta,
        explicacao: question.explicacao,
        dificuldade: question.dificuldade,
        ativo: true,
      })),
    );
    if (error) throw error;

    const optionRows = questionRows.flatMap((question) =>
      (question.alternativas || []).map((texto, optionIndex) => ({
        question_id: question.id,
        ordem: optionIndex,
        texto,
      })),
    );

    if (optionRows.length > 0) {
      const { error: optionError } = await supabase.from("content_question_options").insert(optionRows);
      if (optionError) throw optionError;
    }
  }
}

export async function replaceThemeContentBatch(themes: Tema[]) {
  for (const [index, theme] of themes.entries()) {
    await replaceThemeContent(theme, index);
  }
}
