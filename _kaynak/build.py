#!/usr/bin/env python3
"""
Yakaladım.com sayfa üreticisi.
Ortak header/footer tek yerde durur; sayfaları yeniden üretmek için:
    python3 _kaynak/build.py
(Kampanya eklemek için bunu çalıştırmanıza gerek yok — sadece
 assets/data/kampanyalar.js dosyasını düzenleyin.)
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://www.yakaladim.com"

LOGO = """<a href="index.html" class="yk-logo" aria-label="Yakaladım ana sayfa">
   <span class="yk-logo-mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></span>
   <span class="yk-logo-text">yakala<span>dım</span><small>.com</small></span>
</a>"""

MENU = [
    ("index.html", "Ana Sayfa"),
    ("kampanyalar.html", "Tüm Fırsatlar"),
    ("kategoriler", "Kategoriler"),
    ("hakkimizda.html", "Hakkımızda"),
    ("iletisim.html", "İletişim"),
]

KATEGORI_MENU = [
    ("restoran", "Restoran", "fa-utensils"),
    ("kafe", "Kafe & Kahve", "fa-mug-hot"),
    ("urun", "Ürün", "fa-bag-shopping"),
    ("guzellik", "Güzellik & SPA", "fa-spa"),
    ("spor", "Spor", "fa-dumbbell"),
    ("eglence", "Eğlence", "fa-ticket"),
]


def head(title, desc, path, extra=""):
    return f"""<!doctype html>
<html lang="tr">
<head>
   <meta charset="utf-8">
   <meta http-equiv="x-ua-compatible" content="ie=edge">
   <meta name="viewport" content="width=device-width, initial-scale=1">
   <title>{title}</title>
   <meta name="description" content="{desc}">
   <meta name="robots" content="index, follow">
   <link rel="canonical" href="{SITE}/{path}">
   <meta property="og:type" content="website">
   <meta property="og:locale" content="tr_TR">
   <meta property="og:title" content="{title}">
   <meta property="og:description" content="{desc}">
   <meta property="og:url" content="{SITE}/{path}">
   <meta property="og:site_name" content="Yakaladım">
   <meta name="twitter:card" content="summary_large_image">
   <link rel="icon" type="image/svg+xml" href="assets/img/logo/favicon.svg">

   <link rel="stylesheet" href="assets/css/bootstrap.css">
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
   <link rel="stylesheet" href="assets/css/animate.css">
   <link rel="stylesheet" href="assets/css/spacing.css">
   <link rel="stylesheet" href="assets/css/main.css">
   <link rel="stylesheet" href="assets/css/yakaladim.css?v=1">
   <script>function ykImgFallback(i){{i.onerror=null;i.removeAttribute('src');i.classList.add('yk-img-fallback');}}</script>
{extra}</head>

<body>
"""


def header(active):
    items = []
    for href, label in MENU:
        cls = ' class="active"' if href == active else ""
        if href == "kategoriler":
            sub = "".join(
                f'<li><a href="kampanyalar.html?kategori={k}"><i class="fa-solid {ic}" style="color:#ff4a22;width:18px"></i> {ad}</a></li>'
                for k, ad, ic in KATEGORI_MENU
            )
            items.append(f'<li class="has-dropdown"><a href="kampanyalar.html">{label}</a><ul class="sub-menu">{sub}</ul></li>')
        else:
            items.append(f'<li{cls}><a href="{href}">{label}</a></li>')
    menu = "\n                              ".join(items)
    mobile = "".join(f'<li><a href="{h if h != "kategoriler" else "kampanyalar.html"}">{l}</a></li>' for h, l in MENU)

    return f"""
   <!-- back to top -->
   <div class="back-to-top-wrapper">
      <button id="back_to_top" type="button" class="back-to-top-btn" aria-label="Yukarı çık">
         <svg width="12" height="7" viewBox="0 0 12 7" fill="none"><path d="M11 6L6 1L1 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
   </div>

   <!-- mobil menü -->
   <div class="tp-offcanvas">
      <div class="tp-offcanvas-header mb-30 d-flex justify-content-between align-items-center">
         <div class="tp-offcanvas-logo">{LOGO}</div>
         <button class="tp-offcanvas-close-button" aria-label="Menüyü kapat" style="background:none;border:none;font-size:22px"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form class="mb-30" data-yk-search>
         <input class="yk-input" type="text" name="q" placeholder="Fırsat, mekan veya ürün ara...">
      </form>
      <nav class="yk-mobile-nav mb-30"><ul>{mobile}</ul></nav>
      <h5 class="tp-offcanvas-title">Fırsatı kaçırmayın</h5>
      <p>Şehrinizdeki restoran, kafe ve markaların en güncel indirimlerini tek yerde toplayan fırsat vitrini.</p>
      <a href="iletisim.html?tip=isletme" class="yk-btn mt-10">Kampanya Ekle</a>
   </div>
   <div class="tp-offcanvas-overlay"></div>

   <header class="tp-header-height">
      <div id="header-sticky" class="tp-header-area tp-header-lg-ptb tp-header-border tp-header-blur">
         <div class="container">
            <div class="row align-items-center">
               <div class="col-xl-8 col-6">
                  <div class="tp-header-left d-flex align-items-center">
                     <div class="tp-header-logo mr-50">
                        {LOGO}
                     </div>
                     <div class="tp-main-menu tp-menu-dropdown d-none d-xl-block">
                        <nav class="tp-mobile-menu-active">
                           <ul>
                              {menu}
                           </ul>
                        </nav>
                     </div>
                  </div>
               </div>
               <div class="col-xl-4 col-6">
                  <div class="tp-header-option d-flex align-items-center justify-content-end gap-2">
                     <a href="kampanyalar.html" class="d-none d-md-inline-flex yk-btn-outline" style="padding:8px 16px;font-size:14px"><i class="fa-solid fa-magnifying-glass"></i> Ara</a>
                     <a href="iletisim.html?tip=isletme" class="yk-header-cta d-none d-sm-inline-flex"><i class="fa-solid fa-store"></i> Kampanya Ekle</a>
                     <div class="tp-header-toogle-wrapper d-xl-none ml-10">
                        <button class="tp-header-toogle" aria-label="Menüyü aç">
                           <span></span>
                           <span></span>
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   </header>

   <main>
