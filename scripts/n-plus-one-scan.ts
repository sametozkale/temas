import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Flags `await` inside `for` loops in query modules — a cheap N+1 scan.
 * Legitimate sequential work (email fan-out, Inngest) lives outside queries.ts.
 */
const ROOT = path.resolve(process.cwd(), "lib");
const LOOP_AWAIT =
  /for\s*\([^)]*\)\s*\{[\s\S]{0,800}?\bawait\b|for\s+await\s*\(/m;

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.name === "queries.ts") {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const files = await walk(ROOT);
  const hits: { file: string; line: number }[] = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (!LOOP_AWAIT.test(source)) continue;
    const lines = source.split("\n");
    lines.forEach((line, i) => {
      if (/\bfor\s*\(/.test(line) || /\bfor await\s*\(/.test(line)) {
        const window = lines.slice(i, i + 12).join("\n");
        if (/\bawait\b/.test(window)) {
          hits.push({ file: path.relative(process.cwd(), file), line: i + 1 });
        }
      }
    });
  }

  if (hits.length === 0) {
    console.log(`n+1 scan: ${files.length} query modules, no loop awaits.`);
    return;
  }

  console.error("Possible N+1 (await inside for-loop in queries.ts):");
  for (const hit of hits) {
    console.error(`  ${hit.file}:${hit.line}`);
  }
  process.exit(1);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
