/** Teste multiplayer da Corrida (aluno x aluno2) + caixinha de sugestões. Uso manual. */
const { chromium } = require("playwright");

async function login(browser, user, pass) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error(`[${user}] pageerror:`, e.message));
  await page.goto("http://localhost:4173/login", { waitUntil: "networkidle" });
  await page.fill('input[type="text"]', user);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app**", { timeout: 15000 });
  return { ctx, page };
}

async function responderTudo(page, delayMs, tag) {
  for (let i = 0; i < 10; i++) {
    const alt = page.locator("div.space-y-2\\.5 > button").first();
    if (!(await alt.count())) break;
    await alt.click().catch(() => {});
    await page.waitForTimeout(delayMs);
  }
  console.log(`[${tag}] terminou de responder`);
}

async function main() {
  const browser = await chromium.launch();
  const A = await login(browser, "aluno@ilustrando", "123456");
  const B = await login(browser, "aluno2@ilustrando", "123456");

  // A cria a corrida
  await A.page.goto("http://localhost:4173/app/corrida", { waitUntil: "networkidle" });
  await A.page.waitForTimeout(1200);
  await A.page.click("text=Criar corrida");
  await A.page.waitForTimeout(2500);
  const code = (await A.page.locator("button span.font-black").first().textContent()).trim();
  console.log("CODIGO:", code);

  // B entra com o código
  await B.page.goto("http://localhost:4173/app/corrida", { waitUntil: "networkidle" });
  await B.page.waitForTimeout(1200);
  await B.page.fill("input", code);
  await B.page.click('button:has-text("Entrar")');
  await B.page.waitForTimeout(2500);
  await A.page.waitForTimeout(1500); // realtime: A vê B entrar
  await A.page.screenshot({ path: "verificacao-visual/multi-espera-A.png" });
  console.log("B entrou; A já vê 2 corredores");

  // A inicia
  await A.page.click("text=Iniciar corrida");
  await A.page.waitForTimeout(1500);

  // Os dois correm em ritmos diferentes
  const corridaA = responderTudo(A.page, 900, "A");
  const corridaB = responderTudo(B.page, 2200, "B");
  await A.page.waitForTimeout(3500);
  await B.page.screenshot({ path: "verificacao-visual/multi-pista-B.png" });
  await corridaA;
  await A.page.screenshot({ path: "verificacao-visual/multi-podium-A.png" });
  await corridaB;
  await B.page.waitForTimeout(1500);
  await B.page.screenshot({ path: "verificacao-visual/multi-podium-B.png" });

  // B testa a caixinha de sugestões
  await B.page.goto("http://localhost:4173/app/configuracoes", { waitUntil: "networkidle" });
  await B.page.waitForTimeout(1500);
  await B.page.locator("text=Tem uma ideia?").scrollIntoViewIfNeeded();
  await B.page.fill("textarea", "Teste de sugestão: quero mais minijogos com meu avatar!");
  await B.page.click("text=Enviar");
  await B.page.waitForTimeout(2000);
  await B.page.screenshot({ path: "verificacao-visual/sugestao-enviada.png" });
  console.log("sugestão enviada por B");

  console.log("FIM");
  await browser.close();
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