"""


def footer():
    kat_links = "".join(f'<li><a href="kampanyalar.html?kategori={k}">{ad}</a></li>' for k, ad, _ in KATEGORI_MENU[:5])
    return f"""
   </main>

   <footer>
      <div class="tp-footer-area tp-footer-6 z-index-2 pt-100 p-relative" data-bg-color="#fff3ed">
         <div class="container">
            <div class="tp-footer-subscribe-wrap pb-30">
               <div class="row align-items-center">
                  <div class="col-xxl-7 col-xl-6 col-lg-5">
                     <div class="mb-20">{LOGO}</div>
                     <div class="mb-30">
                        <h4 style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:8px">İşletmenizi Yakaladım'a Taşıyın</h4>
                        <p style="font-size:14px;color:#64748b;max-width:450px;margin-bottom:15px">Restoran, kafe ya da marka sahibi misiniz? Kampanyanızı binlerce fırsat avcısına ücretsiz ulaştırın.</p>
                        <a href="iletisim.html?tip=isletme" class="yk-btn" style="padding:9px 20px;font-size:14px">Kampanya Ekle</a>
                     </div>
                  </div>
                  <div class="col-xxl-5 col-xl-6 col-lg-7 col-md-9">
                     <div class="tp-footer-three-subscribe-form tp-footer-6-subscribe-form mb-20">
                        <h2 class="tp-footer-subscribe-title fs-32 fw-600 mb-10">Fırsat Bülteni</h2>
                        <p class="mb-25">Haftanın en iyi indirimleri ve sadece abonelere özel kupon kodları e-posta kutunuza gelsin.</p>
                        <div class="tp-footer-subscribe-form p-relative">
                           <form class="p-relative" data-yk-mail="Fırsat bülteni aboneliği">
                              <input class="tp-input" type="email" name="eposta" data-label="E-posta" placeholder="E-posta adresiniz" required>
                              <button class="tp-footer-subscribe-btn" type="submit" aria-label="Abone ol">
                                 <svg width="13" height="12" viewBox="0 0 13 12" fill="none"><path d="M11.8999 5.65039H0.650071" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.31703 10.6504C7.31703 10.6504 12.3169 6.9679 12.3169 5.65033C12.3169 4.33275 7.31694 0.650391 7.31694 0.650391" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                              </button>
                           </form>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div class="tp-footer-widget-wrap pt-60 pb-50">
               <div class="row">
                  <div class="col-lg-3 col-md-6 col-sm-6">
                     <div class="tp-footer-widget mb-30">
                        <h3 class="tp-footer-widget-title fw-600 mb-15">Yakaladım</h3>
                        <div class="tp-footer-widget-menu"><ul>
                           <li><a href="hakkimizda.html">Hakkımızda</a></li>
                           <li><a href="kampanyalar.html">Tüm Fırsatlar</a></li>
                           <li><a href="iletisim.html">İletişim</a></li>
                        </ul></div>
                     </div>
                  </div>
                  <div class="col-lg-3 col-md-6 col-sm-6">
                     <div class="tp-footer-widget mb-30">
                        <h3 class="tp-footer-widget-title fw-600 mb-15">Kategoriler</h3>
                        <div class="tp-footer-widget-menu"><ul>{kat_links}</ul></div>
                     </div>
                  </div>
                  <div class="col-lg-3 col-md-6 col-sm-6">
                     <div class="tp-footer-widget mb-30">
                        <h3 class="tp-footer-widget-title fw-600 mb-15">İşletmeler İçin</h3>
                        <div class="tp-footer-widget-menu"><ul>
                           <li><a href="iletisim.html?tip=isletme">Kampanya Ekle</a></li>
                           <li><a href="hakkimizda.html#isletmeler">Nasıl Çalışır?</a></li>
                           <li><a href="iletisim.html?tip=isletme">Öne Çıkarılma</a></li>
                        </ul></div>
                     </div>
                  </div>
                  <div class="col-lg-3 col-md-6 col-sm-6">
                     <div class="tp-footer-widget mb-30">
                        <h3 class="tp-footer-widget-title fw-600 mb-15">Bize Ulaşın</h3>
                        <div class="tp-footer-contact">
                           <span class="location mb-10 d-inline-block">İstanbul, Türkiye</span>
                           <a href="mailto:info@yakaladim.com" class="d-block mb-10">info@yakaladim.com</a>
                        </div>
                        <div class="yk-footer-social">
                           <a href="#" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
                           <a href="#" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
                           <a href="mailto:info@yakaladim.com" aria-label="E-posta"><i class="fa-solid fa-envelope"></i></a>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <div class="tp-copyright-area pt-25 pb-15" style="border-top:1px solid #e2e8f0">
            <div class="container">
               <div class="row align-items-center">
                  <div class="col-lg-7">
                     <p class="tp-ff-inter mb-5">© <span id="yk-year">2026</span> Yakaladım.com — Tüm hakları saklıdır.</p>
                  </div>
                  <div class="col-lg-5 text-lg-end">
                     <p class="mb-5" style="font-size:13px;color:#64748b">Kampanya koşulları ilgili işletme tarafından belirlenir.</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
   </footer>

   <script src="assets/js/vendor/jquery.js"></script>
   <script src="assets/js/bootstrap-bundle.js"></script>
   <script src="assets/js/magnific-popup.js"></script>
   <script src="assets/js/nice-select.js"></script>
   <script src="assets/js/moment.min.js"></script>
   <script src="assets/js/daterangepicker.js"></script>
   <script src="assets/js/purecounter.js"></script>
   <script src="assets/js/wow.min.js"></script>
   <script src="assets/js/main.js"></script>
   <script src="assets/data/kampanyalar.js?v=1"></script>
   <script src="assets/js/yakaladim.js?v=1"></script>
