#!/usr/bin/env python3
"""
Uçtan uca tarayıcı testi (Playwright + Chromium).
Kullanım:
    python3 _kaynak/test/e2e.py http://localhost:8770  [ekran_goruntusu_klasoru]
Sunucu demo modunda (yk-config boş) veya taklit Supabase ile çalışabilir.
Akış: üye ol → kupon al → QR'ı çöz → rezervasyonlu kupon → iptal →
      işletme kuponu doğrular ve kullanır → yönetici izin kuralını sınar.
"""
import re
import sys
import time
import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

TABAN = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8770"
EKRAN = Path(sys.argv[2]) if len(sys.argv) > 2 else None
GECTI, KALDI, JS_HATALARI = 0, [], []


def bekle(ad, kosul, detay=""):
    global GECTI
    if kosul:
        GECTI += 1
        print("  ✓", ad)
    else:
        KALDI.append(ad)
        print("  ✗", ad, detay)


def ekran(sayfa, ad, tam=True):
    if EKRAN:
        EKRAN.mkdir(parents=True, exist_ok=True)
        sayfa.screenshot(path=str(EKRAN / f"{ad}.png"), full_page=tam)


def qr_coz(png_yolu):
    try:
        import cv2
        img = cv2.imread(str(png_yolu))
        for olcek in (1.0, 1.5, 2.0, 0.75):
            im = cv2.resize(img, None, fx=olcek, fy=olcek, interpolation=cv2.INTER_NEAREST)
            v, _, _ = cv2.QRCodeDetector().detectAndDecode(im)
            if v:
                return v
    except Exception as e:  # noqa: BLE001
        return f"hata: {e}"
    return ""


EPOSTA = f"test{int(time.time())}@ornek.com"

