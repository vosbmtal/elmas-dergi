#!/usr/bin/env tsx
/**
 * build-issue.ts — Bir dergi sayısı için PDF işleme pipeline'ı.
 *
 * Akış:
 *   1. content/issues/<slug>.yaml meta dosyasını oku
 *   2. ./tmp/<slug>.pdf var mı? Yoksa kullanıcıyı uyar (R2'den manuel çek ya da local kopyala)
 *   3. pdftoppm -r 204 ile her sayfayı PNG'ye dönüştür
 *   4. sharp ile WebP + AVIF + thumbnail + LQIP üret
 *   5. pdftotext -layout ile her sayfanın metnini çıkar (erişilebilirlik + SEO)
 *   6. Kapaktan OG image üret (1200x630)
 *   7. manifest.json yaz
 *
 * Kullanım: pnpm process:issue 2026-04
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import yaml from "js-yaml";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
// 300 DPI A4 = 2480×3508 px native. Retina ekranlarda flipbook'un her sayfası
// ~1100 device px'e gelebiliyor; kaynak 2400 px civarı olursa 2x crisp.
const RENDER_DPI = 300;
const PAGE_MAX_WIDTH = 2400;

interface IssueMeta {
  slug: string;
  title: string;
  issueNumber: number;
  publishedAt: string;
  summary: string;
  editors: string[];
  students: string[];
  highlights: string[];
  r2Key: string;
}

interface PageManifestEntry {
  index: number;
  webp: string;
  avif: string;
  thumb: string;
  lqip: string;
  text: string;
  width: number;
  height: number;
}

interface IssueManifest {
  slug: string;
  title: string;
  issueNumber: number;
  publishedAt: string;
  summary: string;
  editors: string[];
  students: string[];
  highlights: string[];
  pageCount: number;
  cover: { webp: string; avif: string; thumb: string };
  pages: PageManifestEntry[];
  pdfPath: string;
  pdfBytes: number;
  sourceHash: string;
  generatedAt: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const log = (...args: unknown[]) => console.log("[build-issue]", ...args);

async function readMeta(slug: string): Promise<IssueMeta> {
  const file = path.join(ROOT, "content", "issues", `${slug}.yaml`);
  if (!existsSync(file)) {
    throw new Error(`Meta dosyası bulunamadı: ${file}`);
  }
  const text = await readFile(file, "utf8");
  return yaml.load(text) as IssueMeta;
}

async function hashFile(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

async function findPdf(slug: string): Promise<string> {
  const local = path.join(ROOT, "tmp", `${slug}.pdf`);
  if (existsSync(local)) return local;
  throw new Error(
    `PDF dosyası bulunamadı: ${local}\n` +
      `Lütfen Canva export PDF'ini buraya kopyalayın veya R2'den çekin:\n` +
      `  wrangler r2 object get elmas-dergi-pdfs/${slug}.pdf --file=${local}`,
  );
}

async function rasterizePages(pdfPath: string, workDir: string): Promise<string[]> {
  await mkdir(workDir, { recursive: true });
  log(`pdftoppm @ ${RENDER_DPI}dpi → PNG (${pdfPath})`);
  execFileSync(
    "pdftoppm",
    ["-r", String(RENDER_DPI), "-png", pdfPath, path.join(workDir, "page")],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  const files = (await readdir(workDir))
    .filter((f) => f.startsWith("page-") && f.endsWith(".png"))
    .sort();
  return files.map((f) => path.join(workDir, f));
}

async function extractText(pdfPath: string, pageCount: number, outDir: string) {
  await mkdir(outDir, { recursive: true });
  // pdftotext can extract specific pages with -f and -l flags
  for (let i = 1; i <= pageCount; i++) {
    const out = path.join(outDir, `${pad(i)}.txt`);
    execFileSync(
      "pdftotext",
      [
        "-layout",
        "-nopgbrk",
        "-enc",
        "UTF-8",
        "-f",
        String(i),
        "-l",
        String(i),
        pdfPath,
        out,
      ],
      { stdio: ["ignore", "ignore", "inherit"] },
    );
  }
}

async function processPages(
  pngFiles: string[],
  pagesDir: string,
  thumbsDir: string,
): Promise<PageManifestEntry[]> {
  await mkdir(pagesDir, { recursive: true });
  await mkdir(thumbsDir, { recursive: true });

  const entries: PageManifestEntry[] = [];

  for (let i = 0; i < pngFiles.length; i++) {
    const idx = i + 1;
    const src = pngFiles[i]!;
    const stem = pad(idx);

    const img = sharp(src);
    const meta = await img.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;

    // WebP (full) — yüksek çözünürlük, retina/tam ekran için
    await img
      .clone()
      .resize({ width: Math.min(width, PAGE_MAX_WIDTH), withoutEnlargement: true })
      .webp({ quality: 85, effort: 5 })
      .toFile(path.join(pagesDir, `${stem}.webp`));

    // AVIF (full) — daha küçük dosya, daha yavaş encode
    await img
      .clone()
      .resize({ width: Math.min(width, PAGE_MAX_WIDTH), withoutEnlargement: true })
      .avif({ quality: 65, effort: 4 })
      .toFile(path.join(pagesDir, `${stem}.avif`));

    // Thumbnail (200px wide WebP) — arşiv grid için
    await img
      .clone()
      .resize({ width: 200 })
      .webp({ quality: 75 })
      .toFile(path.join(thumbsDir, `${stem}.webp`));

    // LQIP: 20px wide blurred base64 data URI — flipbook'ta blur placeholder
    const lqipBuffer = await img
      .clone()
      .resize({ width: 20 })
      .webp({ quality: 30 })
      .toBuffer();
    const lqip = `data:image/webp;base64,${lqipBuffer.toString("base64")}`;

    entries.push({
      index: idx,
      webp: `pages/${stem}.webp`,
      avif: `pages/${stem}.avif`,
      thumb: `thumbs/${stem}.webp`,
      lqip,
      text: `text/${stem}.txt`,
      width,
      height,
    });

    process.stdout.write(`\r  sayfa ${idx}/${pngFiles.length} işlendi`);
  }
  process.stdout.write("\n");
  return entries;
}

async function makeCoverArtifacts(
  firstPng: string,
  outDir: string,
): Promise<{ webp: string; avif: string; thumb: string }> {
  // 800px wide cover thumbnail
  await sharp(firstPng)
    .resize({ width: 800 })
    .webp({ quality: 85 })
    .toFile(path.join(outDir, "thumbnail.webp"));
  return {
    webp: "pages/01.webp",
    avif: "pages/01.avif",
    thumb: "thumbnail.webp",
  };
}

async function makeOgImage(
  firstPng: string,
  meta: IssueMeta,
  ogPath: string,
) {
  const overlaySvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0a1f17" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="#1a3d2e" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#1a3d2e" stop-opacity="0.5"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="80" y="180" font-family="Playfair Display, Georgia, serif" font-weight="900" font-size="120" fill="#e8eef0">ELMAS</text>
  <text x="80" y="240" font-family="Inter, sans-serif" font-size="22" letter-spacing="6" fill="#94a4a8">SAYI ${meta.issueNumber} · ${meta.title.toUpperCase()}</text>
  <text x="80" y="430" font-family="Inter, sans-serif" font-weight="600" font-size="36" fill="#e8eef0">İlham veren fikirler,</text>
  <text x="80" y="478" font-family="Inter, sans-serif" font-weight="600" font-size="36" fill="#c9a961">güçlü yarınlar.</text>
  <text x="80" y="560" font-family="Inter, sans-serif" font-size="20" fill="#c4d0d3">Veliköy OSB Mesleki ve Teknik Anadolu Lisesi</text>
</svg>`);

  // Layered: blurred cover behind + green overlay + text
  const coverBg = await sharp(firstPng)
    .resize({ width: 1200, height: 630, fit: "cover", position: "right top" })
    .blur(8)
    .modulate({ brightness: 0.5 })
    .toBuffer();

  await sharp(coverBg)
    .composite([{ input: overlaySvg }])
    .png({ quality: 90 })
    .toFile(ogPath);
}

async function buildIssue(slug: string) {
  log(`Sayı işleniyor: ${slug}`);
  const meta = await readMeta(slug);

  const pdfPath = await findPdf(slug);
  const pdfStat = await stat(pdfPath);
  const sourceHash = await hashFile(pdfPath);

  const issueOut = path.join(ROOT, "public", "issues", slug);
  const pagesDir = path.join(issueOut, "pages");
  const thumbsDir = path.join(issueOut, "thumbs");
  const textDir = path.join(issueOut, "text");
  const ogDir = path.join(ROOT, "public", "og");
  const manifestPath = path.join(issueOut, "manifest.json");

  // Cache: aynı hash varsa atla
  if (existsSync(manifestPath)) {
    try {
      const existing = JSON.parse(await readFile(manifestPath, "utf8")) as IssueManifest;
      if (existing.sourceHash === sourceHash) {
        log(`✓ Cache hit (hash ${sourceHash}) — atlanıyor`);
        return;
      }
    } catch {
      // pass
    }
  }

  // Temizle
  await rm(issueOut, { recursive: true, force: true });
  await mkdir(issueOut, { recursive: true });
  await mkdir(ogDir, { recursive: true });

  const workDir = path.join(tmpdir(), `elmas-build-${slug}-${Date.now()}`);

  try {
    const pngFiles = await rasterizePages(pdfPath, workDir);
    log(`${pngFiles.length} sayfa rasterize edildi`);

    await extractText(pdfPath, pngFiles.length, textDir);
    log(`${pngFiles.length} sayfa metin çıkarıldı`);

    const pages = await processPages(pngFiles, pagesDir, thumbsDir);

    const cover = await makeCoverArtifacts(pngFiles[0]!, issueOut);
    log("Kapak thumbnail oluşturuldu");

    const ogPath = path.join(ogDir, `${slug}.png`);
    await makeOgImage(pngFiles[0]!, meta, ogPath);
    log("OG image oluşturuldu");

    const manifest: IssueManifest = {
      slug: meta.slug,
      title: meta.title,
      issueNumber: meta.issueNumber,
      publishedAt: meta.publishedAt,
      summary: meta.summary,
      editors: meta.editors,
      students: meta.students ?? [],
      highlights: meta.highlights,
      pageCount: pages.length,
      cover,
      pages,
      pdfPath: `/sayilar/${slug}/source.pdf`,
      pdfBytes: pdfStat.size,
      sourceHash,
      generatedAt: new Date().toISOString(),
    };

    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    log(`✓ Manifest yazıldı: ${manifestPath}`);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

const slug = process.argv[2];
if (!slug) {
  console.error("Kullanım: pnpm process:issue <slug>");
  console.error("Örnek:   pnpm process:issue 2026-04");
  process.exit(1);
}

buildIssue(slug).catch((err) => {
  console.error("[build-issue] HATA:", err);
  process.exit(1);
});
