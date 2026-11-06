"""
Üyelik, kupon, işletme paneli, yönetim ve yasal sayfalar.
build.py tarafından içe aktarılır; tek başına çalıştırılmaz.
"""


def _hero(baslik, alt, yol, kompakt=True):
    pad = ' style="padding:46px 0 38px"' if kompakt else ""
    return f"""
      <section class="yk-page-hero"{pad}>
         <div class="container">
            <div class="yk-breadcrumb"><a href="index.html">Ana Sayfa</a> / {yol}</div>
            <h1 style="font-size:32px">{baslik}</h1>
            <p>{alt}</p>
         </div>
      </section>
"""


def giris(head, header, footer):
    body = _hero("Giriş Yap veya Üye Ol", "Kuponlarını al, hesabından takip et, mekanda göster.", "Giriş") + """
      <section class="pt-50 pb-80">
         <div class="container">
            <div class="row justify-content-center g-4">
               <div class="col-lg-5 order-lg-2">
                  <div class="yk-form-card" id="yk-auth-kart">
                     <div class="yk-tabs">
                        <button type="button" class="yk-pill active" data-auth-tab="giris">Giriş Yap</button>
                        <button type="button" class="yk-pill" data-auth-tab="kayit">Üye Ol</button>
                     </div>
                     <div id="yk-auth-mesaj" class="yk-uyari" role="alert" hidden></div>

                     <form id="yk-giris-form" data-auth-panel="giris" novalidate>
                        <div class="mb-15"><label for="gr-eposta">E-posta</label>
                           <input id="gr-eposta" name="eposta" type="email" class="yk-input" autocomplete="email" required></div>
                        <div class="mb-10"><label for="gr-sifre">Şifre</label>
                           <input id="gr-sifre" name="sifre" type="password" class="yk-input" autocomplete="current-password" required></div>
                        <div class="d-flex justify-content-end mb-20"><a href="#" id="yk-sifre-unuttum" class="yk-link-more" style="font-size:13px">Şifremi unuttum</a></div>
                        <button type="submit" class="yk-btn w-100">Giriş Yap</button>
                     </form>

                     <form id="yk-kayit-form" data-auth-panel="kayit" novalidate hidden>
                        <div class="mb-15"><label for="kr-ad">Ad Soyad</label>
                           <input id="kr-ad" name="adSoyad" class="yk-input" autocomplete="name" required maxlength="120"></div>
                        <div class="mb-15"><label for="kr-eposta">E-posta</label>
                           <input id="kr-eposta" name="eposta" type="email" class="yk-input" autocomplete="email" required></div>
                        <div class="mb-15"><label for="kr-tel">Cep telefonu <span class="yk-muted">(rezervasyonlu fırsatlar için)</span></label>
                           <input id="kr-tel" name="telefon" type="tel" class="yk-input" autocomplete="tel" placeholder="05xx xxx xx xx" maxlength="20"></div>
                        <div class="mb-15"><label for="kr-sifre">Şifre <span class="yk-muted">(en az 8 karakter)</span></label>
                           <input id="kr-sifre" name="sifre" type="password" class="yk-input" autocomplete="new-password" minlength="8" required></div>
                        <label class="yk-check mb-10"><input type="checkbox" name="kvkk" required>
                           <span><a href="gizlilik.html" target="_blank">KVKK Aydınlatma Metni</a>'ni okudum; <a href="kullanim-kosullari.html" target="_blank">Üyelik ve Kullanım Koşulları</a>'nı kabul ediyorum.</span></label>
                        <label class="yk-check mb-20"><input type="checkbox" name="pazarlama">
                           <span>Kampanya ve fırsatlardan e-posta / SMS ile haberdar olmak istiyorum. <span class="yk-muted">(isteğe bağlı)</span></span></label>
                        <button type="submit" class="yk-btn w-100">Üye Ol</button>
                     </form>

                     <form id="yk-sifirla-form" data-auth-panel="sifirla" novalidate hidden>
                        <p class="yk-muted mb-15">Kayıtlı e-posta adresinizi yazın; şifre yenileme bağlantısı gönderelim.</p>
                        <div class="mb-20"><label for="sf-eposta">E-posta</label>
                           <input id="sf-eposta" name="eposta" type="email" class="yk-input" autocomplete="email" required></div>
                        <button type="submit" class="yk-btn w-100">Bağlantı Gönder</button>
                        <button type="button" class="yk-btn-outline w-100 mt-10" data-auth-tab="giris">Girişe dön</button>
                     </form>

                     <form id="yk-yenisifre-form" data-auth-panel="yenisifre" novalidate hidden>
                        <p class="yk-muted mb-15">Hesabınız için yeni bir şifre belirleyin.</p>
                        <div class="mb-20"><label for="ys-sifre">Yeni şifre <span class="yk-muted">(en az 8 karakter)</span></label>
                           <input id="ys-sifre" name="sifre" type="password" class="yk-input" autocomplete="new-password" minlength="8" required></div>
                        <button type="submit" class="yk-btn w-100">Şifreyi Kaydet</button>
                     </form>

                     <div id="yk-demo-hesaplar" class="yk-demo-kutu" hidden>
                        <strong><i class="fa-solid fa-flask"></i> Demo hesapları</strong>
                        <p>Bu tarayıcıda denemek için hazır hesaplar (şifre: <code>demo1234</code>):</p>
                        <button type="button" class="yk-btn-outline" data-demo="yonetici@demo.yakaladim.com">Yönetici</button>
                        <button type="button" class="yk-btn-outline" data-demo="isletme@demo.yakaladim.com">İşletme (kasiyer)</button>
                        <p class="mt-10 mb-0">Müşteri olarak denemek için "Üye Ol" sekmesinden hesap açın.</p>
                     </div>
                  </div>
               </div>
               <div class="col-lg-5 order-lg-1">
                  <div class="yk-avantaj">
                     <span class="yk-eyebrow">Neden üye olmalısın?</span>
                     <h2 class="yk-h2 mb-25">İndirimini tek tıkla yakala</h2>
                     <div class="yk-avantaj-satir"><span class="yk-cat-icon"><i class="fa-solid fa-ticket"></i></span>
                        <div><h5>Sana özel kupon kodu</h5><p>Her kupon tek kullanımlıktır ve yalnızca senin hesabında görünür.</p></div></div>
                     <div class="yk-avantaj-satir"><span class="yk-cat-icon"><i class="fa-solid fa-qrcode"></i></span>
                        <div><h5>Mekanda QR ile göster</h5><p>Kasada telefonundan kuponu açman yeterli; çıktı almana gerek yok.</p></div></div>
                     <div class="yk-avantaj-satir"><span class="yk-cat-icon"><i class="fa-regular fa-calendar-check"></i></span>
                        <div><h5>Rezervasyonun hazır</h5><p>Otel, SPA ve restoran fırsatlarında tarih ve saatini kupon alırken seç.</p></div></div>
                     <div class="yk-avantaj-satir"><span class="yk-cat-icon"><i class="fa-solid fa-wallet"></i></span>
                        <div><h5>Ödemeyi mekanda yap</h5><p>Kupon almak ücretsiz; indirimli fiyatı doğrudan işletmeye ödersin.</p></div></div>
                  </div>
               </div>
            </div>
         </div>
      </section>
"""
    return (head("Giriş Yap / Üye Ol | Yakaladım", "Yakaladım hesabınıza giriş yapın veya ücretsiz üye olun.",
                 "giris.html", indexle=False)
            + header("") + body + footer(js=("yk-uyelik.js",)))


