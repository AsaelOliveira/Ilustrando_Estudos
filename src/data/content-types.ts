export interface Turma {
  id: string;
  nome: string;
  ano: number;
  descricao: string;
  icone: string;
}

export interface Disciplina {
  id: string;
  nome: string;
  turmaId: string;
}

export interface BlocoExplicacao {
  subtitulo: string;
  texto: string;
  dica?: string;
}

export interface ExemploResolvido {
  enunciado: string;
  passos: string[];
  resposta: string;
}

export interface Questao {
  id: string;
  enunciado: string;
  tipo: "multipla_escolha" | "resposta_curta";
  alternativas?: string[];
  respostaCorreta: string;
  explicacao: string;
  dificuldade: "facil" | "medio" | "dificil";
}

export interface Tema {
  id: string;
  titulo: string;
  disciplinaId: string;
  turmaId: string;
  unidade?: string;
  resumo: string[];
  explicacao: BlocoExplicacao[];
  exemplos: ExemploResolvido[];
  exercicios: Questao[];
  simulado: Questao[];
}

export interface MissaoDiaria {
  id: string;
  data: string;
  turmaId: string;
  questoes: Questao[];
  tempoLimite: number;
}

export interface RankingEntry {
  posicao: number;
  nome: string;
  turma: string;
  pontos: number;
}
