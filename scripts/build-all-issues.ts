#!/usr/bin/env tsx
/**
 * build-all-issues.ts — content/issues/*.yaml'daki tüm sayıları sırayla işle.
 * Astro build'den önce çalıştırılır.
 */
import { execFileSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ISSUES_DIR = path.join(ROOT, "content", "issues");

async function main() {
  let files: string[];
  try {
    files = await readdir(ISSUES_DIR);
  } catch {
    console.warn("[build-all] content/issues bulunamadı, atlanıyor.");
    return;
  }
  const slugs = files
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""))
    .sort();

  if (slugs.length === 0) {
    console.warn("[build-all] Hiç sayı yok.");
    return;
  }

  console.log(`[build-all] ${slugs.length} sayı işlenecek: ${slugs.join(", ")}`);

  for (const slug of slugs) {
    try {
      execFileSync(
        "tsx",
        [path.join(ROOT, "scripts", "build-issue.ts"), slug],
        { stdio: "inherit", cwd: ROOT },
      );
    } catch (err) {
      console.warn(`[build-all] ${slug} işlenemedi (PDF eksik olabilir):`, (err as Error).message);
      // CI ortamında PDF olmayabilir; sıkı hata yerine devam et
    }
  }
}

main();