def hesabim(head, header, footer):
    body = _hero("Hesabım", "Kuponların, rezervasyonların ve üyelik bilgilerin.", "Hesabım") + """
      <section class="pt-40 pb-80">
         <div class="container" id="yk-hesap">
            <div class="yk-loading"><span class="yk-spin"></span> Yükleniyor…</div>
         </div>
      </section>
"""
    return (head("Hesabım | Yakaladım", "Kuponlarınız ve üyelik bilgileriniz.", "hesabim.html", indexle=False)
            + header("") + body + footer(js=("yk-uyelik.js",)))


def kupon(head, header, footer):
    body = """
      <section class="pt-40 pb-80 yk-kupon-sayfa">
         <div class="container" id="yk-kupon">
            <div class="yk-loading"><span class="yk-spin"></span> Kupon yükleniyor…</div>
         </div>
      </section>
"""
    return (head("Kuponum | Yakaladım", "Yakaladım kuponunuz.", "kupon.html", indexle=False)
            + header("") + body + footer(js=("yk-qr.js", "yk-uyelik.js")))


def odeme(head, header, footer):
    body = _hero("Kupon Bedeli Ödemesi", "Kupon bedelini güvenle öde, kodun hemen hesabına gelsin.", "Ödeme") + """
      <section class="pt-40 pb-80">
         <div class="container" id="yk-odeme">
            <div class="yk-loading"><span class="yk-spin"></span> Sipariş yükleniyor…</div>
         </div>
      </section>
"""
    return (head("Ödeme | Yakaladım", "Yakaladım kupon bedeli ödemesi.", "odeme.html", indexle=False)
            + header("") + body + footer(js=("yk-odeme.js",)))


