/* =====================================================================
   YAKALADIM.COM — KAMPANYA VERİLERİ
   ---------------------------------------------------------------------
   Yeni kampanya eklemek için aşağıdaki listeye bir blok kopyalayıp
   bilgileri değiştirmeniz yeterli. Site tüm sayfaları buradan doldurur.

   Alanlar:
   id           : Benzersiz, küçük harf, Türkçe karaktersiz (URL'de görünür)
   baslik       : Kampanya başlığı
   isletme      : İşletme / marka adı
   kategori     : restoran | kahvalti | kafe | spa | guzellik | otel | eglence | spor | hizmet | urun
   sehir        : istanbul | izmir | ankara | online
   semt         : Semt / ilçe (online için "Tüm Türkiye")
   eskiFiyat    : Normal fiyat (TL, sayı)
   yeniFiyat    : Kampanyalı fiyat (TL, sayı)
   bitis        : Son gün (YYYY-AA-GG)
   gorsel       : Görsel adresi (assets/img/kampanya/... veya tam URL)
   kisa         : Kartta görünen tek satırlık açıklama
   aciklama     : Detay sayfasındaki açıklama
   kosullar     : Kampanya koşulları listesi
   telefon      : İşletme telefonu (rezervasyon için gösterilir, yoksa "")
   link         : İşletmenin web / satın alma linki (yoksa "")
   adres        : Adres (online için "")
   oneCikan     : true ise ana sayfada "Öne Çıkanlar"da görünür
   stok         : (isteğe bağlı) Toplam kupon adedi; yazılmazsa sınırsız
   kisiBasiLimit: (isteğe bağlı) Bir üyenin alabileceği en fazla kupon (varsayılan 5)
   rezervasyonGerekli: (isteğe bağlı) true ise kupon alırken tarih/saat/kişi seçilir

   NOT: Supabase bağlandığında kampanyalar veritabanından gelir; bu dosya
   yalnızca demo modu ve ilk veri aktarımı (supabase/02_ornek_veri.sql) içindir.
   Kupon kodları artık her üyeye özel ve tek kullanımlık olarak sistem tarafından üretilir.
   ===================================================================== */

