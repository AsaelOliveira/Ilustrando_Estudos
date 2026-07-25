/** Auditoria de responsividade mobile (390px): detecta overflow horizontal nas páginas. */
const { chromium } = require("playwright");

const PAGES_PUBLIC = ["/", "/login", "/sobre"];
const PAGES_AUTH = [
  "/app",
  "/app/progresso",
  "/app/turmas",
  "/app/competicao",
  "/app/duelo",
  "/app/corrida",
  "/app/configuracoes",
  "/app/favoritos",
  "/app/modo-prova",
];

async function check(page, route) {
  await page.goto(`http://localhost:4173${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    let worst = null;
    if (overflow > 1) {
      // acha os elementos que estouram a viewport
      const vw = doc.clientWidth;
      for (const el of document.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width > vw + 1 || r.right > vw + 1 || r.left < -1) {
          const tag = `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`;
          worst = worst || `${tag} (w=${Math.round(r.width)}, right=${Math.round(r.right)})`;
        }
      }
    }
    return { overflow, worst };
  });
  const status = result.overflow > 1 ? `OVERFLOW +${result.overflow}px  -> ${result.worst}` : "ok";
  console.log(`${route.padEnd(22)} ${status}`);
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();

  for (const route of PAGES_PUBLIC) await check(page, route);

  // login para as páginas autenticadas
  await page.goto("http://localhost:4173/login", { waitUntil: "networkidle" });
  await page.fill('input[type="text"]', "aluno@ilustrando");
  await page.fill('input[type="password"]', "123456");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app**", { timeout: 15000 });

  for (const route of PAGES_AUTH) await check(page, route);

  await browser.close();
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
