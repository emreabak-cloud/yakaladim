/* =====================================================================
   YAKALADIM.COM — KAMPANYA VERİLERİ
   ---------------------------------------------------------------------
   Yeni kampanya eklemek için aşağıdaki listeye bir blok kopyalayıp
   bilgileri değiştirmeniz yeterli. Site tüm sayfaları buradan doldurur.

   Alanlar:
   id           : Benzersiz, küçük harf, Türkçe karaktersiz (URL'de görünür)
   baslik       : Kampanya başlığı
   isletme      : İşletme / marka adı
   kategori     : restoran | kafe | urun | guzellik | spor | eglence
   sehir        : istanbul | izmir | ankara | online
   semt         : Semt / ilçe (online için "Tüm Türkiye")
   eskiFiyat    : Normal fiyat (TL, sayı)
   yeniFiyat    : Kampanyalı fiyat (TL, sayı)
   bitis        : Son gün (YYYY-AA-GG)
   gorsel       : Görsel adresi (assets/img/kampanya/... veya tam URL)
   kisa         : Kartta görünen tek satırlık açıklama
   aciklama     : Detay sayfasındaki açıklama
   kosullar     : Kampanya koşulları listesi
   kupon        : Kupon kodu (yoksa "")
   link         : İşletmenin rezervasyon / satın alma linki (yoksa "")
   adres        : Adres (online için "")
   oneCikan     : true ise ana sayfada "Öne Çıkanlar"da görünür
   ===================================================================== */

