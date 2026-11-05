// Yakaladım — Ödeme başlat (Supabase Edge Function)
// Müşteri "ödeme bekliyor" durumundaki kuponu için PayTR ödeme ekranı (iframe) ister.
// Girişli kullanıcı çağırır (Verify JWT: AÇIK). Gövde: { "siparis_no": "YK..." }
// Dönen: { "tip": "iframe", "url": "https://www.paytr.com/odeme/guvenli/<token>" }

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

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (veri: unknown, durum = 200) =>
  new Response(JSON.stringify(veri), { status: durum, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ message: "Yalnızca POST." }, 405);

  try {
    const URL_ = Deno.env.get("SUPABASE_URL")!;
    // 1) Çağıran kullanıcıyı doğrula
    const kullaniciIstemci = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user }, error: girisHatasi } = await kullaniciIstemci.auth.getUser();
    if (girisHatasi || !user) return json({ message: "Ödeme için giriş yapmalısınız." }, 401);

    const { siparis_no } = await req.json().catch(() => ({}));
    if (!siparis_no || !/^YK[A-Z0-9]{8,40}$/.test(siparis_no)) return json({ message: "Geçersiz sipariş." }, 400);

    // 2) Sipariş tutarını veritabanından al (tutar asla tarayıcıdan alınmaz)
    const servis = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: s, error: dbHatasi } = await servis.rpc("odeme_hazirla", {
      p_siparis_no: siparis_no, p_kullanici: user.id,
    });
    if (dbHatasi) return json({ message: dbHatasi.message }, 400);

    // 3) PayTR token iste
    const p = ayarlar();
    const user_ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim()
      || req.headers.get("cf-connecting-ip") || "127.0.0.1";
    const payment_amount = String(Math.round(Number(s.tutar) * 100)); // kuruş
    const user_basket = utf8Base64(JSON.stringify([[`Yakaladım kuponu: ${s.baslik}`.slice(0, 120),
      (Number(s.tutar) / Number(s.adet)).toFixed(2), Number(s.adet)]]));
    const no_installment = "1", max_installment = "0", currency = "TL";
    const hashStr = p.merchant_id + user_ip + siparis_no + s.eposta + payment_amount + user_basket +
      no_installment + max_installment + currency + p.test_mode;
    const paytr_token = await hmacBase64(hashStr + p.merchant_salt, p.merchant_key);

    const form = new URLSearchParams({
      merchant_id: p.merchant_id, user_ip, merchant_oid: siparis_no, email: s.eposta,
      payment_amount, paytr_token, user_basket, debug_on: p.test_mode === "1" ? "1" : "0",
      no_installment, max_installment, user_name: s.ad_soyad, user_address: "Türkiye",
      user_phone: s.telefon || "05000000000",
      merchant_ok_url: `${p.site}/odeme.html?siparis=${siparis_no}&sonuc=basarili`,
      merchant_fail_url: `${p.site}/odeme.html?siparis=${siparis_no}&sonuc=basarisiz`,
      timeout_limit: String(Math.max(1, Number(s.kalan_dakika))), currency, test_mode: p.test_mode, lang: "tr",
    });
    const yanit = await fetch("https://www.paytr.com/odeme/api/get-token", { method: "POST", body: form });
    const sonuc = await yanit.json();
    if (sonuc.status !== "success") {
      console.error("PayTR token hatası:", sonuc.reason);
      return json({ message: "Ödeme ekranı açılamadı. Lütfen biraz sonra tekrar deneyin." }, 502);
    }
    return json({ tip: "iframe", url: `https://www.paytr.com/odeme/guvenli/${sonuc.token}` });
  } catch (e) {
    console.error(e);
    return json({ message: "Ödeme başlatılamadı." }, 500);
  }
});
