# ELMAS Dergisi

> Veliköy OSB Mesleki ve Teknik Anadolu Lisesi'nin aylık okul dergisi.
> Eğitim, üretim ve teknoloji odaklı içeriklerle.

🌐 **Canlı:** https://dergi.vosb.k12.tr

Astro 5 + Cloudflare Workers + R2 üzerine kurulu, PDF'i flipbook olarak
sunan açık kaynaklı bir okul dergisi platformu.

## Özellikler

- 📖 PDF'i interaktif flipbook olarak okuma (DearFlip)
- 📥 Orijinal PDF indirme
- 🔎 Sayfa-başına metin görünümü (OCR / PDF text extraction)
- 🖼️ Otomatik kapak / thumbnail / OG image üretimi (Sharp + pdftoppm)
- ☁️ Cloudflare Workers + R2 (PDF'ler R2'de, asset'ler edge'de)
- 🇹🇷 Tamamen Türkçe arayüz, SEO ve JSON-LD `PublicationIssue` schema
- 🧑‍🎓 Dergi ekibi & öğrenci ekibi kredilendirme

## Stack

| Katman      | Teknoloji                           |
| ----------- | ----------------------------------- |
| Framework   | [Astro 5](https://astro.build/)     |
| Hosting     | Cloudflare Workers (Assets + SSR)   |
| Storage     | Cloudflare R2 (orijinal PDF'ler)    |
| Stil        | Tailwind CSS v4                     |
| Flipbook    | DearFlip (CC BY-NC-ND 4.0)          |
| Görsel      | Sharp + Poppler (`pdftoppm`)        |

## Geliştirme

```bash
pnpm install
pnpm dev
```

### Yeni sayı eklemek

```bash
pnpm new:issue 2026-05 "Mayıs 2026"   # YAML şablon oluştur
# 1) ./tmp/2026-05.pdf — Canva export PDF'i buraya koyun
# 2) content/issues/2026-05.yaml — summary, highlights, öğrenci ekibi
pnpm process:issue 2026-05            # PNG/WebP/AVIF/OCR + manifest üret
```

Detay: [`docs/yeni-sayi-ekleme.md`](docs/yeni-sayi-ekleme.md)

### Sistem gereksinimleri

- Node.js 22+
- pnpm 10+
- `pdftoppm` (Poppler) — sayfa rasterleştirme için
  - macOS: `brew install poppler`
  - Debian/Ubuntu: `apt install poppler-utils`

## Dağıtım (Deployment)

```bash
pnpm run deploy   # pnpm build && wrangler deploy
```

`wrangler.toml` içinde Cloudflare account, R2 bucket ve custom domain
(`dergi.vosb.k12.tr`) tanımlıdır.

## Dizin yapısı

```
content/issues/<slug>.yaml   # Sayı metadata (YAML, git'te)
tmp/<slug>.pdf               # Kaynak PDF (R2'de tutulur, git'te değil)
public/issues/<slug>/...     # Üretilen asset'ler (rebuild edilir)
src/pages/                   # Astro sayfaları
src/components/Flipbook.astro
scripts/build-issue.ts       # PDF → manifest pipeline
```

## Dergi Ekibi

- **Editörler:** Mehtap Pülgir · Nagihan Karakaya
- **Öğrenci Ekibi:** Halil İbrahim Öz · Emirhan Akın

## Okulumuz

[Veliköy OSB Mesleki ve Teknik Anadolu Lisesi](https://velikoyosb.meb.k12.tr) —
Çerkezköy / Tekirdağ. Kimya, makine, metal, plastik ve otomasyon alanlarında
eğitim veren bir meslek lisesi. TÜBİTAK, TEKNOFEST, Erasmus ve
[GOAT 8092 FRC takımı](https://github.com/GOAT-8092) ile öğrencilerini
proje üretmeye teşvik eder.

## Lisans

- **Kaynak kodu:** [MIT](LICENSE)
- **Dergi içerikleri** (`content/issues/`): Veliköy OSB MTAL'e aittir, tüm
  hakları saklıdır.
- **DearFlip** (`public/dflip/`): [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) —
  ticari olmayan eğitim amaçlı kullanım.
