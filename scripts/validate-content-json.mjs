import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const importsDir = path.join(projectRoot, "content-imports");

const validQuestionTypes = new Set(["multipla_escolha", "resposta_curta"]);
const validDifficulties = new Set(["facil", "medio", "dificil"]);

function walkJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walkJsonFiles(fullPath);
    }

    return entry.isFile() && entry.name.endsWith(".json") ? [fullPath] : [];
  });
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function validateQuestion(question, filePath, themeId, questionIds, errors) {
  const prefix = `[${path.relative(projectRoot, filePath)} :: ${themeId} :: ${question?.id ?? "sem-id"}]`;

  assert(question && typeof question === "object" && !Array.isArray(question), `${prefix} Questão inválida.`, errors);
  if (!question || typeof question !== "object" || Array.isArray(question)) return;

  assert(isNonEmptyString(question.id), `${prefix} O campo "id" é obrigatório.`, errors);
  assert(isNonEmptyString(question.enunciado), `${prefix} O campo "enunciado" é obrigatório.`, errors);
  assert(validQuestionTypes.has(question.tipo), `${prefix} O campo "tipo" é inválido.`, errors);
  assert(isNonEmptyString(question.respostaCorreta), `${prefix} O campo "respostaCorreta" é obrigatório.`, errors);
  assert(isNonEmptyString(question.explicacao), `${prefix} O campo "explicacao" é obrigatório.`, errors);
  assert(validDifficulties.has(question.dificuldade), `${prefix} O campo "dificuldade" é inválido.`, errors);

  if (isNonEmptyString(question.id)) {
    if (questionIds.has(question.id)) {
      errors.push(`${prefix} O id da questão está duplicado em outro arquivo ou tema.`);
    } else {
      questionIds.add(question.id);
    }
  }

  if (question.tipo === "multipla_escolha") {
    assert(Array.isArray(question.alternativas), `${prefix} Questões de múltipla escolha precisam de alternativas.`, errors);
    if (Array.isArray(question.alternativas)) {
      assert(question.alternativas.length === 4, `${prefix} Questões de múltipla escolha devem ter exatamente 4 alternativas.`, errors);
      assert(question.alternativas.every(isNonEmptyString), `${prefix} Todas as alternativas precisam ser textos válidos.`, errors);
      if (isNonEmptyString(question.respostaCorreta)) {
        assert(
          question.alternativas.includes(question.respostaCorreta),
          `${prefix} A resposta correta precisa coincidir exatamente com uma das alternativas.`,
          errors,
        );
      }
    }
  }
}

function validateTheme(theme, filePath, themeIds, questionIds, errors) {
  const prefix = `[${path.relative(projectRoot, filePath)}]`;

  assert(theme && typeof theme === "object" && !Array.isArray(theme), `${prefix} Tema inválido.`, errors);
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) return;

  assert(isNonEmptyString(theme.id), `${prefix} O campo "id" do tema é obrigatório.`, errors);
  assert(isNonEmptyString(theme.titulo), `${prefix} O campo "titulo" do tema é obrigatório.`, errors);
  assert(isNonEmptyString(theme.disciplinaId), `${prefix} O campo "disciplinaId" do tema é obrigatório.`, errors);
  assert(isNonEmptyString(theme.turmaId), `${prefix} O campo "turmaId" do tema é obrigatório.`, errors);
  assert(Array.isArray(theme.resumo), `${prefix} O campo "resumo" precisa ser uma lista.`, errors);
  assert(Array.isArray(theme.explicacao), `${prefix} O campo "explicacao" precisa ser uma lista.`, errors);
  assert(Array.isArray(theme.exemplos), `${prefix} O campo "exemplos" precisa ser uma lista.`, errors);
  assert(Array.isArray(theme.exercicios), `${prefix} O campo "exercicios" precisa ser uma lista.`, errors);
  assert(Array.isArray(theme.simulado), `${prefix} O campo "simulado" precisa ser uma lista.`, errors);

  if (isNonEmptyString(theme.id)) {
    if (themeIds.has(theme.id)) {
      errors.push(`${prefix} O tema "${theme.id}" está duplicado em outro arquivo.`);
    } else {
      themeIds.add(theme.id);
    }
  }

  if (Array.isArray(theme.resumo)) {
    assert(theme.resumo.every(isNonEmptyString), `${prefix} Todos os itens de "resumo" precisam ser textos válidos.`, errors);
  }

  if (Array.isArray(theme.explicacao)) {
    theme.explicacao.forEach((block, index) => {
      const blockPrefix = `${prefix} [${theme.id ?? "sem-id"} :: explicacao ${index + 1}]`;
      assert(block && typeof block === "object" && !Array.isArray(block), `${blockPrefix} Bloco inválido.`, errors);
      if (!block || typeof block !== "object" || Array.isArray(block)) return;
      assert(isNonEmptyString(block.subtitulo), `${blockPrefix} O campo "subtitulo" é obrigatório.`, errors);
      assert(isNonEmptyString(block.texto), `${blockPrefix} O campo "texto" é obrigatório.`, errors);
      if (block.dica !== undefined) {
        assert(isNonEmptyString(block.dica), `${blockPrefix} O campo "dica", quando informado, precisa ser texto válido.`, errors);
      }
    });
  }

  if (Array.isArray(theme.exemplos)) {
    theme.exemplos.forEach((example, index) => {
      const examplePrefix = `${prefix} [${theme.id ?? "sem-id"} :: exemplo ${index + 1}]`;
      assert(example && typeof example === "object" && !Array.isArray(example), `${examplePrefix} Exemplo inválido.`, errors);
      if (!example || typeof example !== "object" || Array.isArray(example)) return;
      assert(isNonEmptyString(example.enunciado), `${examplePrefix} O campo "enunciado" é obrigatório.`, errors);
      assert(Array.isArray(example.passos), `${examplePrefix} O campo "passos" precisa ser uma lista.`, errors);
      assert(isNonEmptyString(example.resposta), `${examplePrefix} O campo "resposta" é obrigatório.`, errors);
      if (Array.isArray(example.passos)) {
        assert(example.passos.every(isNonEmptyString), `${examplePrefix} Todos os passos precisam ser textos válidos.`, errors);
      }
    });
  }

  if (Array.isArray(theme.exercicios)) {
    theme.exercicios.forEach((question) => validateQuestion(question, filePath, theme.id ?? "sem-id", questionIds, errors));
  }

  if (Array.isArray(theme.simulado)) {
    theme.simulado.forEach((question) => validateQuestion(question, filePath, theme.id ?? "sem-id", questionIds, errors));
  }
}

const files = walkJsonFiles(importsDir);
const errors = [];
const themeIds = new Set();
const questionIds = new Set();

if (files.length === 0) {
  console.log("Nenhum arquivo JSON foi encontrado em content-imports.");
  process.exit(0);
}

for (const filePath of files) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const themes = Array.isArray(parsed) ? parsed : [parsed];

    themes.forEach((theme) => validateTheme(theme, filePath, themeIds, questionIds, errors));
  } catch (error) {
    errors.push(`[${path.relative(projectRoot, filePath)}] JSON inválido: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (errors.length > 0) {
  console.error("Falhas encontradas na validação de conteúdo:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Validação concluída com sucesso. ${files.length} arquivo(s), ${themeIds.size} tema(s) e ${questionIds.size} questão(ões) verificados.`);