</body>
</html>
"""


def kategori_grid():
    out = []
    for k, ad, ic in KATEGORI_MENU:
        out.append(f"""
               <a href="kampanyalar.html?kategori={k}" class="yk-cat-item">
                  <span class="yk-cat-icon"><i class="fa-solid {ic}"></i></span>
                  <h4>{ad}</h4>
                  <span data-cat-count="{k}">&nbsp;</span>
               </a>""")
    return "".join(out)


FAQ = [
    ("Yakaladım nedir?", "Yakaladım; restoran, kafe, güzellik, spor ve online mağazaların indirimli kampanyalarını tek bir yerde toplayan bir fırsat vitrinidir. Kampanyaları kategori, şehir ve indirim oranına göre filtreleyip size uygun olanı saniyeler içinde bulabilirsiniz."),
    ("Kupon kodunu nasıl kullanırım?", "Kampanya sayfasındaki kupon kodunu kopyalayın. Restoran ve kafe gibi mekanlarda siparişten önce kodu görevliye söylemeniz, online mağazalarda ise sepet adımında kodu girmeniz yeterlidir."),
    ("Yakaladım üzerinden ödeme yapıyor muyum?", "Hayır. Yakaladım bir vitrin olarak çalışır; ödemeyi doğrudan işletmeye yaparsınız. Biz sizi en iyi fırsatla buluşturuyoruz."),
    ("Kampanyalar ne kadar süre geçerli?", "Her kampanyanın son geçerlilik tarihi kartında ve detay sayfasında yer alır. Süresi dolan kampanyalar siteden otomatik olarak kaldırılır."),
    ("İşletmemin kampanyasını nasıl eklerim?", "İletişim sayfasındaki \"İşletme Başvurusu\" formunu doldurmanız yeterli. Ekibimiz kampanyanızı inceleyip kısa sürede yayına alır."),
]


def faq_html():
    items = []
    for i, (q, a) in enumerate(FAQ):
        show = " show" if i == 0 else ""
        col = "" if i == 0 else " collapsed"
        items.append(f"""
            <div class="accordion-item">
               <h3 class="accordion-header" id="faq-h{i}">
                  <button class="accordion-button{col}" type="button" data-bs-toggle="collapse" data-bs-target="#faq-c{i}" aria-expanded="{'true' if i == 0 else 'false'}" aria-controls="faq-c{i}">{q}</button>
               </h3>
               <div id="faq-c{i}" class="accordion-collapse collapse{show}" aria-labelledby="faq-h{i}" data-bs-parent="#yk-faq">
                  <div class="accordion-body">{a}</div>
               </div>
            </div>""")
    return "".join(items)


def faq_schema():
    import json
    data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ],
    }
    return '   <script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + "</script>\n"


SCROLL_BTNS = """<div class="d-flex gap-2">
                  <button type="button" class="yk-nav-btn" data-scroll="-320" data-target="{t}" aria-label="Sola kaydır"><i class="fa-solid fa-chevron-left"></i></button>
                  <button type="button" class="yk-nav-btn" data-scroll="320" data-target="{t}" aria-label="Sağa kaydır"><i class="fa-solid fa-chevron-right"></i></button>
               </div>"""

# ------------------------------------------------------------------ SAYFALAR

def index_page():
    body = f"""
      <!-- HERO (HourlyBeds hero-3 düzeni) -->
      <div class="fix">
         <section class="yk-hero">
            <div class="container">
               <div class="row justify-content-center">
                  <div class="col-xl-10 text-center">
                     <span class="yk-hero-eyebrow"><i class="fa-solid fa-fire" style="color:#ff4a22"></i> Bu hafta <span id="yk-total-count">12</span> yeni fırsat</span>
                     <h1 class="yk-hero-title">Şehrin en iyi indirimlerini<br><span>sen yakala.</span></h1>
                     <p class="yk-hero-sub">Restoranlar, kafeler, güzellik salonları ve online mağazalardaki kampanyalar tek yerde. Kuponunu al, indirimini kap.</p>
                     <form class="yk-search" data-yk-search>
                        <span class="yk-search-icon"><i class="fa-solid fa-magnifying-glass"></i></span>
                        <input type="text" name="q" placeholder="Burger, kahvaltı, kulaklık, masaj..." aria-label="Fırsat ara">
                        <select name="sehir" aria-label="Şehir seç">
                           <option value="">Tüm şehirler</option>
                           <option value="istanbul">İstanbul</option>
                           <option value="izmir">İzmir</option>
                           <option value="ankara">Ankara</option>
                           <option value="online">Online</option>
                        </select>
                        <button type="submit">Ara</button>
                     </form>
                     <div class="yk-hero-points">
                        <span><i class="fa-solid fa-circle-check"></i> Ücretsiz kupon</span>
                        <span><i class="fa-solid fa-circle-check"></i> Her gün yeni kampanya</span>
                        <span><i class="fa-solid fa-circle-check"></i> Üyelik gerekmez</span>
                     </div>
                  </div>
               </div>
            </div>
         </section>
      </div>

      <!-- ÖNE ÇIKAN FIRSATLAR -->
      <section class="yk-section">
         <div class="container">
            <div class="yk-section-head">
               <div>
                  <span class="yk-eyebrow">Editörün seçimi</span>
                  <h2 class="yk-h2">Öne Çıkan Fırsatlar</h2>
               </div>
               {SCROLL_BTNS.format(t="yk-featured")}
            </div>
            <div id="yk-featured" class="yk-slider"></div>
         </div>
      </section>

      <!-- KATEGORİLER -->
      <section class="yk-section yk-section-soft">
         <div class="container">
            <div class="yk-section-head">
               <div>
                  <span class="yk-eyebrow">Ne arıyorsun?</span>
                  <h2 class="yk-h2">Kategoriye Göre Keşfet</h2>
                  <p class="yk-lead">Aklındaki şeyi seç, sana uygun kampanyaları hemen listeleyelim.</p>
               </div>
               <a href="kampanyalar.html" class="yk-link-more">Tüm fırsatlar <i class="fa-solid fa-arrow-right"></i></a>
            </div>
            <div class="yk-cat-grid">{kategori_grid()}
            </div>
         </div>
      </section>

      <!-- SON GÜNLER -->
      <section class="yk-section">
         <div class="container">
            <div class="yk-section-head">
               <div>
                  <span class="yk-eyebrow"><i class="fa-regular fa-clock"></i> Acele et</span>
                  <h2 class="yk-h2">Süresi Dolmak Üzere</h2>
                  <p class="yk-lead">Bu kampanyalar birkaç gün içinde sona eriyor.</p>
               </div>
               <a href="kampanyalar.html?sirala=bitis" class="yk-link-more">Hepsini gör <i class="fa-solid fa-arrow-right"></i></a>
            </div>
            <div id="yk-ending" class="yk-grid"></div>
         </div>
      </section>

      <!-- SAYAÇ BANDI -->
      <section class="yk-stats">
         <div class="container">
            <div class="row g-4">
               <div class="col-6 col-md-3"><div class="yk-stat"><strong id="yk-avg-off">%40</strong><span>Ortalama indirim</span></div></div>
               <div class="col-6 col-md-3"><div class="yk-stat"><strong>6</strong><span>Kategori</span></div></div>
               <div class="col-6 col-md-3"><div class="yk-stat"><strong>3</strong><span>Şehir + Online</span></div></div>
               <div class="col-6 col-md-3"><div class="yk-stat"><strong>0 TL</strong><span>Kullanım ücreti</span></div></div>
            </div>
         </div>
      </section>

      <!-- NASIL ÇALIŞIR -->
      <section class="yk-section">
         <div class="container">
            <div class="text-center mb-40">
               <span class="yk-eyebrow">3 adımda indirim</span>
               <h2 class="yk-h2">Nasıl Çalışır?</h2>
            </div>
            <div class="row g-4">
               <div class="col-md-4"><div class="yk-step"><div class="yk-step-num">1</div><h4>Fırsatı bul</h4><p>Kategori, şehir veya indirim oranına göre filtrele; aradığın kampanyayı saniyeler içinde bul.</p></div></div>
               <div class="col-md-4"><div class="yk-step"><div class="yk-step-num">2</div><h4>Kuponu kopyala</h4><p>Kampanya sayfasındaki kupon kodunu tek tıkla kopyala, koşulları kontrol et.</p></div></div>
               <div class="col-md-4"><div class="yk-step"><div class="yk-step-num">3</div><h4>İndirimi kap</h4><p>Mekanda görevliye söyle ya da online sepette kullan. Ödemeyi doğrudan işletmeye yaparsın.</p></div></div>
            </div>
         </div>
      </section>

      <!-- İŞLETME CTA -->
      <section class="pb-70">
         <div class="container">
            <div class="yk-biz-cta">
               <div>
                  <h3>İşletmen için kampanya mı var?</h3>
                  <p>Restoranını, kafeni ya da markanı binlerce fırsat avcısına ulaştır. Başvurunu birkaç dakikada yap, ekibimiz yayına alsın.</p>
               </div>
               <a href="iletisim.html?tip=isletme" class="yk-btn-white">Kampanyanı Ekle <i class="fa-solid fa-arrow-right"></i></a>
            </div>
         </div>
      </section>

      <!-- SSS -->
      <section class="yk-section yk-section-soft">
         <div class="container" style="max-width:900px">
            <div class="text-center mb-40">
               <span class="yk-eyebrow">Merak edilenler</span>
               <h2 class="yk-h2">Sıkça Sorulan Sorular</h2>
            </div>
            <div class="accordion yk-faq" id="yk-faq">{faq_html()}
            </div>
         </div>
      </section>
