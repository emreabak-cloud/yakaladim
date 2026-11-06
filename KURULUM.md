# Yakaladım — Kupon, Rezervasyon ve Üyelik Altyapısı: Kurulum Rehberi

## 1. Ne kuruldu?

| Parça | Ne yapar | Dosya |
|---|---|---|
| Üyelik | E-posta + şifre ile üye ol / giriş / şifre sıfırlama, KVKK onayı, pazarlama izni | `giris.html`, `hesabim.html` |
| Kupon | Üye kampanyadan kupon alır; kişiye özel, tek kullanımlık `YK-XXXX-XXXX` kodu ve QR üretilir. İndirimli fiyat mekanda ödenir. | `kampanya.html`, `kupon.html` |
| Kupon bedeli | Kupon alınırken küçük bir bedel online ödenir (varsayılan: ürün fiyatının %1'i, en az 5 TL, en fazla 50 TL). Ödeme onaylanınca kod oluşur. Ödeme kapalıyken kuponlar ücretsizdir. | `odeme.html`, `supabase/functions/` |
| Rezervasyon | Otel / SPA / restoran kampanyalarında kupon alırken tarih, saat, kişi sayısı ve not girilir | `kampanya.html` |
| İşletme paneli | Kasiyer kodu yazar veya müşterinin QR'ını telefon kamerasıyla okutur → kupon doğrulanır → "kullanıldı" yapılır. Bugünkü rezervasyonlar ve satış özeti. | `isletme-paneli.html` |
| Yönetim paneli | Kampanya ve işletme ekle/düzenle, **işletme yayın izni takibi**, tüm kuponlar ve iadeler, üye rolleri, başvurular, **kupon bedeli ayarları** | `yonetim.html` |
| Veritabanı | Tablolar, güvenlik kuralları (RLS) ve tüm iş kuralları (stok, kişi başı limit, süre, rezervasyon) | `supabase/01_sema.sql` |
| Yasal | KVKK aydınlatma metni, kullanım koşulları, ön bilgilendirme + mesafeli satış sözleşmesi **şablonları** | `gizlilik.html`, `kullanim-kosullari.html`, `satis-sozlesmesi.html` |

**İki çalışma modu vardır:**
- **Demo modu** (`assets/js/yk-config.js` boşsa): her şey ziyaretçinin kendi tarayıcısında saklanır. Denemek için idealdir; gerçek müşteri için **kullanılmaz**. Sitenin üstünde "Demo modu" bandı görünür.
- **Canlı mod** (Supabase bağlıysa): üyeler, kuponlar ve kampanyalar veritabanında tutulur.

## 2. Supabase kurulumu (yaklaşık 20 dakika)

1. **Hesap ve proje:** supabase.com → ücretsiz hesap → *New project*.
   - Ad: `yakaladim`
   - Bölge: **Central EU (Frankfurt)**
   - Veritabanı şifresini bir yere kaydedin.
2. **Şemayı yükleyin:** sol menü *SQL Editor* → *New query* → `supabase/01_sema.sql` dosyasının tamamını yapıştırın → **Run**. "Success" görmelisiniz. Dosya tekrar çalıştırılabilir.
3. **(İsteğe bağlı) Örnek kampanyalar:** aynı şekilde `supabase/02_ornek_veri.sql` çalıştırılabilir. Bunlar uydurma örneklerdir; canlıda istemiyorsanız yüklemeyin.
4. **Giriş ayarları:** *Authentication* menüsünde şunları yapın:
   - *URL Configuration*:
     - Site URL: `https://www.yakaladim.com`
     - Redirect URLs: `https://www.yakaladim.com/giris.html` ve `https://yakaladim.com/giris.html`
   - *Sign In / Providers → Email*: **Confirm email açık kalsın.** Doğrulanmamış hesaplar kupon alamaz.
   - *Anonymous sign-ins*: kapalı kalsın.
   - *Emails → SMTP Settings*: Supabase'in kendi e-posta servisi saatte yalnızca birkaç e-posta gönderir, canlı için yetmez. Brevo hesabınızı bağlayın:
     - Host: `smtp-relay.brevo.com`
     - Port: `587`
     - Kullanıcı ve şifre: Brevo → *SMTP & API* sayfasından alınır
     - Gönderen: `info@yakaladim.com`

     Brevo'da `yakaladim.com` alan adını doğrulamanız gerekir.
   - *Emails → Templates*: "Confirm signup" ve "Reset password" şablonlarını Türkçe yazın. Örnek konu: "Yakaladım üyeliğinizi doğrulayın".
5. **Siteyi bağlayın:** *Project Settings → API* (veya *Connect*) sayfasından iki değeri alın ve `assets/js/yk-config.js` dosyasına yazın:
   - `supabaseUrl` → Project URL
   - `supabaseAnonKey` → anon / publishable key

   **service_role / secret anahtarını asla siteye koymayın.**
6. **İlk yöneticiyi atayın:**
   1. Sitede kendi e-postanızla üye olun ve e-postanızı doğrulayın.
   2. *SQL Editor*'da şunu çalıştırın:
      ```sql
      update public.profiller set rol = 'admin' where eposta = 'SIZIN-EPOSTANIZ';
      ```
   3. Artık `yakaladim.com/yonetim.html` açılır.
7. **İşletme ve kasiyer ekleyin:**
   1. Yönetim → İşletmeler → *Yeni işletme* (izin: Onaylandı).
   2. Kasiyer siteye üye olur.
   3. Yönetim → Üyeler'de kasiyerin rolünü "İşletme" yapıp işletmesini seçin.

   Kasiyer `isletme-paneli.html` sayfasından kuponları doğrular. Müşterinin QR'ını telefon kamerasıyla okuttuğunda panel o kuponla açılır.

## 2b. Kupon bedeli için ödeme (PayTR) kurulumu

Bu adımlar tamamlanana kadar kuponlar **ücretsiz** kalır; site normal çalışır.

1. **PayTR mağaza başvurusu:** paytr.com → Üye İşyeri Başvurusu. Şirket evrakları gerekir. Onaylanınca *Mağaza Paneli → Bilgi* sayfasından üç değeri alın: Mağaza No, Mağaza Parola, Mağaza Gizli Anahtar.
2. **Gizli değerleri girin:** Supabase → *Edge Functions → Secrets*:
   - `PAYTR_MERCHANT_ID` → Mağaza No
   - `PAYTR_MERCHANT_KEY` → Mağaza Parola
   - `PAYTR_MERCHANT_SALT` → Mağaza Gizli Anahtar
   - `PAYTR_TEST_MODE` → `1` (testler bitince `0`)
   - `SITE_URL` → `https://www.yakaladim.com`
3. **Fonksiyonları oluşturun:** Supabase → *Edge Functions → Deploy a new function → Via Editor*:
   - Ad `odeme-baslat`: `supabase/functions/odeme-baslat/index.ts` dosyasının tamamını yapıştırın → Deploy.
   - Ad `odeme-bildirim`: `supabase/functions/odeme-bildirim/index.ts` dosyasını yapıştırın → Deploy. Ardından fonksiyonun ayarlarında **"Verify JWT with legacy secret" / "Enforce JWT verification" seçeneğini KAPATIN**. PayTR bu adrese oturum açmadan bildirim gönderir; güvenliği imza (hash) kontrolü sağlar.
4. **Bildirim adresi:** PayTR Mağaza Paneli → *Ayarlar → Bildirim URL*: `https://<proje-kodunuz>.supabase.co/functions/v1/odeme-bildirim`.
5. **Test:**
   1. Yönetim → *Ayarlar* → "Kupon bedeli alınsın" kutusunu işaretleyin → Kaydet.
   2. Bir kampanyadan kupon alıp PayTR'nin test kartıyla ödeyin. Kupon birkaç saniye içinde aktifleşmeli.
   3. Başarısız ödemeyi de deneyin.
   4. Her şey yolundaysa `PAYTR_TEST_MODE` değerini `0` yapın.
6. **Kural ayarları:** Yönetim → *Ayarlar*'dan oran, en az / en fazla bedel ve ödeme süresi değiştirilebilir. Kampanyaya özel bedel kampanya düzenleme ekranından verilir; `0` yazılırsa o kampanyada kupon ücretsiz olur.

> PayTR entegrasyonu PayTR'nin iFrame API belgesine göre yazıldı. İmza hesapları bağımsız bir HMAC hesabıyla doğrulandı. Akışın tamamı taklit bir ödeme ekranıyla test edildi. Gerçek PayTR hesabıyla yalnızca **test modunda bir deneme** yapılması kaldı.

## 3. Yayına alma sırası

Değişiklikler GitHub'a **gönderilmedi**; bilgisayardaki ayrı dallarda duruyor:
- `altyapi` — kupon / üyelik / panel altyapısı.
- `grupanya-firsatlar` — `altyapi` + 50 Grupanya fırsatı (izin bekleyen taslak). **Bu dalı canlıya göndermeyin.**

Önerilen sıra:
1. Supabase'i kurun ve `yk-config.js`'i doldurun.
2. Bunu `altyapi` dalına commit edin, sonra `main`'e birleştirip push edin. Vercel otomatik yayınlar.
3. Grupanya işletmeleri için *SQL Editor*'da `supabase/03_ek_kampanyalar.sql` dosyasını çalıştırın. Bu dosya `grupanya-firsatlar` dalında. 50 kampanya **izin bekliyor** durumunda yüklenir, sitede görünmez.
4. Arama listesinden izin aldığınız her işletmeyi *Yönetim → İşletmeler*'de "Onaylandı" yapın. Kampanyası anında yayına girer. Görsel URL'sini *Yönetim → Kampanyalar → Düzenle*'den ekleyin.

`assets/data/kampanyalar-ek.js` dosyası canlıda gerekmez; kampanyalar veritabanından gelir.

## 4. Kurallar (veritabanında zorunlu)

- **Kupon şartları:** Kupon almak için giriş yapmış ve e-postası doğrulanmış olmak gerekir.
- **Kupon bedeli:**
  - Ödeme açıksa kupon önce "ödeme bekliyor" durumunda oluşur ve stoğu ödeme süresi boyunca (varsayılan 20 dk) ayırır. Ödeme onaylanınca kod üretilir.
  - Süre dolarsa ayrılan stok serbest kalır.
  - Süre dolduktan sonra gelen ödeme de kabul edilir ve kupon aktifleşir.
  - Tutar her zaman veritabanında hesaplanır; tarayıcıdan gelmez.
  - Ödeme onayını yalnızca imzası doğrulanmış PayTR bildirimi verebilir.
- **Kupon bedeli iadesi:**
  - Müşteri iptal ederse veya kuponu kullanmazsa bedel iade edilmez.
  - İşletme kaynaklı sorunlarda yönetici *Yönetim → Kuponlar → İade* ile iadeyi kaydeder.
  - Paranın kendisi PayTR panelinden iade edilir.
- **Kupon sınırları:**
  - Bir kişi aynı kampanyadan en fazla `kisi_basi_limit` kupon alabilir (varsayılan 5).
  - Bir hesap saatte en fazla 10 kupon alabilir.
  - Aynı anda en fazla 20 kullanılmamış kuponu olabilir.
- **Stok:** Toplam kupon sayısı `stok` ile sınırlanabilir. Aynı anda gelen taleplerde bile aşılmaz; 30 eşzamanlı istekle test edildi.
- **Kuponun süresi:** Kupon, alındıktan sonra `kupon_gecerlilik_gun` gün içinde ve en geç kampanya bitiş günü kullanılır. Rezervasyonlu kupon rezervasyon gününün sonuna kadar geçerlidir.
- **İptal:** Müşteri kullanılmamış kuponunu iptal edebilir; iptal edilen kupon stoğa geri döner.
- **Kampanyanın görünmesi:** Bir kampanya ancak işletmesinin izni "Onaylandı", işletmesi aktif ve kampanya "Yayında" ise görünür.
- **İşletmenin yetkisi:** İşletme yalnızca kendi kampanyalarının kuponlarını görür ve kullanabilir. Müşteri telefonunu yalnızca rezervasyonlu kuponlarda görür.
- **Veri erişimi:** Müşteri ve işletme veritabanı tablolarını doğrudan okuyamaz. Her şey yetki kontrollü fonksiyonlardan geçer.

## 5. Testler

```bash
# Veritabanı senaryoları (yerel PostgreSQL 16) — 121 test
python3 supabase/test/test_sema.py
# Tarayıcı testi — demo modu
python3 -m http.server 8770 &  python3 _kaynak/test/e2e.py http://localhost:8770
# Tarayıcı testi — taklit Supabase (gerçek şema + RLS üzerinde)
python3 supabase/test/taklit_sunucu.py 8790 ykmock &  python3 _kaynak/test/e2e.py http://localhost:8790
```

## 6. Henüz yapılmayanlar / sonraki adımlar

- **e-Arşiv fatura:** Her kupon bedeli satışı için fatura kesilmesi gerekir. PayTR fatura kesmez. Mali müşavirinizle bir e-arşiv entegratörü (ör. muhasebe programınız) seçin; kupon satış listesini yönetim panelinden alabilirsiniz. İstenirse otomatik fatura bağlantısı eklenebilir.
- **iyzico:** Şimdilik yalnızca PayTR desteği var. iyzico tercih edilirse yalnızca iki ödeme fonksiyonu değişir.
- **Kupon e-postası:** Kupon alındığında müşteriye e-posta gönderilmiyor; kupon hesapta duruyor. Brevo ile Supabase Edge Function eklenebilir.
- **Spam koruması:** Formlarda captcha yok, saatlik kaba bir sınır var. Gerekirse Cloudflare Turnstile eklenebilir.
- **Görsel yükleme:** Görseller şimdilik URL ile ekleniyor; Supabase Storage ile yükleme eklenebilir.
- **Yasal metinler:** KVKK, kullanım koşulları ve mesafeli satış sözleşmesi birer şablon. Kupon bedeli için cayma hakkı konusu özellikle netleştirilmeli. Satıcı / veri sorumlusu unvanı **Tourquaz Elite Lojistik ve Dış Ticaret Ltd. Şti.** olarak işlendi. Kalan köşeli parantezli alanlar (adres, vergi dairesi/no, MERSİS, telefon) doldurulmalı ve bir hukukçuya kontrol ettirilmeli.
- **Gelir modeli:** İşletmelerden komisyon veya yayın ücreti alınmaz; tek gelir üyelerin ödediği kupon bedelidir (Yönetim > Ayarlar).