window.KAMPANYALAR = [
  {
    id: "kadikoy-burger-menu",
    baslik: "2 Kişilik Burger Menü + İçecek",
    isletme: "Moda Burger Lab",
    telefon: "0216 000 00 01",
    stok: 50,
    kisiBasiLimit: 2,
    kategori: "restoran",
    sehir: "istanbul",
    semt: "Kadıköy",
    eskiFiyat: 980,
    yeniFiyat: 590,
    bitis: "2026-12-31",
    gorsel: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=900&auto=format&fit=crop",
    kisa: "İki smash burger, patates ve iki içecek tek fiyata.",
    aciklama: "Moda'nın sevilen burger noktasında iki kişilik menü: iki adet 120 gr smash burger, paylaşımlık çıtır patates ve iki adet meşrubat. Hafta içi ve hafta sonu geçerlidir.",
    kosullar: ["Masada kupon kodunu söylemeniz yeterli", "Paket serviste geçerli değildir", "Kişi başı bir kullanım"],
    link: "",
    adres: "Caferağa Mah. Moda Cad., Kadıköy / İstanbul",
    oneCikan: true
  },
  {
    id: "besiktas-serpme-kahvalti",
    baslik: "Boğaz Manzaralı Serpme Kahvaltı",
    isletme: "Kuruçeşme Kahvaltı Evi",
    kategori: "kahvalti",
    telefon: "0212 000 00 02",
    rezervasyonGerekli: true,
    sehir: "istanbul",
    semt: "Beşiktaş",
    eskiFiyat: 1400,
    yeniFiyat: 890,
    bitis: "2026-12-20",
    gorsel: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=900&auto=format&fit=crop",
    kisa: "2 kişilik sınırsız çay ile serpme kahvaltı.",
    aciklama: "Boğaz kıyısında 30 çeşitten oluşan serpme kahvaltı, sınırsız demlik çay ve sıcaklar dahil. Hafta sonu yoğunluğu nedeniyle rezervasyon önerilir.",
    kosullar: ["Rezervasyon zorunludur", "Cumartesi-Pazar 09:00-13:00 arası geçerlidir", "Diğer kampanyalarla birleştirilemez"],
    link: "",
    adres: "Kuruçeşme Cad., Beşiktaş / İstanbul",
    oneCikan: true
  },
  {
    id: "nisantasi-specialty-kahve",
    baslik: "Her Kahvenin Yanında Tatlı Bizden",
    isletme: "Bean & Bloom Coffee",
    kategori: "kafe",
    sehir: "istanbul",
    semt: "Nişantaşı",
    eskiFiyat: 360,
    yeniFiyat: 220,
    bitis: "2027-01-15",
    gorsel: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=900&auto=format&fit=crop",
    kisa: "Filtre kahve ya da latte + günün tatlısı.",
    aciklama: "Özel kavrum filtre kahve veya latte siparişinize günün tatlısı (cheesecake, brownie ya da kurabiye) eşlik ediyor. Çalışmak için sessiz bir alan arayanlara ideal.",
    kosullar: ["Hafta içi 10:00-17:00 arası geçerlidir", "Yalnızca mekanda tüketimde geçerlidir"],
    link: "",
    adres: "Teşvikiye Mah., Şişli / İstanbul",
    oneCikan: true
  },
  {
    id: "kablosuz-kulaklik",
    baslik: "Gürültü Önleyici Kablosuz Kulaklık",
    isletme: "TeknoNokta",
    kategori: "urun",
    sehir: "online",
    semt: "Tüm Türkiye",
    eskiFiyat: 4299,
    yeniFiyat: 2799,
    bitis: "2026-12-15",
    gorsel: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=900&auto=format&fit=crop",
    kisa: "ANC özellikli, 40 saat pil ömrü, ücretsiz kargo.",
    aciklama: "Aktif gürültü önleme, 40 saate kadar pil ömrü ve hızlı şarj desteği sunan kulaklık 11.11 öncesi özel fiyatla. Kargo ücretsiz, 2 yıl distribütör garantili.",
    kosullar: ["Stoklarla sınırlıdır", "Kupon kodu sepette uygulanır", "Kargo ücretsizdir"],
    link: "",
    adres: "",
    oneCikan: true
  },
  {
    id: "alsancak-sushi-seti",
    baslik: "24 Parça Sushi Seti",
    isletme: "Sakura Sushi Bar",
    telefon: "0232 000 00 04",
    kategori: "restoran",
    sehir: "izmir",
    semt: "Alsancak",
    eskiFiyat: 1650,
    yeniFiyat: 1090,
    bitis: "2027-01-10",
    gorsel: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?q=80&w=900&auto=format&fit=crop",
    kisa: "Maki, nigiri ve özel rollerden oluşan paylaşım seti.",
    aciklama: "Somon, ton balığı ve karides içeren 24 parçalık paylaşım seti; yanında miso çorbası ve edamame. 2-3 kişi için idealdir.",
    kosullar: ["Mekanda ve gel-al siparişte geçerlidir", "Pazartesi kapalıdır"],
    link: "",
    adres: "Kıbrıs Şehitleri Cad., Konak / İzmir",
    oneCikan: false
  },
  {
    id: "cankaya-spa-masaj",
    baslik: "60 Dakika Aromaterapi Masajı + Hamam",
    isletme: "Lotus Spa & Wellness",
    kategori: "spa",
    telefon: "0312 000 00 03",
    rezervasyonGerekli: true,
    stok: 30,
    sehir: "ankara",
    semt: "Çankaya",
    eskiFiyat: 2500,
    yeniFiyat: 1350,
    bitis: "2027-01-31",
    gorsel: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=900&auto=format&fit=crop",
    kisa: "Masaj, kese-köpük ve bitki çayı ikramı.",
    aciklama: "60 dakikalık aromaterapi masajı, geleneksel kese-köpük ve dinlenme alanında bitki çayı ikramı. Çiftler için iki kişilik seans da aynı indirimle alınabilir.",
    kosullar: ["En az 1 gün önceden randevu alınmalıdır", "Randevuya 15 dk önce gelinmelidir"],
    link: "",
    adres: "Tunalı Hilmi Cad., Çankaya / Ankara",
    oneCikan: true
  },
  {
    id: "atasehir-spor-salonu",
    baslik: "3 Aylık Sınırsız Spor Salonu Üyeliği",
    isletme: "PowerHouse Fitness",
    kategori: "spor",
    sehir: "istanbul",
    semt: "Ataşehir",
    eskiFiyat: 7500,
    yeniFiyat: 4490,
    bitis: "2026-12-10",
    gorsel: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=900&auto=format&fit=crop",
    kisa: "Grup dersleri ve 1 PT seansı dahil.",
    aciklama: "Tüm grup derslerine (pilates, spinning, HIIT) sınırsız katılım, 1 adet kişisel antrenör seansı ve vücut analizi dahil 3 aylık üyelik.",
    kosullar: ["Yeni üyeler için geçerlidir", "Üyelik başlangıcı satın alımdan itibaren 30 gün içinde yapılmalıdır"],
    link: "",
    adres: "Barbaros Mah., Ataşehir / İstanbul",
    oneCikan: false
  },
  {
    id: "karsiyaka-pizza",
    baslik: "Büyük Boy Pizza 1 Alana 1 Bedava",
    isletme: "Napoli Fırın",
    stok: 8,
    kategori: "restoran",
    sehir: "izmir",
    semt: "Karşıyaka",
    eskiFiyat: 900,
    yeniFiyat: 450,
    bitis: "2026-11-28",
    gorsel: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=900&auto=format&fit=crop",
    kisa: "Odun fırınında Napoli usulü pizza, ikincisi bizden.",
    aciklama: "Odun fırınında pişen Napoli usulü pizzalarda büyük boy alana ikincisi bedava. Margherita, pepperoni ve dört peynirli seçenekler kampanyaya dahildir.",
    kosullar: ["İkinci pizza eşit veya düşük fiyatlı olmalıdır", "Salı-Perşembe geçerlidir"],
    link: "",
    adres: "Bostanlı Mah., Karşıyaka / İzmir",
    oneCikan: true
  },
  {
    id: "akilli-saat",
    baslik: "Akıllı Saat — Sezon Sonu İndirimi",
    isletme: "TeknoNokta",
    kategori: "urun",
    sehir: "online",
    semt: "Tüm Türkiye",
    eskiFiyat: 3499,
    yeniFiyat: 2249,
    bitis: "2026-12-15",
    gorsel: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=900&auto=format&fit=crop",
    kisa: "Nabız, uyku ve adım takibi; 7 gün pil.",
    aciklama: "Nabız ve uyku takibi, 100+ spor modu, suya dayanıklı gövde ve 7 güne kadar pil ömrü sunan akıllı saat sezon sonu fiyatıyla.",
    kosullar: ["Stoklarla sınırlıdır", "Kargo ücretsizdir"],
    link: "",
    adres: "",
    oneCikan: false
  },
  {
    id: "kizilay-sinema-menu",
    baslik: "2 Sinema Bileti + Büyük Mısır Menü",
    isletme: "CineKent",
    kategori: "eglence",
    sehir: "ankara",
    semt: "Kızılay",
    eskiFiyat: 1100,
    yeniFiyat: 690,
    bitis: "2027-01-20",
    gorsel: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=900&auto=format&fit=crop",
    kisa: "Tüm vizyon filmlerinde geçerli çift bilet.",
    aciklama: "Vizyondaki tüm filmler için iki adet bilet, büyük boy mısır ve iki içecek. IMAX ve 4DX salonları hariçtir.",
    kosullar: ["IMAX ve 4DX hariçtir", "Biletler gişede kupon kodu ile alınır"],
    link: "",
    adres: "Atatürk Bulvarı, Çankaya / Ankara",
    oneCikan: false
  },
  {
    id: "bornova-salata-bowl",
    baslik: "Fit Bowl Menü + Detoks İçecek",
    isletme: "Green Bowl",
    kategori: "kafe",
    sehir: "izmir",
    semt: "Bornova",
    eskiFiyat: 520,
    yeniFiyat: 340,
    bitis: "2026-12-28",
    gorsel: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=900&auto=format&fit=crop",
    kisa: "Öğle saatlerine özel sağlıklı menü.",
    aciklama: "Kinoa, ızgara tavuk veya falafel seçenekli bowl ve günün soğuk sıkım detoks içeceği. Hafta içi öğle saatlerinde geçerlidir.",
    kosullar: ["Hafta içi 11:30-15:00 arası geçerlidir", "Paket serviste de geçerlidir"],
    link: "",
    adres: "Kazımdirik Mah., Bornova / İzmir",
    oneCikan: false
  },
  {
    id: "spor-ayakkabi",
    baslik: "Koşu Ayakkabısında %40 İndirim",
    isletme: "RunStore",
    kategori: "urun",
    sehir: "online",
    semt: "Tüm Türkiye",
    eskiFiyat: 3200,
    yeniFiyat: 1920,
    bitis: "2026-12-05",
    gorsel: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=900&auto=format&fit=crop",
    kisa: "Tüm numaralarda, 30 gün ücretsiz iade.",
    aciklama: "Hafif, nefes alan ve yastıklamalı koşu ayakkabıları tüm numaralarda %40 indirimli. 30 gün içinde ücretsiz iade imkanı.",
    kosullar: ["Kupon kodu sepette uygulanır", "30 gün ücretsiz iade"],
    link: "",
    adres: "",
    oneCikan: true
  }
];

