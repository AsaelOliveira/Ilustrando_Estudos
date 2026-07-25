/**
 * Captura a tela de questões (AulaPage) e o Perfil nos dois temas.
 * Navega clicando pela UI com a conta de teste — somente leitura.
 *
 * Uso:
 *   set ILUSTRANDO_TEST_EMAIL=aluno@ilustrando && set ILUSTRANDO_TEST_SENHA=123456
 *   node scripts/capturar-aula.cjs
 */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE = process.env.ILUSTRANDO_BASE_URL || "http://localhost:4173";
const EMAIL = process.env.ILUSTRANDO_TEST_EMAIL;
const SENHA = process.env.ILUSTRANDO_TEST_SENHA;
const OUT = path.join(__dirname, "..", "verificacao-visual");

async function main() {
  if (!EMAIL || !SENHA) {
    console.error("Defina ILUSTRANDO_TEST_EMAIL e ILUSTRANDO_TEST_SENHA");
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: theme,
    });
    const page = await context.newPage();
    page.on("pageerror", (err) => console.error("pageerror:", err.message));

    // login
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="text"]', EMAIL);
    await page.fill('input[type="password"]', SENHA);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/app**", { timeout: 15000 });

    // turmas -> primeira turma -> primeira disciplina -> primeiro tema
    // (clica sempre no 1º link MAIS PROFUNDO que a URL atual, ignorando breadcrumbs)
    const clickDeeper = async () => {
      const current = new URL(page.url()).pathname.replace(/\/$/, "");
      const hrefs = await page.locator("a[href]").evaluateAll((els) =>
        els.map((e) => e.getAttribute("href")).filter(Boolean),
      );
      const deeper = hrefs.find((h) => h.startsWith(current + "/"));
      if (!deeper) throw new Error(`Nenhum link mais profundo que ${current}`);
      await page.click(`a[href="${deeper}"]`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1200); // espera a transição de página (framer-motion)
    };

    await page.goto(`${BASE}/app/turmas`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await clickDeeper(); // -> disciplinas
    await clickDeeper(); // -> temas
    await clickDeeper(); // -> aula

    // aba Exercícios (mostra alternativas)
    const abaEx = page.getByText("Exercícios", { exact: true }).first();
    if (await abaEx.count()) {
      await abaEx.click();
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: path.join(OUT, `aula-questoes-iphone-${theme}.png`) });
    console.log(`ok: aula-questoes-iphone-${theme}.png`);

    // responde a 1ª alternativa para ver o estado selecionado
    const primeiraAlt = page.locator("div.space-y-2\\.5 > button").first();
    if (await primeiraAlt.count()) {
      await primeiraAlt.click().catch(() => {});
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT, `aula-questoes-respondida-iphone-${theme}.png`) });
      console.log(`ok: aula-questoes-respondida-iphone-${theme}.png`);
    }

    await context.close();
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