"""
    return (head("Yakaladım | Restoran, Kafe ve Ürün İndirimleri — Güncel Kampanyalar",
                 "İstanbul, İzmir ve Ankara'daki restoran, kafe, güzellik ve online mağaza kampanyaları tek yerde. Kupon kodunu al, indirimi yakala.",
                 "", faq_schema())
            + header("index.html") + body + footer())


def liste_page():
    body = """
      <section class="yk-page-hero">
         <div class="container">
            <div class="yk-breadcrumb"><a href="index.html">Ana Sayfa</a> / Tüm Fırsatlar</div>
            <h1>Tüm Fırsatlar</h1>
            <p>Kategori, şehir ve indirim oranına göre filtrele; sana en uygun kampanyayı yakala.</p>
         </div>
      </section>

      <section class="pt-40 pb-80">
         <div class="container">
            <div id="yk-cat-pills" class="yk-pill-row mb-25"></div>
            <div class="row">
               <div class="col-lg-3">
                  <button type="button" id="yk-filter-toggle" class="yk-btn-outline yk-filter-toggle mb-20"><i class="fa-solid fa-sliders"></i> Filtreler</button>
                  <aside id="yk-filter-box" class="yk-filter-box">
                     <div class="yk-filter-group">
                        <h5>Ara</h5>
                        <input id="yk-f-q" class="yk-input" type="search" placeholder="Mekan, ürün, semt...">
                     </div>
                     <div class="yk-filter-group">
                        <h5>Kategori</h5>
                        <div id="yk-f-kategori"></div>
                     </div>
                     <div class="yk-filter-group">
                        <h5>Şehir</h5>
                        <div id="yk-f-sehir"></div>
                     </div>
                     <div class="yk-filter-group">
                        <h5>Minimum indirim <span id="yk-f-min-val" style="color:#ff4a22;float:right">%0+</span></h5>
                        <input id="yk-f-min" class="yk-range" type="range" min="0" max="70" step="5" value="0">
                     </div>
                     <button type="button" id="yk-reset" class="yk-btn-outline w-100" style="padding:10px"><i class="fa-solid fa-rotate-left"></i> Filtreleri temizle</button>
                  </aside>
               </div>
               <div class="col-lg-9">
                  <div class="yk-list-toolbar">
                     <span class="yk-count" id="yk-count"></span>
                     <select id="yk-f-sirala" class="yk-select" aria-label="Sırala">
                        <option value="onerilen">Önerilen</option>
                        <option value="indirim">En yüksek indirim</option>
                        <option value="fiyat-artan">Fiyat: düşükten yükseğe</option>
                        <option value="fiyat-azalan">Fiyat: yüksekten düşüğe</option>
                        <option value="bitis">Bitiş tarihi yakın olan</option>
                     </select>
                  </div>
                  <div id="yk-list" class="yk-grid"></div>
               </div>
            </div>
         </div>
      </section>
