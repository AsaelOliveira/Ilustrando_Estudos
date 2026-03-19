import type { Disciplina, Tema, Turma } from "./content-types";

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

export const importTemplate: Tema = {
  id: "exemplo-tema",
  titulo: "Nome do Tema",
  disciplinaId: "mat6",
  turmaId: "6ano",
  unidade: "Nome da Unidade (opcional)",
  resumo: [],
  explicacao: [],
  exemplos: [],
  exercicios: [],
  simulado: [],
};

export const turmas: Turma[] = [
  { id: "6ano", nome: "6\u00BA Ano", ano: 6, descricao: "Ensino Fundamental II - In\u00EDcio da jornada", icone: "\u{1F3AF}" },
  { id: "7ano", nome: "7\u00BA Ano", ano: 7, descricao: "Ensino Fundamental II - Expandindo horizontes", icone: "\u{1F680}" },
  { id: "8ano", nome: "8\u00BA Ano", ano: 8, descricao: "Ensino Fundamental II - Aprofundando o conhecimento", icone: "\u{1F4A1}" },
  { id: "9ano", nome: "9\u00BA Ano", ano: 9, descricao: "Ensino Fundamental II - Prepara\u00E7\u00E3o para o futuro", icone: "\u{1F3C6}" },
];

const disciplinasBase = [
  { prefixo: "mat", nome: "Matematica" },
  { prefixo: "port", nome: "Lingua Portuguesa" },
  { prefixo: "cien", nome: "Ciencias" },
  { prefixo: "hist", nome: "Historia" },
  { prefixo: "geo", nome: "Geografia" },
  { prefixo: "edf", nome: "Educacao Fisica" },
  { prefixo: "ing", nome: "Ingles" },
  { prefixo: "esp", nome: "Espanhol" },
  { prefixo: "lit", nome: "Literatura" },
  { prefixo: "art", nome: "Educacao Artistica" },
  { prefixo: "eti", nome: "Etica" },
  { prefixo: "red", nome: "Redacao" },
  { prefixo: "erl", nome: "Empreendedorismo e Raciocinio Logico" },
] as const;

export const disciplinas: Disciplina[] = turmas.flatMap((turma) =>
  disciplinasBase.map((disciplina) => ({
    id: `${disciplina.prefixo}${turma.ano}`,
    nome: disciplina.nome,
    turmaId: turma.id,
  }))
);

export function getTurma(id: string): Turma | undefined {
  return turmas.find((turma) => turma.id === id);
}

export function getDisciplinasByTurma(turmaId: string): Disciplina[] {
  return disciplinas.filter((disciplina) => disciplina.turmaId === turmaId);
}

export function getDisciplina(id: string): Disciplina | undefined {
  return disciplinas.find((disciplina) => disciplina.id === id);
}
