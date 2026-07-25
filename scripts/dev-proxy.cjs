const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const localRoot = "C:\\codex-work\\sistema-escolar-v2\\app";
const currentRoot = process.cwd();
const isWindows = process.platform === "win32";
const robocopyBin = "C:\\Windows\\System32\\robocopy.exe";

function exists(targetPath) {
  return fs.existsSync(targetPath);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", reject);
  });
}

function syncToLocal() {
  fs.mkdirSync(localRoot, { recursive: true });

  const result = spawnSync(
    robocopyBin,
    [currentRoot, localRoot, "/MIR", "/XD", "node_modules", ".git", "dist"],
    {
      stdio: "inherit",
    }
  );

  const exitCode = result.status ?? 0;
  if (exitCode > 7) {
    process.exit(exitCode);
  }
}

async function ensureDependencies() {
  const viteEntry = path.join(localRoot, "node_modules", "vite", "bin", "vite.js");

  if (exists(viteEntry)) {
    return;
  }

  console.log("\n[dev-proxy] Instalando dependencias na copia local...\n");

  const npmCommand = isWindows ? "npm.cmd" : "npm";
  const installArgs = exists(path.join(localRoot, "package-lock.json")) ? ["install"] : ["install"];
  const code = await run(npmCommand, installArgs, { cwd: localRoot, env: process.env });

  if (code !== 0) {
    process.exit(code);
  }
}

async function runInner(extraArgs) {
  // Spawna o entry JS do vite via node — .cmd direto quebra no Windows (EINVAL, CVE-2024-27980)
  const viteEntry = path.join(localRoot, "node_modules", "vite", "bin", "vite.js");

  const args = [viteEntry, ...(extraArgs.length ? extraArgs : ["--host", "0.0.0.0", "--port", "4173"])];
  await ensureDependencies();
  const code = await run(process.execPath, args, {
    cwd: localRoot,
    env: { ...process.env, ILUSTRANDO_LOCAL_DEV: "1" },
  });
  process.exit(code);
}

async function main() {
  const extraArgs = process.argv.slice(2);

  if (path.resolve(currentRoot).toLowerCase() !== path.resolve(localRoot).toLowerCase()) {
    syncToLocal();
    await runInner(extraArgs);
    return;
  }

  await runInner(extraArgs);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