/* Kategori ve şehir isimleri (sayfalarda gösterilen etiketler) */
window.KATEGORILER = {
  restoran: { ad: "Restoran", ikon: "fa-utensils" },
  kahvalti: { ad: "Kahvaltı", ikon: "fa-mug-saucer" },
  kafe:     { ad: "Kafe & Kahve", ikon: "fa-mug-hot" },
  spa:      { ad: "Masaj & SPA", ikon: "fa-spa" },
  guzellik: { ad: "Güzellik", ikon: "fa-wand-magic-sparkles" },
  otel:     { ad: "Otel & Konaklama", ikon: "fa-hotel" },
  eglence:  { ad: "Eğlence & Etkinlik", ikon: "fa-ticket" },
  spor:     { ad: "Spor & Kurs", ikon: "fa-dumbbell" },
  hizmet:   { ad: "Hizmet", ikon: "fa-screwdriver-wrench" },
  urun:     { ad: "Ürün", ikon: "fa-bag-shopping" }
};

window.SEHIRLER = {
  istanbul: "İstanbul",
  ankara: "Ankara",
  izmir: "İzmir",
  antalya: "Antalya",
  bursa: "Bursa",
  kocaeli: "Kocaeli",
  sakarya: "Sakarya",
  online: "Online"
};