"""
    return (head("Tüm Fırsatlar ve Kampanyalar | Yakaladım",
                 "Restoran, kafe, güzellik, spor, eğlence ve online ürün kampanyalarını kategori, şehir ve indirim oranına göre filtreleyin.",
                 "kampanyalar.html")
            + header("kampanyalar.html") + body + footer())


def detay_page():
    body = """
      <section class="yk-page-hero" style="padding:50px 0 40px">
         <div class="container">
            <div class="yk-breadcrumb"><a href="index.html">Ana Sayfa</a> / <a href="kampanyalar.html">Tüm Fırsatlar</a> / <span id="yk-bc-title">Kampanya</span></div>
            <h1 id="yk-hero-title" style="font-size:32px">Kampanya Detayı</h1>
            <p id="yk-hero-sub"></p>
         </div>
      </section>

      <section class="pt-50 pb-40">
         <div class="container" id="yk-detail"></div>
      </section>

      <section class="pb-80">
         <div class="container">
            <div class="yk-section-head">
               <div>
                  <span class="yk-eyebrow">Bunlar da ilgini çekebilir</span>
                  <h2 class="yk-h2">Benzer Fırsatlar</h2>
               </div>
               <a href="kampanyalar.html" class="yk-link-more">Tüm fırsatlar <i class="fa-solid fa-arrow-right"></i></a>
            </div>
            <div id="yk-similar" class="yk-grid"></div>
         </div>
      </section>
