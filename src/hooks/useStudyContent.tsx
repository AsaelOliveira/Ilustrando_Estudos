import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  BlocoExplicacao,
  ExemploResolvido,
  Questao,
  Tema,
} from "@/data/content-types";
import { disciplinas, turmas } from "@/data/catalog";
import { supabase } from "@/integrations/supabase/client";
import { getStudyTips } from "@/data/study-content";

const STUDY_CONTENT_KEY = "study_content";
const STUDY_CONTENT_CACHE_KEY = "study_content_cache_v1";
const STUDY_CONTENT_CACHE_TTL_MS = 1000 * 60 * 10;

type StudyContentCachePayload = {
  savedAt: number;
  temas: Tema[];
};

type SaveThemesResult = {
  error: string | null;
};

type StudyContentContextValue = {
  temas: Tema[];
  loading: boolean;
  saving: boolean;
  refreshTemas: () => Promise<void>;
  saveTemas: (nextTemas: Tema[]) => Promise<SaveThemesResult>;
};

const StudyContentContext = createContext<StudyContentContextValue | null>(null);

function fail(path: string, message: string): never {
  throw new Error(`${path}: ${message}`);
}

function readRequiredString(value: unknown, path: string): string {
  if (typeof value !== "string") fail(path, "deve ser texto.");
  const normalized = value.trim();
  if (!normalized) fail(path, "nao pode estar vazio.");
  return normalized;
}

function readOptionalString(value: unknown, path: string): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") fail(path, "deve ser texto.");
  const normalized = value.trim();
  return normalized || undefined;
}

function readStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) fail(path, "deve ser uma lista.");
  return value.map((entry, index) => readRequiredString(entry, `${path}[${index}]`));
}

function readExplanationBlock(value: unknown, path: string): BlocoExplicacao {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(path, "deve ser um objeto.");
  }

  const source = value as Record<string, unknown>;

  return {
    subtitulo: readRequiredString(source.subtitulo, `${path}.subtitulo`),
    texto: readRequiredString(source.texto, `${path}.texto`),
    dica: readOptionalString(source.dica, `${path}.dica`),
  };
}

function readResolvedExample(value: unknown, path: string): ExemploResolvido {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(path, "deve ser um objeto.");
  }

  const source = value as Record<string, unknown>;

  return {
    enunciado: readRequiredString(source.enunciado, `${path}.enunciado`),
    passos: readStringArray(source.passos, `${path}.passos`),
    resposta: readRequiredString(source.resposta, `${path}.resposta`),
  };
}

function readQuestion(value: unknown, path: string): Questao {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(path, "deve ser um objeto.");
  }

  const source = value as Record<string, unknown>;
  const tipo = readRequiredString(source.tipo, `${path}.tipo`);
  const dificuldade = readRequiredString(source.dificuldade, `${path}.dificuldade`);

  if (tipo !== "multipla_escolha" && tipo !== "resposta_curta") {
    fail(`${path}.tipo`, "deve ser 'multipla_escolha' ou 'resposta_curta'.");
  }

  if (dificuldade !== "facil" && dificuldade !== "medio" && dificuldade !== "dificil") {
    fail(`${path}.dificuldade`, "deve ser 'facil', 'medio' ou 'dificil'.");
  }

  const alternativas =
    tipo === "multipla_escolha"
      ? readStringArray(source.alternativas, `${path}.alternativas`)
      : undefined;

  if (tipo === "multipla_escolha" && alternativas.length < 2) {
    fail(`${path}.alternativas`, "precisa ter pelo menos 2 alternativas.");
  }

  return {
    id: readRequiredString(source.id, `${path}.id`),
    enunciado: readRequiredString(source.enunciado, `${path}.enunciado`),
    tipo,
    alternativas,
    respostaCorreta: readRequiredString(source.respostaCorreta, `${path}.respostaCorreta`),
    explicacao: readRequiredString(source.explicacao, `${path}.explicacao`),
    dificuldade,
  };
}

