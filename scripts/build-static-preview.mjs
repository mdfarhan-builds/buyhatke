import { cp, lstat, mkdir, mkdtemp, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = path.join(root, ".artifacts");
const destination = path.join(artifacts, "static-site");
const stage = await mkdtemp(path.join(tmpdir(), "pricewise-static-"));
let pending;

try {
  for (const entry of ["app", "components", "lib", "public", "tsconfig.json", "next-env.d.ts", "package.json", "postcss.config.mjs"]) {
    await cp(path.join(root, entry), path.join(stage, entry), {
      recursive: true,
      filter: (source) => source !== path.join(root, "app", "api")
    });
  }
  await symlink(path.join(root, "node_modules"), path.join(stage, "node_modules"), "dir");
  await writeFile(path.join(stage, "next.config.mjs"), `export default {
  output: "export",
  assetPrefix: "./",
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_PRICEWISE_UI_ONLY: "1" },
};\n`);
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build"], {
      cwd: stage,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_PRICEWISE_UI_ONLY: "1" },
      stdio: "inherit"
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`Static build failed (${signal || code}).`)));
  });
  await mkdir(artifacts, { recursive: true });
  pending = await mkdtemp(path.join(artifacts, ".static-site-"));
  await cp(path.join(stage, "out"), pending, { recursive: true });
  const previous = `${destination}.previous`;
  await rm(previous, { recursive: true, force: true });
  try {
    await lstat(destination);
    await rename(destination, previous);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  try {
    await rename(pending, destination);
    pending = undefined;
  } catch (error) {
    try { await rename(previous, destination); } catch {}
    throw error;
  }
  await rm(previous, { recursive: true, force: true });
  console.log(`Static UI preview ready: ${destination}`);
} finally {
  await rm(stage, { recursive: true, force: true });
  if (pending) await rm(pending, { recursive: true, force: true });
}