def isletme_paneli(head, header, footer):
    body = _hero("İşletme Paneli", "Kupon kodunu doğrula, kullanıldı olarak işaretle, rezervasyonları takip et.", "İşletme Paneli") + """
      <section class="pt-40 pb-80">
         <div class="container" id="yk-panel">
            <div class="yk-loading"><span class="yk-spin"></span> Yükleniyor…</div>
         </div>
      </section>
"""
    return (head("İşletme Paneli | Yakaladım", "Yakaladım işletme paneli.", "isletme-paneli.html", indexle=False)
            + header("") + body + footer(js=("yk-isletme.js",)))


def yonetim(head, header, footer):
    body = _hero("Yönetim Paneli", "Kampanyalar, işletmeler, kuponlar, üyeler ve başvurular.", "Yönetim") + """
      <section class="pt-40 pb-80">
         <div class="container-fluid" style="max-width:1400px" id="yk-yonetim">
            <div class="yk-loading"><span class="yk-spin"></span> Yükleniyor…</div>
         </div>
      </section>
"""
    return (head("Yönetim | Yakaladım", "Yakaladım yönetim paneli.", "yonetim.html", indexle=False)
            + header("") + body + footer(js=("yk-yonetim.js",)))


def satis_sozlesmesi(head, header, footer):
    body = _hero("Ön Bilgilendirme ve Mesafeli Satış Sözleşmesi", "Kupon bedeli satışına ilişkin bilgiler ve iade koşulları.", "Satış Sözleşmesi") + f"""
      <section class="pt-50 pb-80">
         <div class="container yk-yasal" style="max-width:860px">{YASAL_UYARI}
            <h2>1. Taraflar</h2>
            <p><strong>Satıcı:</strong> Tourquaz Elite Lojistik ve Dış Ticaret Ltd. Şti. (yakaladim.com), [adres], [vergi dairesi / no], [MERSİS no], info@yakaladim.com, [telefon].<br>
               <strong>Alıcı:</strong> Yakaladım üyelik bilgilerinde adı, e-posta adresi ve telefonu yer alan üye.</p>
            <h2>2. Konu</h2>
            <p>Bu sözleşmenin konusu, Alıcı'nın yakaladim.com üzerinden satın aldığı <strong>kupon</strong>dur. Kupon, kampanya sayfasında
               belirtilen işletmede, belirtilen indirimli fiyattan yararlanma hakkı veren, kişiye özel ve tek kullanımlık bir koddur.
               Satıcı'nın sattığı yalnızca kupondur; kampanyadaki ürün veya hizmet, ilgili <strong>işletme</strong> tarafından sunulur,
               fiyatı işletmeye ödenir ve faturası işletme tarafından düzenlenir. Satıcı, işletmeden komisyon almaz;
               Alıcı'dan tahsil ettiği tek bedel kupon bedelidir.</p>
            <h2>3. Kupon bedeli ve ödeme</h2>
            <ul>
               <li>Kupon bedeli, kampanya sayfasında ve ödeme ekranında KDV dahil olarak gösterilir.</li>
               <li>Ödeme, lisanslı ödeme kuruluşu [PayTR Ödeme ve Elektronik Para Kuruluşu A.Ş.] altyapısıyla kredi/banka kartı ile alınır; kart bilgileri Satıcı'ya iletilmez.</li>
               <li>Ödeme onaylandığında kupon kodu Alıcı'nın hesabında oluşturulur ve e-arşiv fatura Alıcı'nın e-posta adresine gönderilir.</li>
            </ul>
            <h2>4. Kuponun kullanımı</h2>
            <p>Kupon, kampanya sayfasında yazan koşullar ve son kullanma tarihi içinde, ilgili işletmede kupon kodu veya QR kodu
               gösterilerek kullanılır. Rezervasyon gerektiren kampanyalarda seçilen tarih ve saat geçerlidir.</p>
            <h2>5. Cayma hakkı</h2>
            <p>Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi uyarınca, belirli bir tarihte veya dönemde yapılması gereken
               konaklama, yeme-içme ve eğlence/dinlenme hizmetlerine ilişkin sözleşmelerde ve elektronik ortamda anında ifa edilen
               hizmetlerde cayma hakkı kullanılamayabilir. [Kupon bedeli için cayma hakkının uygulanıp uygulanmayacağı hukuk danışmanınızla netleştirilmelidir.]</p>
            <h2>6. İade ve iptal</h2>
            <ul>
               <li>Kullanılmamış kupon, Hesabım sayfasından iptal edilebilir; ancak <strong>müşteri kaynaklı iptallerde ve kullanılmayan kuponlarda kupon bedeli iade edilmez.</strong></li>
               <li>İşletmenin kampanyayı uygulamaması, kapanması veya rezervasyonu karşılayamaması gibi <strong>işletme kaynaklı durumlarda kupon bedeli iade edilir.</strong> İade, ödemede kullanılan karta yapılır; bankaya bağlı olarak hesaba geçmesi birkaç iş günü sürebilir.</li>
               <li>Ödeme süresi içinde tamamlanmayan veya başarısız olan siparişlerde karttan çekim yapılmaz.</li>
            </ul>
            <h2>7. Şikâyet ve uyuşmazlık</h2>
            <p>Şikâyetlerinizi info@yakaladim.com adresine iletebilirsiniz. Uyuşmazlıklarda, Ticaret Bakanlığınca ilan edilen parasal
               sınırlar dâhilinde Alıcı'nın yerleşim yerindeki Tüketici Hakem Heyeti veya Tüketici Mahkemesi yetkilidir.</p>
         </div>
      </section>
"""
    return (head("Mesafeli Satış Sözleşmesi | Yakaladım", "Yakaladım kupon satışı ön bilgilendirme formu, mesafeli satış sözleşmesi ve iade koşulları.",
                 "satis-sozlesmesi.html")
            + header("") + body + footer())


