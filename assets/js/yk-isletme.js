/* =====================================================================
   YAKALADIM — İŞLETME PANELİ (isletme-paneli.html)
   Kasiyer kupon kodunu yazar ya da müşterinin QR'ını okutur
   (telefon kamerası QR'ı okuyunca bu sayfa ?kod=... ile açılır),
   kuponu doğrular ve "kullanıldı" olarak işaretler.
   ===================================================================== */
(function () {
  'use strict';
  var YK = window.YK, U = window.YKUI, esc = U.esc, tl = U.tl;

  function kodBicimle(v) {
    var x = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (x.indexOf('YK') === 0) x = x.slice(2);
    x = x.slice(0, 8);
    return 'YK-' + x.slice(0, 4) + (x.length > 4 ? '-' + x.slice(4) : '');
  }
  function rezervasyon(c) {
    if (!c.rezervasyon_tarihi) return '';
    return U.tarih(c.rezervasyon_tarihi, { day: 'numeric', month: 'long', weekday: 'long' }) +
      (c.rezervasyon_saati ? ' · ' + esc(c.rezervasyon_saati) : '') + (c.kisi_sayisi ? ' · ' + c.kisi_sayisi + ' kişi' : '');
  }

  function panel() {
    var kok = document.getElementById('yk-panel');
    if (!kok) return;

    YK.hazir.then(function () {
      var k = YK.kullanici;
      if (!k) { window.location.href = 'giris.html?donus=' + encodeURIComponent('isletme-paneli.html' + window.location.search); return; }
      if (k.rol !== 'isletme' && k.rol !== 'admin') {
        kok.innerHTML = '<div class="yk-empty"><i class="fa-solid fa-store"></i><h4>Bu sayfa işletme hesapları içindir</h4>' +
          '<p>İşletmeniz Yakaladım\'da kampanya yayınlıyorsa, yöneticimiz hesabınızı işletme hesabına dönüştürebilir.</p>' +
          '<a class="yk-btn" href="iletisim.html?tip=isletme">İşletme başvurusu yap</a></div>';
        return;
      }
      kur(kok, k);
    });
  }

  function kur(kok, k) {
    var kameraVar = 'BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    kok.innerHTML = '' +
      '<div class="yk-panel-ust">' +
        '<div><span class="yk-eyebrow">' + (k.rol === 'admin' && !k.isletme ? 'Yönetici görünümü — tüm işletmeler' : 'İşletme') + '</span>' +
        '<h2 class="yk-h2" id="yk-isletme-adi">' + esc(k.isletme || 'Tüm işletmeler') + '</h2></div>' +
        '<div class="yk-stat-row" id="yk-panel-ozet"></div>' +
      '</div>' +
      '<div class="row g-4 mt-10">' +
        '<div class="col-lg-5">' +
          '<div class="yk-form-card yk-dogrula">' +
            '<h4 class="mb-15"><i class="fa-solid fa-qrcode" style="color:#ff4a22"></i> Kupon doğrula</h4>' +
            '<form id="yk-kod-form" autocomplete="off" novalidate>' +
              '<label for="yk-kod">Kupon kodu</label>' +
              '<input id="yk-kod" class="yk-input yk-kod-input" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="YK-XXXX-XXXX" maxlength="14">' +
              '<div class="d-flex gap-2 mt-15">' +
                '<button type="submit" class="yk-btn flex-grow-1"><i class="fa-solid fa-magnifying-glass"></i> Sorgula</button>' +
                (kameraVar ? '<button type="button" class="yk-btn-outline" id="yk-kamera"><i class="fa-solid fa-camera"></i> Tara</button>' : '') +
              '</div>' +
            '</form>' +
            '<div id="yk-kamera-alan" hidden><video id="yk-video" playsinline muted></video><button type="button" class="yk-btn-outline w-100 mt-10" id="yk-kamera-kapat">Kamerayı kapat</button></div>' +
            '<p class="yk-muted mt-15 mb-0" style="font-size:13px"><i class="fa-solid fa-mobile-screen"></i> İpucu: Müşterinin QR kodunu telefonunuzun kamerasıyla okuttuğunuzda bu sayfa kupon kodu dolu olarak açılır.</p>' +
          '</div>' +
          '<div id="yk-sonuc" class="mt-20" aria-live="polite"></div>' +
        '</div>' +
        '<div class="col-lg-7">' +
          '<div class="yk-form-card">' +
            '<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-15">' +
              '<h4 class="mb-0">Kuponlar ve rezervasyonlar</h4>' +
              '<input id="yk-liste-ara" class="yk-input" style="max-width:220px" placeholder="Kod veya müşteri ara">' +
            '</div>' +
            '<div class="yk-pill-row mb-15" id="yk-liste-filtre"></div>' +
            '<div id="yk-liste"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var input = document.getElementById('yk-kod'), sonuc = document.getElementById('yk-sonuc');
    input.addEventListener('input', function () {
      var pos = input.value.length;
      input.value = input.value.trim() ? kodBicimle(input.value) : '';
      if (pos >= input.value.length) input.setSelectionRange(input.value.length, input.value.length);
    });
    document.getElementById('yk-kod-form').addEventListener('submit', function (e) {
      e.preventDefault();
      sorgula(input.value);
    });

    function sorgula(kod) {
      if (String(kod).replace(/[^A-Z0-9]/gi, '').length < 8) {
        sonuc.innerHTML = '<div class="yk-uyari yk-uyari-hata">Kupon kodu 8 karakterden oluşur (YK-XXXX-XXXX).</div>';
        return;
      }
      sonuc.innerHTML = '<div class="yk-loading"><span class="yk-spin"></span> Sorgulanıyor…</div>';
      YK.isletme.sorgula(kod).then(sonucCiz, function (e) {
        sonuc.innerHTML = '<div class="yk-sonuc-kart yk-sonuc-hata"><i class="fa-solid fa-circle-xmark"></i><div><h5>' + esc(e.message) +
          '</h5><p class="mb-0">Kodu müşteriyle birlikte tekrar kontrol edin.</p></div></div>';
      });
    }

    function sonucCiz(c, yeniKullanildi) {
      var kmp = c.kampanya || {}, gecerli = c.durum === 'aktif';
      var basarili = gecerli || yeniKullanildi;
      var bugunMu = c.rezervasyon_tarihi && c.rezervasyon_tarihi === YK.bugun();
      sonuc.innerHTML = '' +
        '<div class="yk-sonuc-kart ' + (basarili ? 'yk-sonuc-ok' : 'yk-sonuc-hata') + '">' +
          '<i class="fa-solid ' + (basarili ? 'fa-circle-check' : 'fa-circle-xmark') + '"></i>' +
          '<div class="flex-grow-1">' +
            '<h5>' + (gecerli ? 'Geçerli kupon' : yeniKullanildi ? 'Kupon kullanıldı — ödemeyi alın' : 'Kupon kullanılamaz: ' + esc(YK.durumAdi(c.durum))) +
              ' <code class="yk-kod-etiket">' + esc(c.kod) + '</code></h5>' +
            '<p class="mb-5"><strong>' + esc(kmp.baslik) + '</strong>' + (kmp.isletme && !YK.kullanici.isletme ? ' · ' + esc(kmp.isletme) : '') + '</p>' +
            '<div class="yk-sonuc-izgara">' +
              '<div><span>Müşteri</span><strong>' + esc((c.musteri || {}).ad_soyad || '-') + '</strong></div>' +
              '<div><span>Adet</span><strong>' + c.adet + '</strong></div>' +
              '<div><span>Tahsil edilecek</span><strong>' + tl(c.toplam) + '</strong></div>' +
              (c.rezervasyon_tarihi ? '<div class="yk-tam"><span>Rezervasyon' + (bugunMu ? ' (bugün)' : '') + '</span><strong>' + rezervasyon(c) + '</strong></div>' : '') +
              ((c.musteri || {}).telefon ? '<div class="yk-tam"><span>Telefon</span><strong><a href="tel:' + esc(c.musteri.telefon.replace(/[^0-9+]/g, '')) + '">' + esc(c.musteri.telefon) + '</a></strong></div>' : '') +
              (c.musteri_notu ? '<div class="yk-tam"><span>Müşteri notu</span><strong>' + esc(c.musteri_notu) + '</strong></div>' : '') +
              '<div class="yk-tam"><span>' + (c.durum === 'kullanildi' ? 'Kullanım zamanı' : 'Son kullanma') + '</span><strong>' +
                U.tarihSaat(c.durum === 'kullanildi' ? c.kullanim_zamani : c.son_kullanma) + '</strong></div>' +
            '</div>' +
            (gecerli ? '<button type="button" class="yk-btn w-100 mt-15" id="yk-kullan"><i class="fa-solid fa-check-double"></i> Kullanıldı olarak işaretle</button>' +
              '<p class="yk-muted mt-10 mb-0" style="font-size:12px">Ödemeyi aldıktan sonra işaretleyin. Bu işlem geri alınamaz.</p>' : '') +
          '</div>' +
        '</div>';
      var b = document.getElementById('yk-kullan');
      if (b) b.addEventListener('click', function () {
        if (!b.dataset.onay) {
          b.dataset.onay = '1';
          b.innerHTML = '<i class="fa-solid fa-hand-pointer"></i> Onaylamak için tekrar dokunun';
          b.classList.add('yk-onay');
          setTimeout(function () {
            if (b.dataset.onay) { delete b.dataset.onay; b.innerHTML = '<i class="fa-solid fa-check-double"></i> Kullanıldı olarak işaretle'; b.classList.remove('yk-onay'); }
          }, 5000);
          return;
        }
        b.disabled = true;
        b.innerHTML = '<span class="yk-spin"></span> İşaretleniyor…';
        YK.isletme.kullan(c.kod).then(function (y) {
          sonucCiz(y, true);
          U.bildir('Kupon kullanıldı olarak işaretlendi. Tahsil edilecek: ' + tl(y.toplam), 'basari');
          input.value = '';
          listeYukle();
        }, function (e) {
          U.bildir(e.message, 'hata');
          sorgula(c.kod);
        });
      });
    }

    // Kamera ile QR okuma (destekleyen tarayıcılarda)
    var akis = null;
    var kb = document.getElementById('yk-kamera');
    if (kb) kb.addEventListener('click', function () {
      var alan = document.getElementById('yk-kamera-alan'), video = document.getElementById('yk-video');
      var dedektor = new window.BarcodeDetector({ formats: ['qr_code'] });
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (s) {
        akis = s; video.srcObject = s; alan.hidden = false; video.play();
        (function tara() {
          if (!akis) return;
          dedektor.detect(video).then(function (kodlar) {
            if (kodlar.length) {
              var deger = kodlar[0].rawValue, m = /kod=([^&]+)/.exec(deger);
              var kod = m ? decodeURIComponent(m[1]) : deger;
              kapat();
              input.value = kodBicimle(kod);
              sorgula(input.value);
            } else setTimeout(tara, 250);
          }, function () { setTimeout(tara, 400); });
        })();
      }, function () { U.bildir('Kameraya erişilemedi. Tarayıcı izinlerini kontrol edin veya kodu elle yazın.', 'hata'); });
    });
    function kapat() {
      if (akis) akis.getTracks().forEach(function (t) { t.stop(); });
      akis = null;
      var alan = document.getElementById('yk-kamera-alan');
      if (alan) alan.hidden = true;
    }
    var kk = document.getElementById('yk-kamera-kapat');
    if (kk) kk.addEventListener('click', kapat);

    // Liste
    var veri = { kuponlar: [] }, filtre = 'bugun', ara = '';
    var adlar = { bugun: 'Bugünkü rezervasyonlar', aktif: 'Kullanılabilir', kullanildi: 'Kullanılan', tumu: 'Tümü' };
    function listeCiz() {
      var b = YK.bugun();
      var l = veri.kuponlar.filter(function (c) {
        if (filtre === 'bugun' && !(c.rezervasyon_tarihi === b && c.durum === 'aktif')) return false;
        if (filtre === 'aktif' && c.durum !== 'aktif') return false;
        if (filtre === 'kullanildi' && c.durum !== 'kullanildi') return false;
        if (ara) {
          var m = (c.kod + ' ' + ((c.musteri || {}).ad_soyad || '') + ' ' + ((c.kampanya || {}).baslik || '')).toLocaleLowerCase('tr-TR');
          if (m.indexOf(ara) === -1) return false;
        }
        return true;
      });
      if (filtre === 'bugun') l.sort(function (x, y) { return String(x.rezervasyon_saati).localeCompare(String(y.rezervasyon_saati)); });
      document.getElementById('yk-liste-filtre').innerHTML = Object.keys(adlar).map(function (a) {
        return '<button type="button" class="yk-pill' + (a === filtre ? ' active' : '') + '" data-f="' + a + '">' + adlar[a] + '</button>';
      }).join('');
      document.querySelectorAll('#yk-liste-filtre [data-f]').forEach(function (x) {
        x.addEventListener('click', function () { filtre = x.getAttribute('data-f'); listeCiz(); });
      });
      document.getElementById('yk-liste').innerHTML = l.length ? '<div class="yk-tablo-sar"><table class="yk-tablo"><thead><tr>' +
        '<th>Kod</th><th>Kampanya</th><th>Müşteri</th><th>Rezervasyon</th><th>Tutar</th><th>Durum</th></tr></thead><tbody>' +
        l.map(function (c) {
          return '<tr data-kod="' + esc(c.kod) + '" tabindex="0"><td><code>' + esc(c.kod) + '</code></td><td>' + esc((c.kampanya || {}).baslik) + '</td>' +
            '<td>' + esc((c.musteri || {}).ad_soyad || '') + '</td><td>' + (rezervasyon(c) || '<span class="yk-muted">—</span>') + '</td>' +
            '<td>' + tl(c.toplam) + '</td><td><span class="yk-durum yk-durum-' + esc(c.durum) + '">' + esc(YK.durumAdi(c.durum)) + '</span></td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="yk-empty" style="padding:30px"><i class="fa-regular fa-calendar"></i><p class="mb-0">' +
          (filtre === 'bugun' ? 'Bugün için rezervasyon yok.' : 'Bu filtrede kupon yok.') + '</p></div>';
      document.querySelectorAll('#yk-liste [data-kod]').forEach(function (tr) {
        function sec() { input.value = tr.getAttribute('data-kod'); sorgula(input.value); window.scrollTo({ top: sonuc.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' }); }
        tr.addEventListener('click', sec);
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') sec(); });
      });
    }
    document.getElementById('yk-liste-ara').addEventListener('input', function (e) {
      ara = e.target.value.trim().toLocaleLowerCase('tr-TR'); listeCiz();
    });
    function listeYukle() {
      YK.isletme.kuponlar().then(function (r) {
        veri = r || { kuponlar: [] };
        var o = veri.ozet || {};
        document.getElementById('yk-panel-ozet').innerHTML =
          '<div class="yk-mini-stat"><strong>' + (o.bugun_rezervasyon || 0) + '</strong><span>Bugün rezervasyon</span></div>' +
          '<div class="yk-mini-stat"><strong>' + (o.aktif || 0) + '</strong><span>Kullanılabilir</span></div>' +
          '<div class="yk-mini-stat"><strong>' + (o.kullanildi || 0) + '</strong><span>Kullanılan</span></div>' +
          '<div class="yk-mini-stat"><strong>' + tl(o.tahsil_edilen || 0) + '</strong><span>Kuponla satış</span></div>';
        if (filtre === 'bugun' && !veri.kuponlar.some(function (c) { return c.rezervasyon_tarihi === YK.bugun() && c.durum === 'aktif'; })) filtre = 'aktif';
        listeCiz();
      }, function (e) { U.hataKutusu(document.getElementById('yk-liste'), e, listeYukle); });
    }
    listeYukle();

    var ilkKod = U.params().get('kod');
    if (ilkKod) { input.value = kodBicimle(ilkKod); sorgula(input.value); }
    else input.focus();
  }

  document.addEventListener('DOMContentLoaded', panel);
})();
