type ReformulationMode =
  | "identificar"
  | "relacionar"
  | "reconhecer"
  | "aplicar"
  | "revisar";

function unique(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function buildQuestionVariants(input: {
  foco: string;
  contexto: string;
  disciplinaNome?: string;
  conceitoBase?: string;
  acao?: string;
}): string[] {
  const foco = cleanText(input.foco);
  const contexto = cleanText(input.contexto);
  const disciplinaNome = cleanText(input.disciplinaNome || "estudo");
  const conceitoBase = cleanText(input.conceitoBase || "conteúdo");
  const acao = cleanText(input.acao || "compreender");

  return unique([
    `Ao estudar ${contexto}, qual ${conceitoBase} faz parte desse percurso?`,
    `Qual tópico está previsto no estudo de ${contexto}?`,
    `Durante a revisão de ${contexto}, qual assunto o estudante deve reconhecer?`,
    `Entre as opções, qual item compõe o trabalho com ${contexto}?`,
    `Qual conteúdo ajuda o estudante a ${acao} melhor em ${disciplinaNome}?`,
    `Qual alternativa apresenta um elemento relacionado a ${foco} em ${contexto}?`,
  ]);
}

export function buildSimulationVariants(input: {
  contexto: string;
  disciplinaNome?: string;
}): string[] {
  const contexto = cleanText(input.contexto);
  const disciplinaNome = cleanText(input.disciplinaNome || "estudo");

  return unique([
    `No simulado de ${contexto}, qual conteúdo pertence ao tema estudado?`,
    `Pensando no que foi trabalhado em ${contexto}, qual assunto está alinhado ao material-base?`,
    `Qual opção representa um conteúdo realmente previsto para ${contexto}?`,
    `Em ${disciplinaNome}, qual alternativa se conecta ao estudo de ${contexto}?`,
  ]);
}

export function reformulateQuestionStem(
  stem: string,
  mode: ReformulationMode = "identificar",
): string[] {
  const cleaned = cleanText(stem).replace(/\?+$/, "");
  const normalized = cleaned.toLowerCase();

  if (normalized.startsWith("qual ")) {
    const tail = cleaned.slice(5).trim();
    return unique([
      `${capitalize(cleaned)}?`,
      `Entre as opções, ${tail}?`,
      `Assinale a alternativa em que ${tail}.`,
      `Identifique a opção em que ${tail}.`,
    ]);
  }

  if (normalized.startsWith("como ")) {
    const tail = cleaned.slice(5).trim();
    return unique([
      `${capitalize(cleaned)}?`,
      `De que forma ${tail}?`,
      `Qual explicação ajuda a entender como ${tail}?`,
    ]);
  }

  if (normalized.startsWith("por que ")) {
    const tail = cleaned.slice(8).trim();
    return unique([
      `${capitalize(cleaned)}?`,
      `Qual explicação mostra por que ${tail}?`,
      `O que justifica que ${tail}?`,
    ]);
  }

  if (mode === "aplicar") {
    return unique([
      `${capitalize(cleaned)}?`,
      `Em uma situação de estudo, como aplicar a ideia de "${cleaned}"?`,
      `Qual alternativa mostra o uso correto de "${cleaned}"?`,
    ]);
  }

  if (mode === "relacionar") {
    return unique([
      `${capitalize(cleaned)}?`,
      `Como relacionar "${cleaned}" ao conteúdo estudado?`,
      `Qual alternativa conecta melhor "${cleaned}" ao tema?`,
    ]);
  }

  if (mode === "revisar") {
    return unique([
      `${capitalize(cleaned)}?`,
      `Na revisão do conteúdo, o que é importante lembrar sobre "${cleaned}"?`,
      `Qual afirmação ajuda a revisar "${cleaned}"?`,
    ]);
  }

  return unique([
    `${capitalize(cleaned)}?`,
    `Qual alternativa está correta sobre "${cleaned}"?`,
    `O que o estudante precisa identificar em "${cleaned}"?`,
  ]);
}