YASAL_UYARI = """
            <div class="yk-uyari mb-30"><i class="fa-solid fa-scale-balanced"></i>
               Bu metin bir şablondur. Yayına almadan önce köşeli parantez içindeki alanları (adres, vergi ve MERSİS bilgileri vb.) doldurup
               bir hukuk danışmanına kontrol ettirin.</div>"""


def gizlilik(head, header, footer):
    body = _hero("KVKK Aydınlatma Metni ve Gizlilik", "Kişisel verilerinizi nasıl işlediğimizi açıklıyoruz.", "Gizlilik") + f"""
      <section class="pt-50 pb-80">
         <div class="container yk-yasal" style="max-width:860px">{YASAL_UYARI}
            <h2>1. Veri sorumlusu</h2>
            <p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu
               <strong>Tourquaz Elite Lojistik ve Dış Ticaret Ltd. Şti.</strong> ("Yakaladım"), [adres], [MERSİS no] olarak sizi bilgilendiririz.</p>
            <h2>2. İşlenen kişisel veriler</h2>
            <ul>
               <li><strong>Kimlik ve iletişim:</strong> ad soyad, e-posta adresi, cep telefonu.</li>
               <li><strong>Müşteri işlem:</strong> aldığınız kuponlar, kupon kodları, kullanım tarihleri, rezervasyon tarih/saat ve kişi sayısı, işletmeye ilettiğiniz notlar.</li>
               <li><strong>İşlem güvenliği:</strong> giriş kayıtları, IP adresi ve oturum bilgileri.</li>
               <li><strong>Pazarlama:</strong> yalnızca açık rızanız varsa, kampanya bildirim tercihleri.</li>
            </ul>
            <h2>3. İşleme amaçları ve hukuki sebepler</h2>
            <ul>
               <li>Üyelik hesabının oluşturulması ve kupon hizmetinin sunulması — sözleşmenin kurulması ve ifası (KVKK m.5/2-c).</li>
               <li>Kuponun ilgili işletmede doğrulanması ve rezervasyonunuzun yapılması — sözleşmenin ifası (m.5/2-c).</li>
               <li>Bilgi güvenliğinin sağlanması ve kötüye kullanımın önlenmesi — meşru menfaat (m.5/2-f) ve hukuki yükümlülük (m.5/2-ç).</li>
               <li>Kampanya ve fırsat bildirimleri gönderilmesi — açık rıza (m.5/1) ve 6563 sayılı Kanun kapsamında ticari elektronik ileti onayı.</li>
            </ul>
            <h2>4. Aktarım</h2>
            <p>Kuponu kullanacağınız <strong>işletmeye</strong>; kuponun doğrulanması için kupon bilgileri ve adınız,
               rezervasyonlu fırsatlarda ayrıca telefon numaranız aktarılır. Hizmetin barındırılması için
               altyapı sağlayıcılarımıza (veritabanı ve barındırma: [Supabase Inc., Vercel Inc.]) aktarım yapılır;
               bu sağlayıcıların sunucuları yurt dışında bulunabilir ve aktarım KVKK m.9 kapsamındaki şartlara uygun yapılır.
               Yetkili kamu kurumlarına yalnızca yasal zorunluluk hâlinde aktarım yapılır.</p>
            <h2>5. Saklama süresi</h2>
            <p>Üyelik verileri üyeliğiniz süresince, kupon işlem kayıtları ilgili mevzuatta öngörülen süreler boyunca
               ([ör. 10 yıl]) saklanır; süre sonunda silinir, yok edilir veya anonim hâle getirilir.</p>
            <h2>6. Haklarınız</h2>
            <p>KVKK m.11 uyarınca verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya
               silinmesini isteme, itiraz etme ve zararın giderilmesini talep etme haklarına sahipsiniz. Başvurularınızı
               <a href="mailto:kvkk@yakaladim.com">[kvkk@yakaladim.com]</a> adresine iletebilirsiniz.</p>
            <h2>7. Çerezler</h2>
            <p>Site, oturumunuzu açık tutmak için tarayıcınızın yerel depolamasını kullanır. Analiz veya reklam çerezi
               kullanılırsa ayrıca bilgilendirme yapılır ve onayınız alınır.</p>
         </div>
      </section>
"""
    return (head("KVKK Aydınlatma Metni | Yakaladım", "Yakaladım kişisel verilerin korunması ve gizlilik politikası.",
                 "gizlilik.html")
            + header("") + body + footer())


