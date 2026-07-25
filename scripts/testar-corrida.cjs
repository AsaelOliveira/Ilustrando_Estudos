/** Teste de fluxo completo da Corrida (solo, conta de teste). Uso manual. */
const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("pageerror:", e.message));

  await page.goto("http://localhost:4173/login", { waitUntil: "networkidle" });
  await page.fill('input[type="text"]', "aluno@ilustrando");
  await page.fill('input[type="password"]', "123456");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app**", { timeout: 15000 });

  await page.goto("http://localhost:4173/app/corrida", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.click("text=Criar corrida");
  await page.waitForTimeout(2500);
  await page.click("text=Iniciar corrida");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "verificacao-visual/corrida-pista.png" });

  for (let i = 0; i < 5; i++) {
    const alt = page.locator("div.space-y-2\\.5 > button").first();
    if (!(await alt.count())) break;
    await alt.click();
    await page.waitForTimeout(1100);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "verificacao-visual/corrida-podium.png" });
  console.log("FIM");
  await browser.close();
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
