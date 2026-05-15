#!/usr/bin/env tsx
/**
 * new-issue.ts — Yeni bir sayı için scaffold oluştur.
 *
 * Kullanım:
 *   pnpm new:issue 2026-05 "Mayıs 2026"
 */
import { existsSync } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ISSUES_DIR = path.join(ROOT, "content", "issues");

async function nextIssueNumber(): Promise<number> {
  try {
    const files = await readdir(ISSUES_DIR);
    return files.filter((f) => f.endsWith(".yaml")).length + 1;
  } catch {
    return 1;
  }
}

async function main() {
  const slug = process.argv[2];
  const title = process.argv[3];
  if (!slug || !title) {
    console.error("Kullanım: pnpm new:issue <YYYY-MM> \"<Başlık>\"");
    console.error('Örnek:   pnpm new:issue 2026-05 "Mayıs 2026"');
    process.exit(1);
  }
  if (!/^\d{4}-\d{2}$/.test(slug)) {
    console.error("HATA: slug YYYY-MM formatında olmalı (örn. 2026-05)");
    process.exit(1);
  }

  const target = path.join(ISSUES_DIR, `${slug}.yaml`);
  if (existsSync(target)) {
    console.error(`HATA: ${target} zaten var.`);
    process.exit(1);
  }

  const issueNumber = await nextIssueNumber();
  const [year, month] = slug.split("-");
  const lastDay = new Date(Number(year), Number(month), 0)
    .toISOString()
    .slice(0, 10);

  const yaml = `slug: "${slug}"
title: "${title}"
issueNumber: ${issueNumber}
publishedAt: ${lastDay}
summary: >-
  TODO — bu sayıda öne çıkan içeriklerin kısa özeti.
editors:
  - "Mehtap Pülgir"
  - "Nagihan Karakaya"
students: []
highlights:
  - "TODO — Editörden"
  - "TODO — Ana başlık 2"
  - "TODO — Ana başlık 3"
r2Key: "${slug}.pdf"
`;

  await writeFile(target, yaml, "utf8");
  console.log(`✓ Yeni sayı oluşturuldu: ${target}`);
  console.log(`\nSonraki adımlar:`);
  console.log(`  1. PDF'i ./tmp/${slug}.pdf olarak koyun (Canva export)`);
  console.log(`  2. ${target} dosyasını düzenleyin (summary, highlights)`);
  console.log(`  3. PDF'i R2'ye yükleyin:`);
  console.log(`     pnpm wrangler r2 object put elmas-dergi-pdfs/${slug}.pdf --file=./tmp/${slug}.pdf`);
  console.log(`  4. pnpm process:issue ${slug}`);
  console.log(`  5. pnpm dev → kontrol`);
  console.log(`  6. git commit + pnpm deploy`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
