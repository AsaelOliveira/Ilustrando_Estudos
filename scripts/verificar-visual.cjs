/**
 * Verificacao visual do redesign (Etapa 5).
 *
 * Uso:
 *   1. Suba o dev server:  npm run dev   (porta 4173)
 *   2. Rode:               node scripts/verificar-visual.cjs
 *
 * Paginas publicas (/ e /login) sao capturadas sempre.
 * Para capturar telas autenticadas, exporte as credenciais da CONTA DE TESTE:
 *   set ILUSTRANDO_TEST_EMAIL=...  &&  set ILUSTRANDO_TEST_SENHA=...
 * (o script so faz login pela UI e navega — nenhuma escrita no banco)
 *
 * Saida: verificacao-visual/*.png
 */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE = process.env.ILUSTRANDO_BASE_URL || "http://localhost:4173";
const EMAIL = process.env.ILUSTRANDO_TEST_EMAIL;
const SENHA = process.env.ILUSTRANDO_TEST_SENHA;
const OUT = path.join(__dirname, "..", "verificacao-visual");

const VIEWPORTS = {
  iphone: { width: 390, height: 844 }, // iPhone 14
  android: { width: 360, height: 800 }, // Android comum
  desktop: { width: 1440, height: 900 },
};

const PUBLIC_PAGES = [
  { route: "/", name: "home" },
  { route: "/login", name: "login" },
];

const AUTH_PAGES = [
  { route: "/app", name: "app-home" },
  { route: "/app/progresso", name: "dashboard" },
  { route: "/app/turmas", name: "turmas" },
  { route: "/app/competicao", name: "competicao" },
  { route: "/app/configuracoes", name: "perfil" },
];

async function shot(page, route, name, viewportName, theme, accent) {
  await page.emulateMedia({ colorScheme: theme });
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.evaluate(
    ([accentValue]) => {
      if (accentValue === "verde") {
        delete document.documentElement.dataset.accent;
      } else {
        document.documentElement.dataset.accent = accentValue;
      }
    },
    [accent],
  );
  await page.waitForTimeout(600);
  const file = path.join(OUT, `${name}-${viewportName}-${theme}-${accent}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("ok:", path.basename(file));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 2,
      isMobile: viewportName !== "desktop",
      hasTouch: viewportName !== "desktop",
    });
    const page = await context.newPage();
    page.on("pageerror", (err) => console.error("pageerror:", err.message));

    // Login pela UI (uma vez por contexto) se houver credenciais
    let authed = false;
    if (EMAIL && SENHA) {
      await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
      await page.fill('input[type="text"]', EMAIL);
      await page.fill('input[type="password"]', SENHA);
      await page.click('button[type="submit"]');
      try {
        await page.waitForURL("**/app**", { timeout: 15000 });
        authed = true;
        console.log(`[${viewportName}] login ok`);
      } catch {
        console.warn(`[${viewportName}] login FALHOU — pulando telas autenticadas`);
      }
    }

    // Matriz reduzida: light+dark com accent padrao; accent roxo so no claro
    const combos = [
      { theme: "light", accent: "verde" },
      { theme: "dark", accent: "verde" },
      { theme: "light", accent: "roxo" },
    ];

    for (const { theme, accent } of combos) {
      for (const p of PUBLIC_PAGES) {
        await shot(page, p.route, p.name, viewportName, theme, accent);
      }
      if (authed) {
        for (const p of AUTH_PAGES) {
          await shot(page, p.route, p.name, viewportName, theme, accent);
        }
      }
    }

    await context.close();
  }

  await browser.close();
  console.log(`\nCapturas em: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