"""
    return (head("Kampanya Detayı | Yakaladım",
                 "Kampanya detayları, kupon kodu ve geçerlilik koşulları.",
                 "kampanya.html")
            + header("kampanyalar.html") + body + footer())


def hakkimizda_page():
    body = """
      <section class="yk-page-hero">
         <div class="container">
            <div class="yk-breadcrumb"><a href="index.html">Ana Sayfa</a> / Hakkımızda</div>
            <h1>Hakkımızda</h1>
            <p>İndirimi aramak yerine, indirim seni bulsun diye buradayız.</p>
         </div>
      </section>

      <section class="yk-section">
         <div class="container">
            <div class="row align-items-center g-5">
               <div class="col-lg-6">
                  <img class="yk-about-img" src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop" alt="Kalabalık bir restoranın iç mekanı" onerror="ykImgFallback(this)">
               </div>
               <div class="col-lg-6">
                  <span class="yk-eyebrow">Biz kimiz?</span>
                  <h2 class="yk-h2 mb-20">Şehrin fırsatlarını tek vitrinde topluyoruz</h2>
                  <p style="color:#475569;line-height:1.8">Yakaladım; restoranların, kafelerin, güzellik merkezlerinin, spor salonlarının ve online mağazaların indirimli kampanyalarını tek bir yerde sergileyen bir fırsat platformudur. Instagram hikayelerinde kaybolan, broşürlerde gözden kaçan kampanyaları derleyip aranabilir ve karşılaştırılabilir hale getiriyoruz.</p>
                  <p style="color:#475569;line-height:1.8">Kullanıcılarımız için üyelik ya da ücret yok. İşletmeler içinse yeni müşteriye ulaşmanın en sade yolu: kampanyanı gönder, biz vitrine koyalım.</p>
                  <div class="d-flex gap-2 flex-wrap mt-25">
                     <a href="kampanyalar.html" class="yk-btn">Fırsatları Keşfet</a>
                     <a href="iletisim.html?tip=isletme" class="yk-btn-outline">Kampanya Ekle</a>
                  </div>
               </div>
            </div>
         </div>
      </section>

      <section class="yk-section yk-section-soft">
         <div class="container">
            <div class="text-center mb-40">
               <span class="yk-eyebrow">Neden Yakaladım?</span>
               <h2 class="yk-h2">Fırsat avcıları için tasarlandı</h2>
            </div>
            <div class="row g-4">
               <div class="col-md-4"><div class="yk-value"><span class="yk-cat-icon"><i class="fa-solid fa-magnifying-glass"></i></span><h4>Tek yerde, filtreli</h4><p>Kategori, şehir ve indirim oranına göre saniyeler içinde süz.</p></div></div>
               <div class="col-md-4"><div class="yk-value"><span class="yk-cat-icon"><i class="fa-solid fa-shield-halved"></i></span><h4>Kontrollü kampanyalar</h4><p>Her kampanya yayına alınmadan önce işletmeyle teyit edilir.</p></div></div>
               <div class="col-md-4"><div class="yk-value"><span class="yk-cat-icon"><i class="fa-regular fa-clock"></i></span><h4>Hep güncel</h4><p>Süresi dolan kampanyalar otomatik kalkar; gördüğün her şey geçerlidir.</p></div></div>
            </div>
         </div>
      </section>

      <section class="yk-section" id="isletmeler">
         <div class="container">
            <div class="text-center mb-40">
               <span class="yk-eyebrow">İşletmeler için</span>
               <h2 class="yk-h2">Kampanyanı 3 adımda yayına al</h2>
            </div>
            <div class="row g-4 mb-50">
               <div class="col-md-4"><div class="yk-step"><div class="yk-step-num">1</div><h4>Başvur</h4><p>İletişim sayfasındaki işletme formuyla kampanya detaylarını gönder.</p></div></div>
               <div class="col-md-4"><div class="yk-step"><div class="yk-step-num">2</div><h4>Onayla</h4><p>Ekibimiz koşulları ve görselleri seninle netleştirsin.</p></div></div>
               <div class="col-md-4"><div class="yk-step"><div class="yk-step-num">3</div><h4>Müşteri karşıla</h4><p>Kampanyan yayına girsin, kupon koduyla gelen müşterileri ağırla.</p></div></div>
            </div>
            <div class="yk-biz-cta">
               <div>
                  <h3>Hemen başvur, ilk kampanyan ücretsiz</h3>
                  <p>Restoran, kafe, salon ya da e-ticaret markası fark etmez. Başvuru birkaç dakikanı alır.</p>
               </div>
               <a href="iletisim.html?tip=isletme" class="yk-btn-white">İşletme Başvurusu <i class="fa-solid fa-arrow-right"></i></a>
            </div>
         </div>
      </section>
