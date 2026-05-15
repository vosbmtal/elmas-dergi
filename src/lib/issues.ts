import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

const ROOT = process.cwd();

export interface PageEntry {
  index: number;
  webp: string;
  avif: string;
  thumb: string;
  lqip: string;
  text: string;
  width: number;
  height: number;
}

export interface IssueManifest {
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
  pages: PageEntry[];
  pdfPath: string;
  pdfBytes: number;
  sourceHash: string;
  generatedAt: string;
}

export interface IssueMeta {
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

export interface IssueWithStatus {
  meta: IssueMeta;
  manifest: IssueManifest | null;
  hasAssets: boolean;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await readFile(p);
    return true;
  } catch {
    return false;
  }
}

export async function loadIssueMeta(slug: string): Promise<IssueMeta | null> {
  const file = path.join(ROOT, "content", "issues", `${slug}.yaml`);
  if (!(await fileExists(file))) return null;
  const text = await readFile(file, "utf8");
  return yaml.load(text) as IssueMeta;
}

export async function loadIssueManifest(slug: string): Promise<IssueManifest | null> {
  const file = path.join(ROOT, "public", "issues", slug, "manifest.json");
  if (!(await fileExists(file))) return null;
  const text = await readFile(file, "utf8");
  return JSON.parse(text) as IssueManifest;
}

export async function loadIssue(slug: string): Promise<IssueWithStatus | null> {
  const meta = await loadIssueMeta(slug);
  if (!meta) return null;
  const manifest = await loadIssueManifest(slug);
  return { meta, manifest, hasAssets: manifest !== null };
}

export async function loadPageText(slug: string, page: number): Promise<string> {
  const file = path.join(
    ROOT,
    "public",
    "issues",
    slug,
    "text",
    `${String(page).padStart(2, "0")}.txt`,
  );
  try {
    return await readFile(file, "utf8");
  } catch {
    return "";
  }
}

export async function listIssues(): Promise<IssueWithStatus[]> {
  const dir = path.join(ROOT, "content", "issues");
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const slugs = files
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""))
    .sort((a, b) => b.localeCompare(a)); // en yeni önce

  const results: IssueWithStatus[] = [];
  for (const slug of slugs) {
    const issue = await loadIssue(slug);
    if (issue) results.push(issue);
  }
  return results;
}

export async function latestIssue(): Promise<IssueWithStatus | null> {
  const all = await listIssues();
  return all.find((i) => i.hasAssets) ?? all[0] ?? null;
}

export function issueUrl(slug: string): string {
  return `/sayilar/${slug}`;
}

export function issueAssetUrl(slug: string, rel: string): string {
  return `/issues/${slug}/${rel}`;
}

export function issuePdfUrl(slug: string): string {
  return `/sayilar/${slug}/source.pdf`;
}

export function ogImageUrl(slug: string): string {
  return `/og/${slug}.png`;
}

export function formatTurkishDate(iso: string): string {
  const d = new Date(iso);
  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTurkishMonthYear(iso: string): string {
  const d = new Date(iso);
  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}
