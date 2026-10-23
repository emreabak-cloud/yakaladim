# Yakaladım.com

HourlyBeds şablonu (ThemePure "tp-" teması) üzerine kurulmuş indirimli kampanya vitrini. Statik HTML, Vercel'e hazır.

## Sayfalar
- `index.html` — Ana sayfa (hero arama, öne çıkanlar, kategoriler, son günler, SSS)
- `kampanyalar.html` — Filtreli liste (kategori, şehir, min. indirim, sıralama; filtreler URL'de tutulur)
- `kampanya.html?id=...` — Kampanya detayı (geri sayım, kupon kopyalama, yol tarifi, WhatsApp paylaşım)
- `hakkimizda.html`, `iletisim.html` — Genel iletişim + işletme başvuru formu

## Kampanya eklemek / değiştirmek
Sadece `assets/data/kampanyalar.js` dosyasını düzenleyin. Bir bloğu kopyalayıp alanları değiştirin.
Süresi geçen kampanyalar sitede otomatik gizlenir. `oneCikan: true` olanlar ana sayfada öne çıkar.

## Header / footer değiştirmek
Ortak parçalar `_kaynak/build.py` içinde. Değiştirip `python3 _kaynak/build.py` çalıştırın.

## Notlar
- Formların backend'i yok; gönderince ziyaretçinin e-posta uygulaması `info@yakaladim.com` adresine açılır.
- Örnek kampanya görselleri Unsplash'ten geliyor; gerçek görselleri `assets/img/kampanya/` altına koyup `gorsel` alanında kullanın.
