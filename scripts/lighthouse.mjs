import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

/**
 * Lighthouse performance gate for public pages (docs/02 §5: 95+).
 * Requires a running app (`npm run dev`) and Chromium.
 */
const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const THRESHOLD = Number(process.env.LIGHTHOUSE_MIN ?? 95);

function seedTokens() {
  const file = path.join(process.cwd(), "e2e", ".seed.json");
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

function urls() {
  const seed = seedTokens();
  const list = [`${BASE}/login`];
  if (seed?.bookingToken) list.push(`${BASE}/b/${seed.bookingToken}`);
  if (seed?.formToken) list.push(`${BASE}/f/${seed.formToken}`);
  return list;
}

function runLighthouse(url) {
  return new Promise((resolve, reject) => {
    const args = [
      "lighthouse",
      url,
      "--only-categories=performance",
      "--chrome-flags=--headless --no-sandbox --disable-gpu",
      "--output=json",
      "--output-path=stdout",
      "--quiet",
      "--preset=desktop",
    ];
    const child = spawn("npx", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `lighthouse exited ${code}`));
        return;
      }
      try {
        const json = JSON.parse(stdout);
        const score = Math.round(
          (json.categories?.performance?.score ?? 0) * 100,
        );
        resolve(score);
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function main() {
  const health = await fetch(BASE).catch(() => null);
  if (!health?.ok && health?.status !== 307 && health?.status !== 308) {
    console.error(`App is not reachable at ${BASE}. Start \`npm run dev\`.`);
    process.exit(1);
  }

  let failed = false;
  for (const url of urls()) {
    process.stdout.write(`Lighthouse ${url} … `);
    const score = await runLighthouse(url);
    console.log(`${score}`);
    if (score < THRESHOLD) {
      console.error(`  below target ${THRESHOLD}`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