with sync_playwright() as p:
    tarayici = p.chromium.launch()
    ctx = tarayici.new_context(viewport={"width": 1366, "height": 900}, locale="tr-TR", timezone_id="Europe/Istanbul")
    sayfa = ctx.new_page()
    sayfa.on("pageerror", lambda e: JS_HATALARI.append(f"{sayfa.url}: {e}"))
    sayfa.on("console", lambda m: JS_HATALARI.append(f"{sayfa.url}: console.{m.type}: {m.text}") if m.type == "error" and "Failed to load resource" not in m.text else None)
    # Dış kaynakları (CDN ikonları, görseller) test için engelle; yerel sunucu ve taklit API serbest
    sayfa.route(re.compile(r"^https?://(?!localhost|127\.0\.0\.1).*"), lambda r: r.abort())

    print("Ziyaretçi")
    sayfa.goto(TABAN + "/index.html")
    sayfa.wait_for_selector("#yk-featured .yk-card", timeout=10000)
    bekle("ana sayfada kampanya kartları yüklenir", sayfa.locator("#yk-featured .yk-card").count() > 0)
    bekle("üst menüde 'Giriş Yap' görünür", "Giriş" in sayfa.locator("#yk-uye-btn").inner_text())
    ekran(sayfa, "01-ana-sayfa")

    sayfa.goto(TABAN + "/kampanyalar.html?kategori=restoran")
    sayfa.wait_for_selector("#yk-list .yk-card, #yk-list .yk-empty")
    n = sayfa.locator("#yk-list .yk-card").count()
    bekle("kategori filtresi çalışır", n > 0 and "fırsat bulundu" in sayfa.locator("#yk-count").inner_text(), n)

    sayfa.goto(TABAN + "/hesabim.html")
    sayfa.wait_for_url(re.compile(r"giris\.html"), timeout=8000)
    bekle("giriş yapmadan hesabım → giriş sayfasına yönlenir", "giris.html" in sayfa.url)

    print("\nÜyelik ve kupon")
    sayfa.goto(TABAN + "/kampanya.html?id=kadikoy-burger-menu")
    btn = sayfa.locator("#yk-kupon-al")
    btn.wait_for()
    bekle("detayda 'Giriş Yap ve Kuponu Al' düğmesi", "Giriş Yap" in btn.inner_text())
    ekran(sayfa, "02-kampanya-detay")
    btn.click()
    sayfa.wait_for_url(re.compile(r"giris\.html\?donus="))
    bekle("kupon için giriş sayfasına geri dönüş adresiyle gidilir", "kampanya.html" in sayfa.url and "neden=kupon" in sayfa.url)
    sayfa.click("[data-auth-tab=kayit]")
    sayfa.fill("#kr-ad", "Ayşe Test")
    sayfa.fill("#kr-eposta", EPOSTA)
    sayfa.fill("#kr-tel", "0555 111 22 33")
    sayfa.fill("#kr-sifre", "kisa")
    sayfa.click("#yk-kayit-form [type=submit]")
    bekle("kısa şifre reddedilir", "8 karakter" in sayfa.locator("#yk-auth-mesaj").inner_text())
    sayfa.fill("#kr-sifre", "GucluSifre123")
    sayfa.click("#yk-kayit-form [type=submit]")
    bekle("KVKK onayı olmadan üye olunamaz", "KVKK" in sayfa.locator("#yk-auth-mesaj").inner_text())
    sayfa.check("#yk-kayit-form [name=kvkk]")
    ekran(sayfa, "03-uye-ol")
    sayfa.click("#yk-kayit-form [type=submit]")
    sayfa.wait_for_url(re.compile(r"kampanya\.html\?id=kadikoy-burger-menu"), timeout=10000)
    bekle("üyelikten sonra kampanyaya geri dönülür", True)
    sayfa.wait_for_selector("#yk-kupon-al")
    bekle("üst menüde kullanıcı adı görünür", "Ayşe" in sayfa.locator("#yk-uye-btn").inner_text())
    sayfa.select_option("#yk-adet", "2")
    bekle("adet değişince toplam güncellenir", "1.180" in sayfa.locator("#yk-toplam").inner_text(), sayfa.locator("#yk-toplam").inner_text())
    sayfa.click("#yk-kupon-al")
    sayfa.wait_for_url(re.compile(r"kupon\.html\?kod=YK-"), timeout=10000)
    kod = re.search(r"kod=(YK-[A-Z0-9-]+)", sayfa.url).group(1)
    sayfa.wait_for_selector(".yk-voucher-kod")
    bekle("kupon sayfasında kod görünür", sayfa.locator(".yk-voucher-kod").inner_text() == kod, kod)
    bekle("toplam tutar 2 adet için doğru", "1.180" in sayfa.locator(".yk-voucher-tutar strong").inner_text())
    ekran(sayfa, "04-kupon")
    if EKRAN:
        sayfa.locator(".yk-voucher-qr svg").screenshot(path=str(EKRAN / "qr.png"))
        cozulen = qr_coz(EKRAN / "qr.png")
        bekle("QR kod okunur ve işletme paneli linkini içerir", cozulen.endswith("isletme-paneli.html?kod=" + kod), cozulen)

    print("\nRezervasyonlu kupon")
    sayfa.goto(TABAN + "/kampanya.html?id=besiktas-serpme-kahvalti")
    sayfa.wait_for_selector("#yk-rez-tarih")
    sayfa.click("#yk-kupon-al")
    bekle("tarih seçilmeden rezervasyon alınmaz", "tarih" in sayfa.locator("#yk-kupon-hata").inner_text().lower())
    yarin = (datetime.date.today() + datetime.timedelta(days=2)).isoformat()
    sayfa.fill("#yk-rez-tarih", yarin)
    sayfa.select_option("#yk-rez-saat", "10:30")
    sayfa.select_option("#yk-rez-kisi", "4")
    sayfa.fill("#yk-not", "Bahçede masa lütfen")
    ekran(sayfa, "05-rezervasyon-formu")
    sayfa.click("#yk-kupon-al")
    sayfa.wait_for_url(re.compile(r"kupon\.html"), timeout=10000)
    sayfa.wait_for_selector(".yk-voucher")
    metin = sayfa.locator(".yk-voucher").inner_text()
    bekle("kuponda rezervasyon saati, kişi ve not görünür", "10:30" in metin and "4 kişi" in metin and "Bahçede" in metin)
    rez_kod = re.search(r"kod=(YK-[A-Z0-9-]+)", sayfa.url).group(1)

    print("\nHesabım")
    sayfa.goto(TABAN + "/hesabim.html")
    sayfa.wait_for_selector(".yk-kupon-satir")
    bekle("hesabımda 2 kupon listelenir", sayfa.locator(".yk-kupon-satir").count() == 2)
    ekran(sayfa, "06-hesabim")
    iptal = sayfa.locator(".yk-kupon-satir", has_text=rez_kod).locator("[data-iptal]")
    iptal.click()
    bekle("iptal iki adımlı onay ister", "Emin misin" in iptal.inner_text())
    iptal.click()
    sayfa.wait_for_timeout(600)
    sayfa.click("[data-filtre=iptal]")
    bekle("iptal edilen kupon 'İptal' filtresinde", sayfa.locator(".yk-kupon-satir", has_text=rez_kod).count() == 1)
    sayfa.click("[data-sekme=profil]")
    sayfa.fill("#pf-tel", "0555 999 88 77")
    sayfa.click("#yk-profil-form [type=submit]")
    sayfa.wait_for_selector(".yk-toast-basari")
    bekle("profil güncellenir", True)
    sayfa.click("[data-sekme=kuponlar]")
    sayfa.click("#yk-cikis")
    sayfa.wait_for_url(re.compile(r"index\.html"))
    bekle("çıkış yapılır", "Giriş" in sayfa.locator("#yk-uye-btn").inner_text())

    print("\nİşletme paneli")
    sayfa.goto(TABAN + f"/isletme-paneli.html?kod={kod}")
    sayfa.wait_for_url(re.compile(r"giris\.html"))
    sayfa.fill("#gr-eposta", "isletme@demo.yakaladim.com")
    sayfa.fill("#gr-sifre", "yanlis-sifre")
    sayfa.click("#yk-giris-form [type=submit]")
    try:
        expect(sayfa.locator("#yk-auth-mesaj")).to_contain_text("hatalı", timeout=8000)
        bekle("yanlış şifre reddedilir", True)
    except AssertionError as e:
        bekle("yanlış şifre reddedilir", False, e)
    sayfa.fill("#gr-sifre", "demo1234")
    sayfa.click("#yk-giris-form [type=submit]")
    sayfa.wait_for_url(re.compile(r"isletme-paneli\.html\?kod="), timeout=10000)
    sayfa.wait_for_selector(".yk-sonuc-kart")
    bekle("QR linkiyle açılan panel kuponu otomatik sorgular", "Geçerli kupon" in sayfa.locator(".yk-sonuc-kart").inner_text())
    bekle("müşteri adı ve tahsil tutarı görünür", "Ayşe Test" in sayfa.locator(".yk-sonuc-kart").inner_text() and "1.180" in sayfa.locator(".yk-sonuc-kart").inner_text())
    ekran(sayfa, "07-isletme-sorgu")
    sayfa.click("#yk-kullan")
    bekle("kullanma iki adımlı onay ister", "tekrar dokunun" in sayfa.locator("#yk-kullan").inner_text())
    sayfa.click("#yk-kullan")
    sayfa.wait_for_selector(".yk-sonuc-kart:has-text('Kullanıldı')")
    bekle("kupon kullanıldı olarak işaretlenir", True)
    ekran(sayfa, "08-isletme-kullanildi")
    sayfa.fill("#yk-kod", kod.lower().replace("-", " "))
    sayfa.click("#yk-kod-form [type=submit]")
    sayfa.wait_for_timeout(500)
    bekle("küçük harf/boşlukla yazılan kod da bulunur ve 'Kullanıldı' görünür", "Kullanıldı" in sayfa.locator("#yk-sonuc").inner_text())
    sayfa.fill("#yk-kod", rez_kod)
    sayfa.click("#yk-kod-form [type=submit]")
    sayfa.wait_for_timeout(500)
    bekle("başka işletmenin kuponu bulunamaz", "bulunamadı" in sayfa.locator("#yk-sonuc").inner_text().lower())

    print("\nYönetim")
    sayfa.goto(TABAN + "/hesabim.html")
    sayfa.wait_for_selector("#yk-cikis")
    sayfa.click("#yk-cikis")
    sayfa.wait_for_url(re.compile(r"index\.html"))
    sayfa.goto(TABAN + "/yonetim.html")
    sayfa.wait_for_url(re.compile(r"giris\.html"))
    sayfa.fill("#gr-eposta", "yonetici@demo.yakaladim.com")
    sayfa.fill("#gr-sifre", "demo1234")
    sayfa.click("#yk-giris-form [type=submit]")
    sayfa.wait_for_url(re.compile(r"yonetim\.html"), timeout=10000)
    sayfa.wait_for_selector(".yk-ozet-kutu")
    bekle("yönetim özeti yüklenir", sayfa.locator(".yk-ozet-kutu").count() >= 8)
    ekran(sayfa, "09-yonetim-ozet")

    sayfa.click("[data-sekme=isletmeler]")
    sayfa.click("#yk-i-yeni")
    sayfa.fill("#yk-if [name=ad]", "Test Kafe Bekleyen")
    sayfa.select_option("#yk-if [name=izin_durumu]", "bekliyor")
    sayfa.fill("#yk-if [name=telefon]", "0212 555 55 55")
    sayfa.click("#yk-if [type=submit]")
    sayfa.wait_for_selector("text=Test Kafe Bekleyen")
    bekle("yönetici izin bekleyen işletme ekler", True)

    sayfa.click("[data-sekme=kampanyalar]")
    sayfa.click("#yk-k-yeni")
    sayfa.fill("#yk-kf [name=baslik]", "Test kahve kampanyası")
    deger = sayfa.locator("#yk-kf [name=isletme_id] option", has_text="Test Kafe Bekleyen").get_attribute("value")
    sayfa.select_option("#yk-kf [name=isletme_id]", deger)
    sayfa.select_option("#yk-kf [name=durum]", "yayinda")
    sayfa.fill("#yk-kf [name=eski_fiyat]", "200")
    sayfa.fill("#yk-kf [name=yeni_fiyat]", "120")
    sayfa.fill("#yk-kf [name=bitis]", (datetime.date.today() + datetime.timedelta(days=20)).isoformat())
    sayfa.fill("#yk-kf [name=kosullar]", "Hafta içi geçerli\nPaket serviste geçerli değil")
    ekran(sayfa, "10-yonetim-kampanya-formu", tam=False)
    sayfa.click("#yk-kf [type=submit]")
    sayfa.wait_for_selector("text=Test kahve kampanyası")
    bekle("yönetici kampanya ekler (kimlik otomatik)", sayfa.locator("text=test-kahve-kampanyasi").count() >= 1)
    ekran(sayfa, "11-yonetim-kampanyalar")

    sayfa.goto(TABAN + "/kampanya.html?id=test-kahve-kampanyasi")
    sayfa.wait_for_selector("#yk-detail .yk-empty, #yk-detail .yk-buy-box")
    bekle("izni beklenen işletmenin kampanyası sitede görünmez", "bulunamadı" in sayfa.locator("#yk-detail").inner_text())

    sayfa.goto(TABAN + "/yonetim.html?sekme=isletmeler")
    sayfa.wait_for_selector("text=Test Kafe Bekleyen")
    sayfa.locator("tr", has_text="Test Kafe Bekleyen").locator("[data-duzenle]").click()
    sayfa.select_option("#yk-if [name=izin_durumu]", "onaylandi")
    sayfa.click("#yk-if [type=submit]")
    sayfa.wait_for_timeout(400)
    sayfa.goto(TABAN + "/kampanya.html?id=test-kahve-kampanyasi")
    sayfa.wait_for_selector("#yk-detail .yk-empty, #yk-detail .yk-buy-box")
    bekle("izin onaylanınca kampanya yayına girer", sayfa.locator("#yk-detail .yk-buy-box").count() == 1)

    sayfa.goto(TABAN + "/yonetim.html?sekme=uyeler")
    sayfa.wait_for_selector("tr[data-uid]")
    bekle("üyeler listelenir", sayfa.locator("tr[data-uid]", has_text=EPOSTA).count() == 1)
    sayfa.click("[data-sekme=kuponlar]")
    sayfa.wait_for_selector(".yk-tablo")
    bekle("yönetici tüm kuponları görür", sayfa.locator(".yk-tablo tbody tr").count() >= 2)

    print("\nFormlar")
    sayfa.goto(TABAN + "/iletisim.html?tip=isletme")
    sayfa.fill("#i-isletme", "Deneme Restoran")
    sayfa.fill("#i-yetkili", "Ali Veli")
    sayfa.fill("#i-tel", "0532 000 00 00")
    sayfa.fill("#i-mail", "ali@ornek.com")
    sayfa.fill("#i-detay", "Hafta içi öğle menüsünde %30 indirim")
    sayfa.click("[data-yk-panel=isletme] [type=submit]")
    sayfa.wait_for_selector("[data-yk-panel=isletme] .yk-form-msg", state="visible")
    bekle("işletme başvurusu kaydedilir", True)
    sayfa.goto(TABAN + "/yonetim.html?sekme=basvurular")
    sayfa.wait_for_selector(".yk-basvuru")
    bekle("başvuru yönetim panelinde görünür", "Deneme Restoran" in sayfa.locator(".yk-basvuru").first.inner_text())

    print("\nMobil görünüm")
    mob = tarayici.new_context(viewport={"width": 390, "height": 844}, locale="tr-TR", timezone_id="Europe/Istanbul", is_mobile=True)
    ms = mob.new_page()
    ms.on("pageerror", lambda e: JS_HATALARI.append(f"mobil {ms.url}: {e}"))
    ms.route(re.compile(r"^https?://(?!localhost|127\.0\.0\.1).*"), lambda r: r.abort())
    for yol in ["/index.html", "/kampanya.html?id=besiktas-serpme-kahvalti", "/giris.html", "/kampanyalar.html", "/gizlilik.html"]:
        ms.goto(TABAN + yol)
        ms.wait_for_timeout(700)
        gen = ms.evaluate("document.documentElement.scrollWidth")
        bekle(f"mobilde yatay taşma yok: {yol}", gen <= 392, gen)
        ekran(ms, "m-" + yol.strip("/").split("?")[0].replace(".html", ""))
    mob.close()
    tarayici.close()

print("\nJavaScript hataları:", len(JS_HATALARI))
for h in JS_HATALARI[:15]:
    print("  -", h)
print(f"\nSonuç: {GECTI} geçti, {len(KALDI)} kaldı")
if KALDI or JS_HATALARI:
    print("Kalanlar:", *KALDI, sep="\n - ")
    sys.exit(1)
