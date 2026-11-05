/* =====================================================================
   YAKALADIM — KUPON BEDELİ ÖDEME SAYFASI (odeme.html?siparis=YK...)
   • Ödeme bekleyen kuponun özetini ve kalan süreyi gösterir.
   • Supabase modunda ödeme sağlayıcısının (PayTR) güvenli ödeme ekranını
     açar; demo modunda test ödemesi yapılır.
   • Ödeme sağlayıcısı başarılı dönüşte bu sayfayı ?sonuc=basarili ile açar;
     kupon, sunucuya gelen ödeme bildirimiyle aktifleşir. Sayfa bunu bekler.
   ===================================================================== */
(function () {
  'use strict';
  var YK = window.YK, U = window.YKUI, esc = U.esc, tl = U.tl;

  // Ödeme ekranı iframe içinden bu sayfaya döndüyse tüm pencereye taşı
  try { if (window.top !== window.self && /sonuc=/.test(location.search)) { window.top.location.href = location.href; return; } } catch (e) { /* farklı köken */ }

  var kok, p = U.params(), siparis = p.get('siparis'), sonuc = p.get('sonuc');
  var sayacZamani = null;

  function mesaj(ikon, baslik, metin, dugmeler) {
    kok.innerHTML = '<div class="yk-empty yk-odeme-mesaj"><i class="fa-solid ' + ikon + '"></i><h4>' + esc(baslik) + '</h4><p>' + metin + '</p>' +
      '<div class="d-flex gap-2 justify-content-center flex-wrap">' + (dugmeler || '') + '</div></div>';
  }

  function ozet(c) {
    var k = c.kampanya || {};
    return '<div class="yk-odeme-ozet">' +
      '<span class="yk-eyebrow">' + esc(k.isletme || '') + '</span>' +
      '<h3>' + esc(k.baslik) + '</h3>' +
      '<p class="yk-muted mb-15">' + esc([k.semt, U.sehirAdi(k.sehir)].filter(Boolean).join(', ')) +
        (c.rezervasyon_tarihi ? ' · ' + U.tarih(c.rezervasyon_tarihi, { day: 'numeric', month: 'long' }) + ' ' + esc(c.rezervasyon_saati || '') +
          (c.kisi_sayisi ? ', ' + c.kisi_sayisi + ' kişi' : '') : '') + '</p>' +
      '<dl class="yk-odeme-satirlar">' +
        '<dt>Kupon adedi</dt><dd>' + c.adet + '</dd>' +
        '<dt>Mekanda ödenecek</dt><dd>' + tl(c.toplam) + '</dd>' +
        '<dt class="yk-odeme-toplam">Şimdi ödenecek kupon bedeli</dt><dd class="yk-odeme-toplam">' + tl(c.kupon_bedeli) + '</dd>' +
      '</dl>' +
      '<p class="yk-muted mb-0" style="font-size:13px"><i class="fa-solid fa-lock"></i> Kart bilgileriniz Yakaladım\'a ulaşmaz; ödeme, lisanslı ödeme kuruluşunun güvenli sayfasında alınır.</p>' +
    '</div>';
  }

  function sayac(c) {
    var el = document.getElementById('yk-odeme-sure');
    if (!el || !c.odeme_son) return;
    clearInterval(sayacZamani);
    function tick() {
      var kalan = new Date(c.odeme_son) - new Date();
      if (kalan <= 0) { clearInterval(sayacZamani); yukle(); return; }
      var dk = Math.floor(kalan / 60000), sn = Math.floor(kalan % 60000 / 1000);
      el.textContent = dk + ':' + (sn < 10 ? '0' : '') + sn;
    }
    tick();
    sayacZamani = setInterval(tick, 1000);
  }

  function odemeEkrani(c) {
    var kmp = c.kampanya || {};
    kok.innerHTML = '<div class="row g-4">' +
      '<div class="col-lg-5">' + ozet(c) + '</div>' +
      '<div class="col-lg-7"><div class="yk-form-card">' +
        '<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-15">' +
          '<h4 class="mb-0"><i class="fa-regular fa-credit-card" style="color:var(--yk-orange)"></i> Kupon bedelini öde</h4>' +
          '<span class="yk-odeme-sure-kutu"><i class="fa-regular fa-clock"></i> Kalan süre <strong id="yk-odeme-sure">--:--</strong></span>' +
        '</div>' +
        (sonuc === 'basarisiz' ? '<div class="yk-uyari yk-uyari-hata">Ödeme tamamlanamadı. Kart bilgilerinizi kontrol edip tekrar deneyebilirsiniz.</div>' : '') +
        '<div id="yk-odeme-alan"><div class="yk-loading"><span class="yk-spin"></span> Güvenli ödeme ekranı hazırlanıyor…</div></div>' +
        '<div class="d-flex justify-content-between flex-wrap gap-2 mt-15">' +
          '<a href="kampanya.html?id=' + encodeURIComponent(kmp.id) + '" class="yk-link-more"><i class="fa-solid fa-arrow-left"></i> Kampanyaya dön</a>' +
          '<button type="button" class="yk-mini-btn" id="yk-odeme-vazgec">Vazgeç ve kuponu iptal et</button>' +
        '</div>' +
      '</div></div></div>';
    sayac(c);

    document.getElementById('yk-odeme-vazgec').addEventListener('click', function (e) {
      var b = e.currentTarget;
      if (!b.dataset.onay) { b.dataset.onay = '1'; b.textContent = 'Emin misiniz? İptal et'; b.classList.add('yk-onay'); return; }
      b.disabled = true;
      YK.kupon.iptal(c.id).then(function () { window.location.href = 'kampanya.html?id=' + encodeURIComponent(kmp.id); },
        function (er) { U.bildir(er.message, 'hata'); b.disabled = false; });
    });

    var alan = document.getElementById('yk-odeme-alan');
    YK.odeme.baslat(c.siparis_no).then(function (r) {
      if (r && r.tip === 'iframe') {
        alan.innerHTML = '<iframe src="' + esc(r.url) + '" class="yk-odeme-iframe" title="Güvenli ödeme" scrolling="yes"></iframe>';
      } else if (r && r.tip === 'demo') {
        alan.innerHTML = '<div class="yk-demo-odeme">' +
          '<div class="yk-demo-kart"><span>TEST KARTI</span><strong>4355 0843 5508 4358</strong><small>12/30 · 000</small></div>' +
          '<p class="yk-muted">Demo modunda gerçek ödeme alınmaz. Sonucu seçin:</p>' +
          '<div class="d-flex gap-2 flex-wrap">' +
            '<button type="button" class="yk-btn" id="yk-demo-ode"><i class="fa-solid fa-check"></i> ' + tl(c.kupon_bedeli) + ' öde (test)</button>' +
            '<button type="button" class="yk-btn-outline" id="yk-demo-red">Başarısız ödeme (test)</button>' +
          '</div></div>';
        document.getElementById('yk-demo-ode').addEventListener('click', function () {
          this.disabled = true;
          YK.odeme.demo(c.siparis_no, true).then(function (y) {
            window.location.href = 'kupon.html?kod=' + encodeURIComponent(y.kod) + '&yeni=1';
          }, function (er) { U.bildir(er.message, 'hata'); });
        });
        document.getElementById('yk-demo-red').addEventListener('click', function () {
          YK.odeme.demo(c.siparis_no, false).then(function () { yukle(); });
        });
      } else {
        alan.innerHTML = '<div class="yk-uyari yk-uyari-hata">Ödeme ekranı açılamadı.</div>';
      }
    }, function (er) {
      alan.innerHTML = '<div class="yk-uyari yk-uyari-hata">' + esc(er.message) + '</div>' +
        '<button type="button" class="yk-btn" id="yk-odeme-tekrar">Tekrar dene</button>';
      document.getElementById('yk-odeme-tekrar').addEventListener('click', function () { odemeEkrani(c); });
    });
  }

  // Ödeme sağlayıcısından başarılı dönüş: sunucuya bildirim gelene kadar bekle
  function onayBekle(deneme) {
    mesaj('fa-hourglass-half', 'Ödemeniz kontrol ediliyor', 'Bu işlem genellikle birkaç saniye sürer. Lütfen sayfayı kapatmayın.');
    YK.kupon.siparis(siparis).then(function (c) {
      if (c.durum === 'aktif' || c.durum === 'kullanildi') {
        window.location.href = 'kupon.html?kod=' + encodeURIComponent(c.kod) + '&yeni=1';
      } else if (deneme < 20) {
        setTimeout(function () { onayBekle(deneme + 1); }, 2000);
      } else {
        mesaj('fa-envelope-circle-check', 'Ödemeniz alındı, onay bekleniyor',
          'Ödeme kuruluşunun onayı biraz gecikti. Onay gelir gelmez kuponunuz <a href="hesabim.html">Hesabım</a> sayfasında görünecek.',
          '<a class="yk-btn" href="hesabim.html">Kuponlarıma git</a>');
      }
    }, function (e) { mesaj('fa-triangle-exclamation', 'Bir sorun oluştu', esc(e.message)); });
  }

  function yukle() {
    YK.kupon.siparis(siparis).then(function (c) {
      var kmp = c.kampanya || {}, geri = '<a class="yk-btn" href="kampanya.html?id=' + encodeURIComponent(kmp.id) + '">Kampanyaya dön</a>';
      document.title = 'Ödeme — ' + kmp.baslik + ' | Yakaladım';
      if (c.durum === 'aktif' || c.durum === 'kullanildi' || c.durum === 'suresi_doldu') {
        window.location.href = 'kupon.html?kod=' + encodeURIComponent(c.kod) + (c.durum === 'aktif' ? '&yeni=1' : '');
      } else if (c.durum === 'odeme_bekliyor' && sonuc === 'basarili') {
        onayBekle(0);
      } else if (c.durum === 'odeme_bekliyor') {
        odemeEkrani(c);
      } else if (c.durum === 'odeme_zaman_asimi') {
        mesaj('fa-clock', 'Ödeme süresi doldu', 'Kupon sizin için ' + 'belirli bir süre ayrılmıştı ve bu süre doldu. Kampanya hâlâ devam ediyorsa yeniden kupon alabilirsiniz.', geri);
      } else {
        mesaj('fa-ban', 'Bu sipariş iptal edildi', 'Ödeme tamamlanmadığı için kupon oluşturulmadı. Kampanya devam ediyorsa yeniden deneyebilirsiniz.', geri);
      }
    }, function (e) {
      mesaj('fa-receipt', 'Sipariş bulunamadı', esc(e.message), '<a class="yk-btn" href="hesabim.html">Hesabıma git</a>');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    kok = document.getElementById('yk-odeme');
    if (!kok) return;
    YK.hazir.then(function () {
      if (!YK.kullanici) {
        window.location.href = 'giris.html?donus=' + encodeURIComponent('odeme.html?siparis=' + (siparis || '') + (sonuc ? '&sonuc=' + sonuc : ''));
        return;
      }
      if (!siparis) { window.location.href = 'hesabim.html'; return; }
      yukle();
    });
  });
})();
