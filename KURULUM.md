# Yakaladım — Kupon, Rezervasyon ve Üyelik Altyapısı: Kurulum Rehberi

## 1. Ne kuruldu?

| Parça | Ne yapar | Dosya |
|---|---|---|
| Üyelik | E-posta + şifre ile üye ol / giriş / şifre sıfırlama, KVKK onayı, pazarlama izni | `giris.html`, `hesabim.html` |
| Kupon | Üye kampanyadan ücretsiz kupon alır; kişiye özel, tek kullanımlık `YK-XXXX-XXXX` kodu ve QR üretilir. Ödeme mekanda yapılır. | `kampanya.html`, `kupon.html` |
| Rezervasyon | Otel / SPA / restoran kampanyalarında kupon alırken tarih, saat, kişi sayısı ve not girilir | `kampanya.html` |
| İşletme paneli | Kasiyer kodu yazar veya müşterinin QR'ını telefon kamerasıyla okutur → kupon doğrulanır → "kullanıldı" yapılır. Bugünkü rezervasyonlar ve satış özeti. | `isletme-paneli.html` |
| Yönetim paneli | Kampanya ve işletme ekle/düzenle, **işletme yayın izni takibi**, tüm kuponlar, üye rolleri, iletişim ve işletme başvuruları | `yonetim.html` |
| Veritabanı | Tablolar, güvenlik kuralları (RLS) ve tüm iş kuralları (stok, kişi başı limit, süre, rezervasyon) | `supabase/01_sema.sql` |
| Yasal | KVKK aydınlatma metni ve kullanım koşulları **şablonu** | `gizlilik.html`, `kullanim-kosullari.html` |

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
# Veritabanı senaryoları (yerel PostgreSQL 16)
python3 supabase/test/test_sema.py
# Tarayıcı testi — demo modu
python3 -m http.server 8770 &  python3 _kaynak/test/e2e.py http://localhost:8770
# Tarayıcı testi — taklit Supabase (gerçek şema + RLS üzerinde)
python3 supabase/test/taklit_sunucu.py 8790 ykmock &  python3 _kaynak/test/e2e.py http://localhost:8790
```

## 6. Henüz yapılmayanlar / sonraki adımlar

- **Online ön ödeme:** Alan hazır (`odeme_tipi = 'online'`) ama ödeme sağlayıcısı (iyzico / PayTR) bağlanmadı. Şimdilik ödeme mekanda yapılıyor.
- **Kupon e-postası:** Kupon alındığında müşteriye e-posta gönderilmiyor; kupon hesapta duruyor. Brevo ile Supabase Edge Function eklenebilir.
- **Spam koruması:** Formlarda captcha yok, saatlik kaba bir sınır var. Gerekirse Cloudflare Turnstile eklenebilir.
- **Görsel yükleme:** Görseller şimdilik URL ile ekleniyor; Supabase Storage ile yükleme eklenebilir.
- **Yasal metinler:** KVKK ve kullanım koşulları birer şablon. Köşeli parantezli alanlar (şirket unvanı, adres, MERSİS) doldurulmalı ve bir hukukçuya kontrol ettirilmeli.
