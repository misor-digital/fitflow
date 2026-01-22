import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const projectId = process.env.SUPABASE_PROJECT_ID;
if (!projectId) {
  console.error("Missing SUPABASE_PROJECT_ID (load it via dotenv / env vars).");
  process.exit(1);
}

// Where you want the types
const outFile = "lib/supabase/types.ts";
await mkdir(path.dirname(outFile), { recursive: true });

const args = ["gen", "types", "typescript", "--project-id", projectId];

const child = spawn(
  // Prefer local supabase binary if you have it; otherwise rely on PATH resolution via pnpm/dlx wrapping.
  // We'll call `supabase` directly because we'll run this through `pnpm dotenv -- ...`
  "pnpm",
  ["dlx", "supabase", ...args],
  {
    env: process.env,
    shell: process.platform === "win32", // important for Windows
    stdio: ["ignore", "pipe", "inherit"],
  }
);

let stdout = "";
child.stdout.on("data", (d) => (stdout += d.toString("utf8")));

const exitCode = await new Promise((resolve) => child.on("close", resolve));
if (exitCode !== 0) process.exit(exitCode);

await writeFile(outFile, stdout, "utf8");
console.log(`✅ Wrote ${outFile}`);