def kosullar(head, header, footer):
    body = _hero("Üyelik ve Kullanım Koşulları", "Yakaladım'ı kullanırken geçerli kurallar.", "Kullanım Koşulları") + f"""
      <section class="pt-50 pb-80">
         <div class="container yk-yasal" style="max-width:860px">{YASAL_UYARI}
            <h2>1. Hizmetin niteliği</h2>
            <p>Yakaladım; işletmelerin indirimli kampanyalarını sergileyen ve üyelere bu kampanyalarda kullanılmak üzere
               kişiye özel kupon kodu üreten bir aracı platformdur. Kampanyadaki ürün ve hizmeti sunan, fiyatlandıran
               ve faturalandıran taraf ilgili <strong>işletmedir</strong>.</p>
            <p>Yakaladım, işletmelerden komisyon veya yayın ücreti almaz; platformun tek geliri üyelerin ödediği
               <strong>kupon bedelidir</strong>. İşletmeye ödenen ürün veya hizmet bedelinden Yakaladım'a pay aktarılmaz.</p>
            <h2>2. Üyelik</h2>
            <ul>
               <li>Üye olmak için 18 yaşını doldurmuş olmak ve doğru bilgi vermek gerekir.</li>
               <li>Hesap güvenliğinden ve şifrenin gizliliğinden üye sorumludur.</li>
               <li>Kupon alabilmek için e-posta adresinin doğrulanması gerekir.</li>
            </ul>
            <h2>3. Kuponlar</h2>
            <ul>
               <li>Kupon alınırken, kampanya sayfasında gösterilen <strong>kupon bedeli</strong> online olarak Yakaladım'a ödenir (bazı kampanyalarda kupon ücretsizdir). Ürün veya hizmetin indirimli fiyatı, kupon gösterilerek doğrudan işletmeye ödenir.</li>
               <li>Kupon bedeli, kuponun kullanılmaması veya müşteri tarafından iptal edilmesi hâlinde iade edilmez. İşletmenin kampanyayı uygulamaması, kapanması gibi işletme kaynaklı durumlarda kupon bedeli iade edilir.</li>
               <li>Her kupon kodu tek kullanımlıktır, devredilemez ve son kullanma tarihine kadar geçerlidir.</li>
               <li>Kişi başı kupon sınırı, stok ve kampanya koşulları her kampanyanın sayfasında belirtilir.</li>
               <li>Kullanılmamış kupon, hesabım sayfasından iptal edilebilir.</li>
               <li>Kötüye kullanım (sahte hesap, toplu kupon alma vb.) tespit edilirse ilgili kuponlar ve hesap iptal edilebilir.</li>
            </ul>
            <h2>4. Sorumluluk</h2>
            <p>Kampanya içeriği, hizmet kalitesi ve rezervasyonun yerine getirilmesi işletmenin sorumluluğundadır.
               Yakaladım, işletme ile yaşanan anlaşmazlıklarda iletişimi kolaylaştırmak için makul çabayı gösterir.
               [Tüketici şikâyetleri için başvuru yolları ve yetkili tüketici hakem heyeti bilgisi eklenmelidir.]</p>
            <h2>5. Değişiklikler</h2>
            <p>Bu koşullar güncellenebilir; önemli değişiklikler üyelere e-posta ile bildirilir.</p>
            <h2>6. İletişim</h2>
            <p>Tourquaz Elite Lojistik ve Dış Ticaret Ltd. Şti. — [adres] — <a href="mailto:info@yakaladim.com">info@yakaladim.com</a></p>
         </div>
      </section>
"""
    return (head("Üyelik ve Kullanım Koşulları | Yakaladım", "Yakaladım üyelik ve kupon kullanım koşulları.",
                 "kullanim-kosullari.html")
            + header("") + body + footer())


def sayfalar(head, header, footer):
    def bagla(fn):
        return lambda: fn(head, header, footer)
    return {
        "giris.html": bagla(giris),
        "hesabim.html": bagla(hesabim),
        "kupon.html": bagla(kupon),
        "isletme-paneli.html": bagla(isletme_paneli),
        "yonetim.html": bagla(yonetim),
        "gizlilik.html": bagla(gizlilik),
        "kullanim-kosullari.html": bagla(kosullar),
        "odeme.html": bagla(odeme),
        "satis-sozlesmesi.html": bagla(satis_sozlesmesi),
    }
