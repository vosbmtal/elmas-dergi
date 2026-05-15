#!/usr/bin/env tsx
/**
 * Default OG image — sosyal medya paylaşımları için.
 * Anasayfa, hakkımızda, arşiv vs. için kullanılır.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "og", "default.png");

const svg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a1f17"/>
      <stop offset="55%" stop-color="#0e2a1f"/>
      <stop offset="100%" stop-color="#1a3d2e"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.75" cy="0.25" r="0.6">
      <stop offset="0%" stop-color="#2a5a45" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#2a5a45" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Diamond icon -->
  <g transform="translate(80 80)">
    <rect width="56" height="56" rx="12" fill="#1a3d2e" stroke="#4a9270" stroke-width="1.5"/>
    <path d="M28 12 14 26l14 18 14-18z" stroke="#e8eef0" stroke-width="2" fill="none" stroke-linejoin="round"/>
    <path d="M14 26h28M21 26l7 18M35 26l-7 18" stroke="#e8eef0" stroke-width="1.6" stroke-linejoin="round"/>
  </g>

  <text x="80" y="280" font-family="Playfair Display, Georgia, serif" font-weight="900" font-size="140" fill="#e8eef0">ELMAS</text>
  <text x="80" y="330" font-family="Inter, sans-serif" font-size="22" letter-spacing="6" fill="#94a4a8">EĞİTİM · SANAYİ · KÜLTÜR · GELECEK</text>

  <text x="80" y="460" font-family="Playfair Display, Georgia, serif" font-style="italic" font-size="46" fill="#e8eef0">İlham veren fikirler,</text>
  <text x="80" y="510" font-family="Playfair Display, Georgia, serif" font-style="italic" font-size="46" fill="#c9a961">güçlü yarınlar.</text>

  <text x="80" y="580" font-family="Inter, sans-serif" font-size="20" fill="#c4d0d3">Veliköy OSB Mesleki ve Teknik Anadolu Lisesi · dergi.vosb.k12.tr</text>
</svg>
`);

await mkdir(path.dirname(OUT), { recursive: true });
await sharp(svg).png({ quality: 92 }).toFile(OUT);
console.log(`✓ Default OG image yazıldı: ${OUT}`);