window.KAMPANYALAR = [
  {
    id: "kadikoy-burger-menu",
    baslik: "2 Kişilik Burger Menü + İçecek",
    isletme: "Moda Burger Lab",
    kategori: "restoran",
    sehir: "istanbul",
    semt: "Kadıköy",
    eskiFiyat: 980,
    yeniFiyat: 590,
    bitis: "2026-11-15",
    gorsel: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=900&auto=format&fit=crop",
    kisa: "İki smash burger, patates ve iki içecek tek fiyata.",
    aciklama: "Moda'nın sevilen burger noktasında iki kişilik menü: iki adet 120 gr smash burger, paylaşımlık çıtır patates ve iki adet meşrubat. Hafta içi ve hafta sonu geçerlidir.",
    kosullar: ["Masada kupon kodunu söylemeniz yeterli", "Paket serviste geçerli değildir", "Kişi başı bir kullanım"],
    kupon: "YAKALA40",
    link: "",
    adres: "Caferağa Mah. Moda Cad., Kadıköy / İstanbul",
    oneCikan: true
  },
  {
    id: "besiktas-serpme-kahvalti",
    baslik: "Boğaz Manzaralı Serpme Kahvaltı",
    isletme: "Kuruçeşme Kahvaltı Evi",
    kategori: "restoran",
    sehir: "istanbul",
    semt: "Beşiktaş",
    eskiFiyat: 1400,
    yeniFiyat: 890,
    bitis: "2026-10-26",
    gorsel: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=900&auto=format&fit=crop",
    kisa: "2 kişilik sınırsız çay ile serpme kahvaltı.",
    aciklama: "Boğaz kıyısında 30 çeşitten oluşan serpme kahvaltı, sınırsız demlik çay ve sıcaklar dahil. Hafta sonu yoğunluğu nedeniyle rezervasyon önerilir.",
    kosullar: ["Rezervasyon zorunludur", "Cumartesi-Pazar 09:00-13:00 arası geçerlidir", "Diğer kampanyalarla birleştirilemez"],
    kupon: "KAHVALTI35",
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
    bitis: "2026-11-30",
    gorsel: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=900&auto=format&fit=crop",
    kisa: "Filtre kahve ya da latte + günün tatlısı.",
    aciklama: "Özel kavrum filtre kahve veya latte siparişinize günün tatlısı (cheesecake, brownie ya da kurabiye) eşlik ediyor. Çalışmak için sessiz bir alan arayanlara ideal.",
    kosullar: ["Hafta içi 10:00-17:00 arası geçerlidir", "Yalnızca mekanda tüketimde geçerlidir"],
    kupon: "KAHVEM",
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
    bitis: "2026-11-11",
    gorsel: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=900&auto=format&fit=crop",
    kisa: "ANC özellikli, 40 saat pil ömrü, ücretsiz kargo.",
    aciklama: "Aktif gürültü önleme, 40 saate kadar pil ömrü ve hızlı şarj desteği sunan kulaklık 11.11 öncesi özel fiyatla. Kargo ücretsiz, 2 yıl distribütör garantili.",
    kosullar: ["Stoklarla sınırlıdır", "Kupon kodu sepette uygulanır", "Kargo ücretsizdir"],
    kupon: "KULAK35",
    link: "",
    adres: "",
    oneCikan: true
  },
  {
    id: "alsancak-sushi-seti",
    baslik: "24 Parça Sushi Seti",
    isletme: "Sakura Sushi Bar",
    kategori: "restoran",
    sehir: "izmir",
    semt: "Alsancak",
    eskiFiyat: 1650,
    yeniFiyat: 1090,
    bitis: "2026-11-20",
    gorsel: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?q=80&w=900&auto=format&fit=crop",
    kisa: "Maki, nigiri ve özel rollerden oluşan paylaşım seti.",
    aciklama: "Somon, ton balığı ve karides içeren 24 parçalık paylaşım seti; yanında miso çorbası ve edamame. 2-3 kişi için idealdir.",
    kosullar: ["Mekanda ve gel-al siparişte geçerlidir", "Pazartesi kapalıdır"],
    kupon: "SUSHI30",
    link: "",
    adres: "Kıbrıs Şehitleri Cad., Konak / İzmir",
    oneCikan: false
  },
  {
    id: "cankaya-spa-masaj",
    baslik: "60 Dakika Aromaterapi Masajı + Hamam",
    isletme: "Lotus Spa & Wellness",
    kategori: "guzellik",
    sehir: "ankara",
    semt: "Çankaya",
    eskiFiyat: 2500,
    yeniFiyat: 1350,
    bitis: "2026-12-05",
    gorsel: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=900&auto=format&fit=crop",
    kisa: "Masaj, kese-köpük ve bitki çayı ikramı.",
    aciklama: "60 dakikalık aromaterapi masajı, geleneksel kese-köpük ve dinlenme alanında bitki çayı ikramı. Çiftler için iki kişilik seans da aynı indirimle alınabilir.",
    kosullar: ["En az 1 gün önceden randevu alınmalıdır", "Randevuya 15 dk önce gelinmelidir"],
    kupon: "SPA45",
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
    bitis: "2026-10-31",
    gorsel: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=900&auto=format&fit=crop",
    kisa: "Grup dersleri ve 1 PT seansı dahil.",
    aciklama: "Tüm grup derslerine (pilates, spinning, HIIT) sınırsız katılım, 1 adet kişisel antrenör seansı ve vücut analizi dahil 3 aylık üyelik.",
    kosullar: ["Yeni üyeler için geçerlidir", "Üyelik başlangıcı satın alımdan itibaren 30 gün içinde yapılmalıdır"],
    kupon: "FIT40",
    link: "",
    adres: "Barbaros Mah., Ataşehir / İstanbul",
    oneCikan: false
  },
  {
    id: "karsiyaka-pizza",
    baslik: "Büyük Boy Pizza 1 Alana 1 Bedava",
    isletme: "Napoli Fırın",
    kategori: "restoran",
    sehir: "izmir",
    semt: "Karşıyaka",
    eskiFiyat: 900,
    yeniFiyat: 450,
    bitis: "2026-10-25",
    gorsel: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=900&auto=format&fit=crop",
    kisa: "Odun fırınında Napoli usulü pizza, ikincisi bizden.",
    aciklama: "Odun fırınında pişen Napoli usulü pizzalarda büyük boy alana ikincisi bedava. Margherita, pepperoni ve dört peynirli seçenekler kampanyaya dahildir.",
    kosullar: ["İkinci pizza eşit veya düşük fiyatlı olmalıdır", "Salı-Perşembe geçerlidir"],
    kupon: "PIZZA2",
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
    bitis: "2026-11-11",
    gorsel: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=900&auto=format&fit=crop",
    kisa: "Nabız, uyku ve adım takibi; 7 gün pil.",
    aciklama: "Nabız ve uyku takibi, 100+ spor modu, suya dayanıklı gövde ve 7 güne kadar pil ömrü sunan akıllı saat sezon sonu fiyatıyla.",
    kosullar: ["Stoklarla sınırlıdır", "Kargo ücretsizdir"],
    kupon: "SAAT35",
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
    bitis: "2026-11-25",
    gorsel: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=900&auto=format&fit=crop",
    kisa: "Tüm vizyon filmlerinde geçerli çift bilet.",
    aciklama: "Vizyondaki tüm filmler için iki adet bilet, büyük boy mısır ve iki içecek. IMAX ve 4DX salonları hariçtir.",
    kosullar: ["IMAX ve 4DX hariçtir", "Biletler gişede kupon kodu ile alınır"],
    kupon: "SINEMA",
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
    bitis: "2026-11-18",
    gorsel: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=900&auto=format&fit=crop",
    kisa: "Öğle saatlerine özel sağlıklı menü.",
    aciklama: "Kinoa, ızgara tavuk veya falafel seçenekli bowl ve günün soğuk sıkım detoks içeceği. Hafta içi öğle saatlerinde geçerlidir.",
    kosullar: ["Hafta içi 11:30-15:00 arası geçerlidir", "Paket serviste de geçerlidir"],
    kupon: "FITBOWL",
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
    bitis: "2026-11-08",
    gorsel: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=900&auto=format&fit=crop",
    kisa: "Tüm numaralarda, 30 gün ücretsiz iade.",
    aciklama: "Hafif, nefes alan ve yastıklamalı koşu ayakkabıları tüm numaralarda %40 indirimli. 30 gün içinde ücretsiz iade imkanı.",
    kosullar: ["Kupon kodu sepette uygulanır", "30 gün ücretsiz iade"],
    kupon: "KOS40",
    link: "",
    adres: "",
    oneCikan: true
  }
];

/* Kategori ve şehir isimleri (sayfalarda gösterilen etiketler) */
window.KATEGORILER = {
  restoran: { ad: "Restoran", ikon: "fa-utensils" },
  kafe:     { ad: "Kafe & Kahve", ikon: "fa-mug-hot" },
  urun:     { ad: "Ürün", ikon: "fa-bag-shopping" },
  guzellik: { ad: "Güzellik & SPA", ikon: "fa-spa" },
  spor:     { ad: "Spor", ikon: "fa-dumbbell" },
  eglence:  { ad: "Eğlence", ikon: "fa-ticket" }
};

window.SEHIRLER = {
  istanbul: "İstanbul",
  izmir: "İzmir",
  ankara: "Ankara",
  online: "Online"
};
