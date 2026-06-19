# Yeni Sayı Ekleme Rehberi

ELMAS dergisinin yeni bir aylık sayısını yayınlamak için izleyeceğiniz adımlar.

## Önkoşullar (yalnızca bir kez)

```bash
# Sistem paketleri (macOS)
brew install poppler            # pdftoppm + pdftotext

# Cloudflare hesabına giriş
pnpm wrangler login

# R2 bucket'i oluştur (yalnızca ilk seferde)
pnpm wrangler r2 bucket create elmas-dergi-pdfs
```

## Aylık akış (her sayı için)

`YYYY-MM` slug formatı kullanılır. Örnek: Mayıs 2026 → `2026-05`.

### 1) Yeni sayı için iskelet oluştur

```bash
pnpm new:issue 2026-05 "Mayıs 2026"
```

Bu komut `content/issues/2026-05.yaml` dosyasını oluşturur. Düzenleyip
**summary** ve **highlights** alanlarını doldurun:

```yaml
slug: "2026-05"
title: "Mayıs 2026"
issueNumber: 2
publishedAt: 2026-05-31
summary: >-
  Bu sayıda öne çıkan içeriklerin kısa özeti…
editors:
  - "Mehtap Pülgir"
  - "Nagihan Karakaya"
highlights:
  - "Editörden"
  - "TEKNOFEST hazırlıkları"
  - "Mayıs'ın spor olayları"
r2Key: "2026-05.pdf"
```

### 2) Canva PDF'ini yerele kopyala

Canva'dan PDF olarak indirdiğiniz dosyayı `tmp/` klasörüne koyun:

```bash
cp ~/Downloads/MAYIS_DERGISI.pdf tmp/2026-05.pdf
```

### 3) PDF'i R2'ye yükle

Üretim ortamında PDF'i R2'den indirme butonu sunabilmek için bucket'a yüklenmesi gerekir:

```bash
pnpm wrangler r2 object put elmas-dergi-pdfs/2026-05.pdf \
  --file=./tmp/2026-05.pdf \
  --content-type=application/pdf
```

### 4) Görselleri ve metni oluştur

```bash
pnpm process:issue 2026-05
```

Bu komut PDF'i 204 DPI'da PNG'ye dönüştürür, her sayfa için WebP ve AVIF üretir, 200px arşiv thumb'ı ve 20px LQIP placeholder hazırlar, her sayfanın metnini `pdftotext` ile çıkarır ve `public/issues/2026-05/manifest.json` dosyasını yazar.

### 5) Local önizleme

```bash
pnpm dev
```

`http://localhost:4321` adresinden anasayfa ve flipbook'u kontrol edin. Mobile görünümü için Chrome DevTools'da iPhone 14 Pro genişliği (390px) seçin.

### 6) Commit + deploy

```bash
git add content/issues/2026-05.yaml docs/
git commit -m "Mayıs 2026 sayısı eklendi"
git push

# Deploy (DİKKAT: `pnpm deploy` değil — pnpm'in rezerve komutuyla çakışır)
pnpm run deploy
```

`pnpm run deploy` → `pnpm build` + `wrangler deploy` zincirleme çalışır. Build tüm sayıların görsellerini üretir, sonra Astro Cloudflare adapter'ı üzerinden Cloudflare Workers'a yüklenir. Custom domain `dergi.vosb.k12.tr` otomatik kullanılır.

## İlk kurulum (yeni bir makinede)

```bash
git clone <repo-url>
cd dergi
pnpm install
brew install poppler             # macOS

# Geçmiş PDF'leri R2'den yerele indir
pnpm wrangler r2 object get elmas-dergi-pdfs/2026-04.pdf --file=tmp/2026-04.pdf
# diğer sayılar için tekrarla

pnpm build                       # tüm görselleri yeniden üret
pnpm dev
```

## Sık karşılaşılan sorunlar

### "pdftoppm: command not found"

```bash
brew install poppler             # macOS
sudo apt install poppler-utils   # Ubuntu/Debian
```

### Görseller dev'de görünüyor ama deploy sonrası 404

`public/issues/<slug>/` git'te değil — her makinede `pnpm process:issue` çalıştırılmalı. CI'da bu otomatik (`pnpm build` zaten çağırır).

### PDF indir butonu "503" dönüyor

R2 bucket bağlı değil veya PDF yüklenmedi. Adım 3'ü tekrar kontrol edin:

```bash
pnpm wrangler r2 object list elmas-dergi-pdfs
```

### `dergi.vosb.k12.tr` deploy sonrası açılmıyor

İlk deploy'da Cloudflare custom domain'i kurarken birkaç dakika beklemek gerekebilir. `wrangler.toml`'da `routes` bölümü `custom_domain = true` ise DNS kaydı otomatik oluşur. Manuel CNAME EKLEMEYİN — çakışır.

```bash
pnpm wrangler deployments list
pnpm wrangler tail              # canlı log
```

## Bu sayfaları test etmeyi unutma

- `/` Anasayfa (hero + kapak + highlights)
- `/sayilar/<slug>` Flipbook (önceki/sonraki, sayfa indikatörü, paylaş, indir, metin görünümü)
- `/sayilar/<slug>#sayfa-12` Deep link
- `/arsiv` Tüm sayılar
- `/hakkimizda` Okul bilgisi
- Mobile (390px), desktop (1440px) iki ekran boyutunda
- Klavye `← →` ile sayfa çevirme
- `prefers-reduced-motion: reduce` ile animasyon kapanması
- Ekran okuyucu — "Metin görünümü" toggle ile sayfaların metnine erişim
