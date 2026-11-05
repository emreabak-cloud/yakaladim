// Yakaladım — PayTR ödeme bildirimi (Supabase Edge Function)
// PayTR, ödeme sonucunu bu adrese POST eder. Verify JWT: KAPALI olmalı (--no-verify-jwt).
// PayTR Mağaza Paneli > Bildirim URL: https://<proje>.supabase.co/functions/v1/odeme-bildirim
// Yanıt düz metin "OK" olmalıdır; aksi hâlde PayTR bildirimi tekrar gönderir.

import { createClient } from "jsr:@supabase/supabase-js@2";
// ---- PayTR yardımcıları (iki fonksiyonda da aynı) ----
// Belge: https://dev.paytr.com/iframe-api  (token ve bildirim hash'i HMAC-SHA256 + base64)

const encoder = new TextEncoder();

function base64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

async function hmacBase64(mesaj: string, anahtar: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(anahtar), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const imza = await crypto.subtle.sign("HMAC", key, encoder.encode(mesaj));
  return base64(new Uint8Array(imza));
}

function utf8Base64(metin: string): string {
  return base64(encoder.encode(metin));
}

// Sabit zamanlı karşılaştırma (bildirim hash'i için)
function esit(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

function ayarlar() {
  const merchant_id = Deno.env.get("PAYTR_MERCHANT_ID");
  const merchant_key = Deno.env.get("PAYTR_MERCHANT_KEY");
  const merchant_salt = Deno.env.get("PAYTR_MERCHANT_SALT");
  if (!merchant_id || !merchant_key || !merchant_salt) {
    throw new Error("PayTR anahtarları tanımlı değil (PAYTR_MERCHANT_ID / KEY / SALT).");
  }
  return {
    merchant_id, merchant_key, merchant_salt,
    test_mode: Deno.env.get("PAYTR_TEST_MODE") ?? "1",
    site: (Deno.env.get("SITE_URL") ?? "https://www.yakaladim.com").replace(/\/$/, ""),
  };
}
// ---- /PayTR yardımcıları ----

const metin = (t: string, durum = 200) => new Response(t, { status: durum, headers: { "Content-Type": "text/plain" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return metin("Yalnızca POST", 405);
  try {
    const p = ayarlar();
    const f = new URLSearchParams(await req.text());
    const merchant_oid = f.get("merchant_oid") ?? "";
    const status = f.get("status") ?? "";
    const total_amount = f.get("total_amount") ?? "";
    const gelenHash = f.get("hash") ?? "";

    // 1) İmza doğrulaması: bildirimin gerçekten PayTR'den geldiğini kanıtlar
    const beklenen = await hmacBase64(merchant_oid + p.merchant_salt + status + total_amount, p.merchant_key);
    if (!esit(beklenen, gelenHash)) {
      console.error("Geçersiz PayTR imzası", merchant_oid);
      return metin("PAYTR notification failed: bad hash", 400);
    }

    const servis = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = status === "success"
      ? await servis.rpc("odeme_onayla", {
          p_siparis_no: merchant_oid, p_tutar: Number(total_amount) / 100, p_saglayici: "paytr",
          p_ref: f.get("payment_type") ?? null,
        })
      : await servis.rpc("odeme_basarisiz", {
          p_siparis_no: merchant_oid, p_saglayici: "paytr",
          p_ref: `${f.get("failed_reason_code") ?? ""} ${f.get("failed_reason_msg") ?? ""}`.trim() || null,
        });

    if (error) {
      console.error("Veritabanı hatası:", merchant_oid, error.message);
      // Sipariş yoksa tekrar denemenin faydası yok; diğer hatalarda PayTR yeniden denesin
      if (/bulunamadı/i.test(error.message)) return metin("OK");
      return metin("Geçici hata", 500);
    }
    return metin("OK");
  } catch (e) {
    console.error(e);
    return metin("Hata", 500);
  }
});
