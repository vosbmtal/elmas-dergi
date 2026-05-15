/**
 * /sayilar/[slug]/source.pdf
 *
 * Cloudflare Workers'da R2'den PDF stream eder, attachment olarak iner.
 * Server-only endpoint (prerender=false). Workers'da filesystem yok, bu yüzden
 * slug doğrudan R2 key'e map edilir (convention: <slug>.pdf).
 */
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const slug = params.slug;
  if (!slug || !/^\d{4}-\d{2}$/.test(slug)) {
    return new Response("Geçersiz sayı slug'ı.", { status: 400 });
  }

  const env = (locals as any)?.runtime?.env as Env | undefined;
  if (!env?.PDFS) {
    return new Response(
      "PDF dosyası şu anda kullanılamıyor (R2 bucket bağlı değil).",
      { status: 503 },
    );
  }

  const r2Key = `${slug}.pdf`;
  const obj = await env.PDFS.get(r2Key);
  if (!obj) {
    return new Response("PDF bulunamadı.", { status: 404 });
  }

  const filename = `elmas-${slug}.pdf`;
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("content-type", "application/pdf");
  headers.set(
    "content-disposition",
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  headers.set("cache-control", "public, max-age=86400, immutable");
  if (obj.size) {
    headers.set("content-length", String(obj.size));
  }
  return new Response(obj.body, { headers });
};