"""
    return (head("Hakkımızda | Yakaladım",
                 "Yakaladım; restoran, kafe ve markaların indirim kampanyalarını tek vitrinde toplayan fırsat platformudur.",
                 "hakkimizda.html")
            + header("hakkimizda.html") + body + footer())


def iletisim_page():
    kat_opts = "".join(f'<option value="{ad}">{ad}</option>' for _, ad, _ in KATEGORI_MENU)
    body = f"""
      <section class="yk-page-hero">
         <div class="container">
            <div class="yk-breadcrumb"><a href="index.html">Ana Sayfa</a> / İletişim</div>
            <h1>İletişim</h1>
            <p>Soru, öneri ya da kampanya başvurusu — hepsi için buradayız.</p>
         </div>
      </section>

      <section class="yk-section">
         <div class="container">
            <div class="row g-4 mb-50">
               <div class="col-md-4"><div class="yk-info-card"><span class="yk-cat-icon"><i class="fa-solid fa-envelope"></i></span><div><h5>E-posta</h5><a href="mailto:info@yakaladim.com">info@yakaladim.com</a></div></div></div>
               <div class="col-md-4"><div class="yk-info-card"><span class="yk-cat-icon"><i class="fa-brands fa-whatsapp"></i></span><div><h5>WhatsApp</h5><p>Hafta içi 09:00 – 18:00</p></div></div></div>
               <div class="col-md-4"><div class="yk-info-card"><span class="yk-cat-icon"><i class="fa-solid fa-location-dot"></i></span><div><h5>Konum</h5><p>İstanbul, Türkiye</p></div></div></div>
            </div>

            <div class="row justify-content-center">
               <div class="col-lg-9">
                  <div class="yk-form-card">
                     <div class="yk-tabs">
                        <button type="button" class="yk-pill active" data-yk-tab="genel"><i class="fa-regular fa-comment"></i> Genel İletişim</button>
                        <button type="button" class="yk-pill" data-yk-tab="isletme"><i class="fa-solid fa-store"></i> İşletme Başvurusu</button>
                     </div>

                     <form data-yk-panel="genel" data-yk-mail="Yakaladım iletişim formu">
                        <div class="row g-3">
                           <div class="col-md-6"><label for="g-ad">Ad Soyad</label><input id="g-ad" class="yk-input" name="ad" data-label="Ad Soyad" required></div>
                           <div class="col-md-6"><label for="g-mail">E-posta</label><input id="g-mail" class="yk-input" type="email" name="eposta" data-label="E-posta" required></div>
                           <div class="col-12"><label for="g-konu">Konu</label><input id="g-konu" class="yk-input" name="konu" data-label="Konu"></div>
                           <div class="col-12"><label for="g-mesaj">Mesajınız</label><textarea id="g-mesaj" class="yk-textarea" rows="5" name="mesaj" data-label="Mesaj" required></textarea></div>
                           <div class="col-12"><button type="submit" class="yk-btn">Gönder <i class="fa-solid fa-paper-plane"></i></button></div>
                        </div>
                        <div class="yk-form-msg">E-posta uygulamanız açıldı. Mesajı gönderdiğinizde en kısa sürede dönüş yapacağız.</div>
                     </form>

                     <form data-yk-panel="isletme" data-yk-mail="Yeni işletme kampanya başvurusu" style="display:none">
                        <div class="row g-3">
                           <div class="col-md-6"><label for="i-isletme">İşletme adı</label><input id="i-isletme" class="yk-input" name="isletme" data-label="İşletme" required></div>
                           <div class="col-md-6"><label for="i-yetkili">Yetkili ad soyad</label><input id="i-yetkili" class="yk-input" name="yetkili" data-label="Yetkili" required></div>
                           <div class="col-md-6"><label for="i-tel">Telefon</label><input id="i-tel" class="yk-input" type="tel" name="telefon" data-label="Telefon" required></div>
                           <div class="col-md-6"><label for="i-mail">E-posta</label><input id="i-mail" class="yk-input" type="email" name="eposta" data-label="E-posta" required></div>
                           <div class="col-md-6"><label for="i-kat">Kategori</label><select id="i-kat" class="yk-select" name="kategori" data-label="Kategori">{kat_opts}</select></div>
                           <div class="col-md-6"><label for="i-sehir">Şehir / Semt</label><input id="i-sehir" class="yk-input" name="sehir" data-label="Şehir/Semt" placeholder="Örn. Kadıköy, İstanbul"></div>
                           <div class="col-md-4"><label for="i-eski">Normal fiyat (TL)</label><input id="i-eski" class="yk-input" type="number" name="eskiFiyat" data-label="Normal fiyat"></div>
                           <div class="col-md-4"><label for="i-yeni">Kampanyalı fiyat (TL)</label><input id="i-yeni" class="yk-input" type="number" name="yeniFiyat" data-label="Kampanyalı fiyat"></div>
                           <div class="col-md-4"><label for="i-bitis">Son geçerlilik tarihi</label><input id="i-bitis" class="yk-input" type="date" name="bitis" data-label="Bitiş"></div>
                           <div class="col-12"><label for="i-detay">Kampanya detayı ve koşulları</label><textarea id="i-detay" class="yk-textarea" rows="5" name="detay" data-label="Detay" required placeholder="Kampanyada neler var, hangi gün/saatlerde geçerli, kupon kodu var mı?"></textarea></div>
                           <div class="col-12"><button type="submit" class="yk-btn">Başvuruyu Gönder <i class="fa-solid fa-paper-plane"></i></button></div>
                        </div>
                        <div class="yk-form-msg">E-posta uygulamanız açıldı. Başvurunuzu gönderdiğinizde ekibimiz 1-2 iş günü içinde dönüş yapacak.</div>
                     </form>
                  </div>
               </div>
            </div>
         </div>
      </section>
"""
    return (head("İletişim ve İşletme Başvurusu | Yakaladım",
                 "Yakaladım ile iletişime geçin ya da işletmenizin kampanyasını eklemek için başvurun.",
                 "iletisim.html")
            + header("iletisim.html") + body + footer())


PAGES = {
    "index.html": index_page,
    "kampanyalar.html": liste_page,
    "kampanya.html": detay_page,
    "hakkimizda.html": hakkimizda_page,
    "iletisim.html": iletisim_page,
}

if __name__ == "__main__":
    for name, fn in PAGES.items():
        (ROOT / name).write_text(fn(), encoding="utf-8")
        print("yazıldı:", name)
