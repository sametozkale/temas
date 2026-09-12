import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"] });

async function main() {
  const { printSeedResult, seedDemo } = await import("@/lib/seed/demo");
  const force = process.argv.includes("--force");
  const result = await seedDemo({ force });
  printSeedResult(result);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