export function normalizeTemasInput(value: unknown): Tema[] {
  if (!Array.isArray(value)) {
    throw new Error("O JSON precisa ser um array de temas.");
  }

  const temaIds = new Set<string>();
  const questionIds = new Set<string>();

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`tema[${index}]`, "deve ser um objeto.");
    }

    const source = entry as Record<string, unknown>;
    const tema: Tema = {
      id: readRequiredString(source.id, `tema[${index}].id`),
      titulo: readRequiredString(source.titulo, `tema[${index}].titulo`),
      disciplinaId: readRequiredString(source.disciplinaId, `tema[${index}].disciplinaId`),
      turmaId: readRequiredString(source.turmaId, `tema[${index}].turmaId`),
      unidade: readOptionalString(source.unidade, `tema[${index}].unidade`),
      resumo: readStringArray(source.resumo, `tema[${index}].resumo`),
      explicacao: Array.isArray(source.explicacao)
        ? source.explicacao.map((block, blockIndex) =>
            readExplanationBlock(block, `tema[${index}].explicacao[${blockIndex}]`),
          )
        : fail(`tema[${index}].explicacao`, "deve ser uma lista."),
      exemplos: Array.isArray(source.exemplos)
        ? source.exemplos.map((example, exampleIndex) =>
            readResolvedExample(example, `tema[${index}].exemplos[${exampleIndex}]`),
          )
        : fail(`tema[${index}].exemplos`, "deve ser uma lista."),
      exercicios: Array.isArray(source.exercicios)
        ? source.exercicios.map((question, questionIndex) =>
            readQuestion(question, `tema[${index}].exercicios[${questionIndex}]`),
          )
        : fail(`tema[${index}].exercicios`, "deve ser uma lista."),
      simulado: Array.isArray(source.simulado)
        ? source.simulado.map((question, questionIndex) =>
            readQuestion(question, `tema[${index}].simulado[${questionIndex}]`),
          )
        : fail(`tema[${index}].simulado`, "deve ser uma lista."),
    };

    if (temaIds.has(tema.id)) {
      fail(`tema[${index}].id`, `o id '${tema.id}' esta duplicado.`);
    }
    temaIds.add(tema.id);

    const turma = turmas.find((entry) => entry.id === tema.turmaId);
    if (!turma) {
      fail(`tema[${index}].turmaId`, `a turma '${tema.turmaId}' nao existe no catalogo.`);
    }

    const disciplina = disciplinas.find((entry) => entry.id === tema.disciplinaId);
    if (!disciplina) {
      fail(
        `tema[${index}].disciplinaId`,
        `a disciplina '${tema.disciplinaId}' nao existe no catalogo.`,
      );
    }

    if (disciplina.turmaId !== tema.turmaId) {
      fail(
        `tema[${index}]`,
        `a disciplina '${tema.disciplinaId}' nao pertence a turma '${tema.turmaId}'.`,
      );
    }

    [...tema.exercicios, ...tema.simulado].forEach((question, questionIndex) => {
      if (questionIds.has(question.id)) {
        fail(
          `tema[${index}].questao[${questionIndex}].id`,
          `o id '${question.id}' esta duplicado entre as questoes.`,
        );
      }
      questionIds.add(question.id);
    });

    return tema;
  });
}

export function getTemaByIdFromList(temas: Tema[], temaId: string): Tema | undefined {
  return temas.find((tema) => tema.id === temaId);
}

export function getTemasByDisciplinaFromList(temas: Tema[], disciplinaId: string): Tema[] {
  return temas.filter((tema) => tema.disciplinaId === disciplinaId);
}

function readCachedTemas(): Tema[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STUDY_CONTENT_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StudyContentCachePayload;
    if (!parsed?.savedAt || !Array.isArray(parsed.temas)) return null;

    if (Date.now() - parsed.savedAt > STUDY_CONTENT_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(STUDY_CONTENT_CACHE_KEY);
      return null;
    }

    return normalizeTemasInput(parsed.temas);
  } catch {
    return null;
  }
}

function writeCachedTemas(temas: Tema[]) {
  if (typeof window === "undefined") return;

  try {
    const payload: StudyContentCachePayload = {
      savedAt: Date.now(),
      temas,
    };
    window.sessionStorage.setItem(STUDY_CONTENT_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignora falhas de quota/cache.
  }
}

async function fetchTemas(): Promise<Tema[]> {
  const cachedTemas = readCachedTemas();
  if (cachedTemas) return cachedTemas;

  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", STUDY_CONTENT_KEY)
    .maybeSingle();

  if (error || !data) return [];

  try {
    const normalizedTemas = normalizeTemasInput(data.value);
    writeCachedTemas(normalizedTemas);
    return normalizedTemas;
  } catch (loadError) {
    console.error("Nao foi possivel carregar o conteudo salvo:", loadError);
    return [];
  }
}

async function persistTemas(temas: Tema[]) {
  writeCachedTemas(temas);
  return supabase.from("app_settings").upsert(
    {
      key: STUDY_CONTENT_KEY,
      description: "Conteudo pedagogico importado pelo painel admin",
      value: temas,
    },
    { onConflict: "key" },
  );
}

export function StudyContentProvider({ children }: { children: ReactNode }) {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refreshTemas = useCallback(async () => {
    setLoading(true);
    const nextTemas = await fetchTemas();
    setTemas(nextTemas);
    setLoading(false);
  }, []);

  const saveTemas = useCallback(async (nextTemas: Tema[]) => {
    let normalized: Tema[];

    try {
      normalized = normalizeTemasInput(nextTemas);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Conteudo invalido.",
      };
    }

    setSaving(true);
    const { error } = await persistTemas(normalized);

    if (!error) {
      setTemas(normalized);
    }

    setSaving(false);
    return {
      error: error ? error.message : null,
    };
  }, []);

  useEffect(() => {
    void refreshTemas();
  }, [refreshTemas]);

  const value = useMemo<StudyContentContextValue>(
    () => ({
      temas,
      loading,
      saving,
      refreshTemas,
      saveTemas,
    }),
    [loading, refreshTemas, saveTemas, saving, temas],
  );

  return <StudyContentContext.Provider value={value}>{children}</StudyContentContext.Provider>;
}

export function useStudyContent() {
  const context = useContext(StudyContentContext);

  if (!context) {
    throw new Error("useStudyContent precisa ser usado dentro de StudyContentProvider.");
  }

  return {
    ...context,
    getTema: (temaId: string) => getTemaByIdFromList(context.temas, temaId),
    getTemasByDisciplina: (disciplinaId: string) => getTemasByDisciplinaFromList(context.temas, disciplinaId),
    getStudyTips,
  };
}
