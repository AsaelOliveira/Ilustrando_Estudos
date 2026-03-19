import type { RankingEntry, Tema } from "./content-types";

export type {
  BlocoExplicacao,
  Disciplina,
  ExemploResolvido,
  MissaoDiaria,
  Questao,
  RankingEntry,
  Tema,
  Turma,
} from "./content-types";

export const temas: Tema[] = [];

export const rankingMock: RankingEntry[] = [];

export function getTemasByDisciplinaFrom(source: Tema[], disciplinaId: string): Tema[] {
  return source.filter((tema) => tema.disciplinaId === disciplinaId);
}

export function getTemaFrom(source: Tema[], id: string): Tema | undefined {
  return source.find((tema) => tema.id === id);
}

export function getTemasByDisciplina(disciplinaId: string): Tema[] {
  return getTemasByDisciplinaFrom(temas, disciplinaId);
}

export function getTema(id: string): Tema | undefined {
  return getTemaFrom(temas, id);
}

export function getStudyTips(_disciplinaId: string, acertoPct: number): string[] {
  if (acertoPct < 40) {
    return [
      "Revise o tema quando o novo conteudo for cadastrado.",
      "Anote as duvidas para organizar a proxima etapa de estudo.",
    ];
  }

  if (acertoPct < 70) {
    return [
      "Continue o estudo com os novos materiais assim que forem publicados.",
      "Use este periodo para revisar o que voce ja domina.",
    ];
  }

  return [
    "Base reiniciada com sucesso. Novos conteudos podem ser adicionados aos poucos.",
    "Mantenha o foco na qualidade antes de popular todas as disciplinas.",
  ];
}
