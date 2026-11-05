/* =====================================================================
   YAKALADIM — ÜYELİK SAYFALARI
   giris.html  : giriş, üyelik, şifre sıfırlama, yeni şifre
   hesabim.html: kuponlarım, profil, şifre değiştirme
   kupon.html  : QR'lı kupon (mekanda gösterilir, yazdırılabilir)
   ===================================================================== */
(function () {
  'use strict';
  var YK = window.YK, U = window.YKUI;
  var esc = U.esc, tl = U.tl;

  function girisGerekli(donus) {
    window.location.href = 'giris.html?donus=' + encodeURIComponent(donus);
  }

  /* ================================================================
     GİRİŞ / ÜYE OL
     ================================================================ */
  function girisSayfasi() {
    var kart = document.getElementById('yk-auth-kart');
    if (!kart) return;
    var p = U.params();
    var donus = YK.guvenliDonus(p.get('donus'), 'hesabim.html');
    var mesaj = document.getElementById('yk-auth-mesaj');

    function goster(m, tur) {
      mesaj.hidden = !m;
      mesaj.className = 'yk-uyari' + (tur ? ' yk-uyari-' + tur : '');
      mesaj.textContent = m || '';
    }
    function panel(ad) {
      kart.querySelectorAll('[data-auth-panel]').forEach(function (f) { f.hidden = f.getAttribute('data-auth-panel') !== ad; });
      kart.querySelectorAll('.yk-tabs [data-auth-tab]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-auth-tab') === ad); });
      goster('');
      var ilk = kart.querySelector('[data-auth-panel="' + ad + '"] input');
      if (ilk && document.activeElement && document.activeElement.tagName === 'BUTTON') ilk.focus();
    }
    kart.querySelectorAll('[data-auth-tab]').forEach(function (b) {
      b.addEventListener('click', function () { panel(b.getAttribute('data-auth-tab')); });
    });
    document.getElementById('yk-sifre-unuttum').addEventListener('click', function (e) { e.preventDefault(); panel('sifirla'); });

    function mesgul(form, evet) {
      var b = form.querySelector('[type=submit]');
      b.disabled = evet;
      if (evet) { b.dataset.metin = b.innerHTML; b.innerHTML = '<span class="yk-spin"></span> Lütfen bekleyin…'; }
      else if (b.dataset.metin) b.innerHTML = b.dataset.metin;
    }
    function deger(form, ad) { var el = form.querySelector('[name=' + ad + ']'); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; }

    var gf = document.getElementById('yk-giris-form');
    gf.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!deger(gf, 'eposta') || !deger(gf, 'sifre')) return goster('E-posta ve şifrenizi yazın.', 'hata');
      mesgul(gf, true);
      YK.auth.giris(deger(gf, 'eposta'), gf.querySelector('[name=sifre]').value).then(function () {
        window.location.href = donus;
      }, function (err) { goster(err.message, 'hata'); mesgul(gf, false); });
    });

    var kf = document.getElementById('yk-kayit-form');
    kf.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!deger(kf, 'adSoyad')) return goster('Adınızı ve soyadınızı yazın.', 'hata');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(deger(kf, 'eposta'))) return goster('Geçerli bir e-posta adresi girin.', 'hata');
      if (kf.querySelector('[name=sifre]').value.length < 8) return goster('Şifre en az 8 karakter olmalıdır.', 'hata');
      if (!deger(kf, 'kvkk')) return goster('Devam etmek için KVKK metnini ve kullanım koşullarını onaylamalısınız.', 'hata');
      mesgul(kf, true);
      var ep = deger(kf, 'eposta');
      YK.auth.kayit({
        adSoyad: deger(kf, 'adSoyad'), eposta: deger(kf, 'eposta'), telefon: deger(kf, 'telefon'),
        sifre: kf.querySelector('[name=sifre]').value, kvkk: true, pazarlama: deger(kf, 'pazarlama')
      }).then(function (r) {
        if (r.durum === 'giris') { window.location.href = donus; return; }
        mesgul(kf, false);
        kf.reset();
        panel('giris');
        goster('Üyeliğiniz oluşturuldu. Doğrulama bağlantısını ' + ep + ' adresine gönderdik; bağlantıya tıkladıktan sonra giriş yapabilirsiniz.', 'basari');
      }, function (err) { goster(err.message, 'hata'); mesgul(kf, false); });
    });

    var sf = document.getElementById('yk-sifirla-form');
    sf.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!deger(sf, 'eposta')) return goster('E-posta adresinizi yazın.', 'hata');
      mesgul(sf, true);
      YK.auth.sifreSifirla(deger(sf, 'eposta')).then(function (r) {
        mesgul(sf, false);
        goster(r && r.demo ? 'Demo modunda e-posta gönderilmez. Demo hesap şifresi: demo1234'
          : 'Bu adrese kayıtlı bir hesap varsa şifre yenileme bağlantısı birkaç dakika içinde gelecek. Gereksiz (spam) klasörünü de kontrol edin.', 'basari');
      }, function (err) { goster(err.message, 'hata'); mesgul(sf, false); });
    });

    var yf = document.getElementById('yk-yenisifre-form');
    yf.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = yf.querySelector('[name=sifre]').value;
      if (s.length < 8) return goster('Şifre en az 8 karakter olmalıdır.', 'hata');
      mesgul(yf, true);
      YK.auth.yeniSifre(s).then(function () {
        goster('Şifreniz güncellendi. Hesabınıza yönlendiriliyorsunuz…', 'basari');
        setTimeout(function () { window.location.href = 'hesabim.html'; }, 1200);
      }, function (err) { goster(err.message, 'hata'); mesgul(yf, false); });
    });

    if (YK.mod === 'demo') {
      var dk = document.getElementById('yk-demo-hesaplar');
      dk.hidden = false;
      dk.querySelectorAll('[data-demo]').forEach(function (b) {
        b.addEventListener('click', function () {
          panel('giris');
          gf.querySelector('[name=eposta]').value = b.getAttribute('data-demo');
          gf.querySelector('[name=sifre]').value = 'demo1234';
          donus = b.getAttribute('data-demo').indexOf('yonetici') === 0 ? 'yonetim.html' : 'isletme-paneli.html';
          gf.requestSubmit ? gf.requestSubmit() : gf.dispatchEvent(new Event('submit', { cancelable: true }));
        });
      });
    }

    if (p.get('neden') === 'kupon') goster('Kupon almak için giriş yapın veya ücretsiz üye olun.', 'bilgi');
    if (p.get('sekme') === 'kayit') panel('kayit');

    YK.hazir.then(function (bag) {
      if (bag && bag.tip === 'hata') { goster(bag.mesaj, 'hata'); return; }
      if (bag && bag.tip === 'recovery' || p.get('sifre') === 'yeni' && YK.kullanici) { panel('yenisifre'); return; }
      if (bag && (bag.tip === 'signup' || bag.tip === 'email' || bag.tip === 'magiclink')) {
        goster('E-posta adresiniz doğrulandı, hoş geldiniz! Yönlendiriliyorsunuz…', 'basari');
        setTimeout(function () { window.location.href = donus; }, 1200);
        return;
      }
      if (YK.kullanici && !p.get('sifre')) {
        goster('Zaten giriş yaptınız (' + (YK.kullanici.eposta || '') + ').', 'bilgi');
        var a = document.createElement('a');
        a.href = donus; a.className = 'yk-btn w-100 mt-10'; a.textContent = 'Devam et';
        mesaj.after(a);
      }
    });
  }

  /* ================================================================
     KUPON KARTI (hesabım listesinde)
     ================================================================ */
  function rozet(durum) {
    return '<span class="yk-durum yk-durum-' + esc(durum) + '">' + esc(YK.durumAdi(durum)) + '</span>';
  }
  function rezervasyonMetni(c) {
    if (!c.rezervasyon_tarihi) return '';
    return U.tarih(c.rezervasyon_tarihi, { day: 'numeric', month: 'long', weekday: 'long' }) +
      (c.rezervasyon_saati ? ', ' + esc(c.rezervasyon_saati) : '') + (c.kisi_sayisi ? ' · ' + c.kisi_sayisi + ' kişi' : '');
  }
  function kuponSatiri(c) {
    var k = c.kampanya || {};
    return '' +
      '<div class="yk-kupon-satir" data-durum="' + esc(c.durum) + '">' +
        '<div class="yk-kupon-satir-sol">' +
          '<div class="d-flex gap-2 align-items-center flex-wrap mb-5">' + rozet(c.durum) +
            '<span class="yk-muted">' + esc(U.kategoriAdi(k.kategori)) + '</span></div>' +
          '<h5>' + esc(k.baslik) + '</h5>' +
          '<p class="yk-muted mb-5"><i class="fa-solid fa-store"></i> ' + esc(k.isletme || '') +
            (k.semt ? ' · ' + esc(k.semt) : '') + '</p>' +
          (c.rezervasyon_tarihi ? '<p class="mb-5"><i class="fa-regular fa-calendar-check" style="color:#ff4a22"></i> ' + rezervasyonMetni(c) + '</p>' : '') +
          '<p class="yk-muted mb-0" style="font-size:13px">' +
            (c.durum === 'odeme_bekliyor' ? 'Ödeme için son: ' + U.tarihSaat(c.odeme_son)
              : c.durum === 'kullanildi' ? 'Kullanıldı: ' + U.tarihSaat(c.kullanim_zamani)
              : c.durum === 'iptal' ? 'İptal: ' + U.tarihSaat(c.iptal_zamani)
              : 'Son kullanma: ' + U.tarihSaat(c.son_kullanma)) + '</p>' +
        '</div>' +
        '<div class="yk-kupon-satir-sag">' +
          (c.kod ? '<code class="yk-kod-kucuk">' + esc(c.kod) + '</code>' : '<span class="yk-muted" style="font-size:13px">Kod, ödeme onaylanınca oluşur</span>') +
          '<div class="yk-muted" style="font-size:13px">' + c.adet + ' adet · <strong style="color:#1a1a1a">' + tl(c.toplam) + '</strong></div>' +
          (c.kupon_bedeli > 0 ? '<div class="yk-muted" style="font-size:12px">Kupon bedeli ' + tl(c.kupon_bedeli) +
            (c.odeme_durumu === 'odendi' ? ' · ödendi' : c.odeme_durumu === 'iade' ? ' · iade edildi' : '') + '</div>' : '') +
          '<div class="d-flex gap-2 flex-wrap justify-content-end">' +
            (c.durum === 'odeme_bekliyor'
              ? '<a class="yk-btn" style="padding:9px 16px;font-size:14px" href="odeme.html?siparis=' + encodeURIComponent(c.siparis_no) + '"><i class="fa-regular fa-credit-card"></i> Ödemeye devam et</a>'
              : c.kod ? '<a class="yk-btn" style="padding:9px 16px;font-size:14px" href="kupon.html?kod=' + encodeURIComponent(c.kod) + '"><i class="fa-solid fa-qrcode"></i> ' +
                (c.durum === 'aktif' ? 'Kuponu Göster' : 'Detay') + '</a>' : '') +
            (c.durum === 'aktif' || c.durum === 'odeme_bekliyor' ? '<button type="button" class="yk-btn-outline" style="padding:8px 14px;font-size:14px" data-iptal="' + esc(c.id) + '"' +
              (c.odeme_durumu === 'odendi' ? ' data-ucretli="1"' : '') + '>İptal</button>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // İki adımlı onay (tarayıcı confirm() penceresi yerine)
  function ikiAdimli(btn, soru, islem) {
    if (btn.dataset.onay) { delete btn.dataset.onay; islem(); return; }
    btn.dataset.onay = '1';
    var eski = btn.innerHTML;
    btn.innerHTML = soru;
    btn.classList.add('yk-onay');
    setTimeout(function () {
      if (btn.dataset.onay) { delete btn.dataset.onay; btn.innerHTML = eski; btn.classList.remove('yk-onay'); }
    }, 4000);
  }

  /* ================================================================
     HESABIM
     ================================================================ */
  function hesabimSayfasi() {
    var kok = document.getElementById('yk-hesap');
    if (!kok) return;

    YK.hazir.then(function () {
      var k = YK.kullanici;
      if (!k) return girisGerekli('hesabim.html');
      var sekme = U.params().get('sekme') || 'kuponlar';

      kok.innerHTML = '' +
        '<div class="yk-hesap-ust">' +
          '<div class="yk-avatar">' + esc((k.ad_soyad || k.eposta || '?').charAt(0).toLocaleUpperCase('tr-TR')) + '</div>' +
          '<div class="flex-grow-1"><h3 class="mb-0">' + esc(k.ad_soyad || 'Yakaladım üyesi') + '</h3>' +
            '<p class="yk-muted mb-0">' + esc(k.eposta || '') + ' · <span class="yk-rol">' + esc(YK.rolAdi(k.rol)) + '</span>' +
            (k.isletme ? ' · ' + esc(k.isletme) : '') + '</p></div>' +
          '<div class="d-flex gap-2 flex-wrap">' +
            (k.rol === 'isletme' || k.rol === 'admin' ? '<a class="yk-btn" href="isletme-paneli.html"><i class="fa-solid fa-cash-register"></i> İşletme Paneli</a>' : '') +
            (k.rol === 'admin' ? '<a class="yk-btn" href="yonetim.html"><i class="fa-solid fa-gauge"></i> Yönetim</a>' : '') +
            '<button type="button" class="yk-btn-outline" id="yk-cikis"><i class="fa-solid fa-right-from-bracket"></i> Çıkış</button>' +
          '</div>' +
        '</div>' +
        '<div class="yk-tabs mt-25">' +
          '<button type="button" class="yk-pill" data-sekme="kuponlar"><i class="fa-solid fa-ticket"></i> Kuponlarım</button>' +
          '<button type="button" class="yk-pill" data-sekme="profil"><i class="fa-regular fa-id-card"></i> Profil</button>' +
          '<button type="button" class="yk-pill" data-sekme="sifre"><i class="fa-solid fa-key"></i> Şifre</button>' +
        '</div>' +
        '<div id="yk-sekme-kuponlar" data-icerik="kuponlar"></div>' +
        '<div id="yk-sekme-profil" data-icerik="profil" hidden></div>' +
        '<div id="yk-sekme-sifre" data-icerik="sifre" hidden></div>';

      document.getElementById('yk-cikis').addEventListener('click', function () {
        YK.auth.cikis().then(function () { window.location.href = 'index.html'; });
      });
      function sekmeAc(ad) {
        kok.querySelectorAll('[data-sekme]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-sekme') === ad); });
        kok.querySelectorAll('[data-icerik]').forEach(function (d) { d.hidden = d.getAttribute('data-icerik') !== ad; });
      }
      kok.querySelectorAll('[data-sekme]').forEach(function (b) {
        b.addEventListener('click', function () { sekmeAc(b.getAttribute('data-sekme')); });
      });
      sekmeAc(sekme);
      kuponlarSekmesi(document.getElementById('yk-sekme-kuponlar'));
      profilSekmesi(document.getElementById('yk-sekme-profil'), k);
      sifreSekmesi(document.getElementById('yk-sekme-sifre'));
    });
  }

  function kuponlarSekmesi(el) {
    var filtre = 'aktif', liste = [];
    function ciz() {
      var sayilar = { tumu: liste.length, aktif: 0, odeme_bekliyor: 0, kullanildi: 0, suresi_doldu: 0, iptal: 0 };
      liste.forEach(function (c) { sayilar[c.durum] = (sayilar[c.durum] || 0) + 1; });
      var gorunen = liste.filter(function (c) { return filtre === 'tumu' || c.durum === filtre; });
      var adlar = { aktif: 'Kullanılabilir', kullanildi: 'Kullanılan', suresi_doldu: 'Süresi dolan', iptal: 'İptal', tumu: 'Tümü' };
      if (sayilar.odeme_bekliyor) adlar = Object.assign({ odeme_bekliyor: 'Ödeme bekleyen' }, adlar);
      el.innerHTML = '' +
        '<div class="yk-pill-row mb-20">' + Object.keys(adlar).map(function (a) {
          return '<button type="button" class="yk-pill' + (filtre === a ? ' active' : '') + '" data-filtre="' + a + '">' + adlar[a] + ' (' + (sayilar[a] || 0) + ')</button>';
        }).join('') + '</div>' +
        (gorunen.length ? gorunen.map(kuponSatiri).join('') :
          '<div class="yk-empty"><i class="fa-solid fa-ticket"></i><h5>' +
            (liste.length ? 'Bu filtrede kupon yok' : 'Henüz kuponun yok') + '</h5>' +
            '<p>Fırsatlara göz at, beğendiğin kampanyadan ücretsiz kupon al.</p>' +
            '<a href="kampanyalar.html" class="yk-btn">Fırsatları Keşfet</a></div>');
      el.querySelectorAll('[data-filtre]').forEach(function (b) {
        b.addEventListener('click', function () { filtre = b.getAttribute('data-filtre'); ciz(); });
      });
      el.querySelectorAll('[data-iptal]').forEach(function (b) {
        b.addEventListener('click', function () {
          ikiAdimli(b, b.getAttribute('data-ucretli') ? 'Bedel iade edilmez. İptal et?' : 'Emin misin? İptal et', function () {
            b.disabled = true;
            YK.kupon.iptal(b.getAttribute('data-iptal')).then(function () {
              U.bildir('Kupon iptal edildi.', 'basari'); yukle();
            }, function (e) { U.bildir(e.message, 'hata'); b.disabled = false; });
          });
        });
      });
    }
    function yukle() {
      U.yukleniyor(el, 'Kuponların yükleniyor…');
      YK.kupon.listem().then(function (l) {
        liste = l || [];
        if (liste.some(function (c) { return c.durum === 'odeme_bekliyor'; }) && filtre === 'aktif' &&
            !liste.some(function (c) { return c.durum === 'aktif'; })) filtre = 'odeme_bekliyor';
        if (filtre === 'aktif' && !liste.some(function (c) { return c.durum === 'aktif'; }) && liste.length) filtre = 'tumu';
        ciz();
      }, function (e) { U.hataKutusu(el, e, yukle); });
    }
    yukle();
  }

  function profilSekmesi(el, k) {
    el.innerHTML = '' +
      '<form class="yk-form-card" style="max-width:640px" id="yk-profil-form" novalidate>' +
        '<div class="row g-3">' +
          '<div class="col-md-6"><label for="pf-ad">Ad Soyad</label><input id="pf-ad" class="yk-input" name="adSoyad" maxlength="120" value="' + esc(k.ad_soyad || '') + '"></div>' +
          '<div class="col-md-6"><label for="pf-tel">Cep telefonu</label><input id="pf-tel" class="yk-input" name="telefon" type="tel" maxlength="20" value="' + esc(k.telefon || '') + '"></div>' +
          '<div class="col-12"><label>E-posta</label><input class="yk-input" value="' + esc(k.eposta || '') + '" disabled></div>' +
          '<div class="col-12"><label class="yk-check"><input type="checkbox" name="pazarlama"' + (k.pazarlama_izni ? ' checked' : '') + '>' +
            '<span>Kampanya ve fırsatlardan e-posta / SMS ile haberdar olmak istiyorum.</span></label></div>' +
          '<div class="col-12"><button type="submit" class="yk-btn">Kaydet</button></div>' +
        '</div>' +
        '<p class="yk-muted mt-20 mb-0" style="font-size:13px">Hesabınızı kapatmak veya verilerinizin silinmesini istemek için ' +
          '<a href="iletisim.html">bize yazın</a>. Ayrıntılar: <a href="gizlilik.html">KVKK Aydınlatma Metni</a>.</p>' +
      '</form>';
    var f = document.getElementById('yk-profil-form');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var b = f.querySelector('[type=submit]'); b.disabled = true;
      YK.profil.guncelle({
        adSoyad: f.querySelector('[name=adSoyad]').value, telefon: f.querySelector('[name=telefon]').value,
        pazarlama: f.querySelector('[name=pazarlama]').checked
      }).then(function () { U.bildir('Profilin güncellendi.', 'basari'); }, function (er) { U.bildir(er.message, 'hata'); })
        .then(function () { b.disabled = false; });
    });
  }

  function sifreSekmesi(el) {
    el.innerHTML = '' +
      '<form class="yk-form-card" style="max-width:480px" id="yk-sifre-form" novalidate>' +
        '<div class="mb-15"><label for="sd-1">Yeni şifre <span class="yk-muted">(en az 8 karakter)</span></label><input id="sd-1" class="yk-input" type="password" name="s1" autocomplete="new-password"></div>' +
        '<div class="mb-20"><label for="sd-2">Yeni şifre (tekrar)</label><input id="sd-2" class="yk-input" type="password" name="s2" autocomplete="new-password"></div>' +
        '<button type="submit" class="yk-btn">Şifreyi Değiştir</button>' +
      '</form>';
    var f = document.getElementById('yk-sifre-form');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var s1 = f.querySelector('[name=s1]').value, s2 = f.querySelector('[name=s2]').value;
      if (s1.length < 8) return U.bildir('Şifre en az 8 karakter olmalıdır.', 'hata');
      if (s1 !== s2) return U.bildir('Şifreler birbirinin aynı değil.', 'hata');
      var b = f.querySelector('[type=submit]'); b.disabled = true;
      YK.auth.yeniSifre(s1).then(function () { U.bildir('Şifren değiştirildi.', 'basari'); f.reset(); },
        function (er) { U.bildir(er.message, 'hata'); }).then(function () { b.disabled = false; });
    });
  }

  /* ================================================================
     KUPON (QR)
     ================================================================ */
  function kuponSayfasi() {
    var kok = document.getElementById('yk-kupon');
    if (!kok) return;
    var p = U.params(), kod = p.get('kod');

    YK.hazir.then(function () {
      if (!YK.kullanici) return girisGerekli('kupon.html?kod=' + encodeURIComponent(kod || ''));
      if (!kod && p.get('siparis')) { window.location.href = 'odeme.html?siparis=' + encodeURIComponent(p.get('siparis')); return; }
      if (!kod) { window.location.href = 'hesabim.html'; return; }
      YK.kupon.getir(kod).then(ciz, function (e) {
        kok.innerHTML = '<div class="yk-empty"><i class="fa-solid fa-ticket"></i><h4>Kupon bulunamadı</h4><p>' + esc(e.message) +
          '</p><a href="hesabim.html" class="yk-btn">Kuponlarıma dön</a></div>';
      });
    });

    function ciz(c) {
      var k = c.kampanya || {};
      var aktif = c.durum === 'aktif';
      var qr = '';
      try { qr = window.YKQR.svg(YK.kuponLinki(c.kod), { boyut: 220, etiket: 'Kupon QR kodu ' + c.kod }); } catch (e) { qr = ''; }
      document.title = c.kod + ' — ' + k.baslik + ' | Yakaladım';
      var harita = k.adres ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((k.isletme || '') + ' ' + k.adres) : '';

      kok.innerHTML = '' +
        (p.get('yeni') && aktif ? '<div class="yk-uyari yk-uyari-basari mb-25 yazdirma"><i class="fa-solid fa-circle-check"></i> <strong>Kuponun hazır!</strong> Mekanda bu sayfayı veya QR kodu göstermen yeterli. Kupon her zaman <a href="hesabim.html">Hesabım</a> sayfanda.</div>' : '') +
        '<div class="yk-voucher' + (aktif ? '' : ' pasif') + '">' +
          '<div class="yk-voucher-ust">' +
            '<div><span class="yk-voucher-isletme">' + esc(k.isletme || '') + '</span>' +
            '<h1 class="yk-voucher-baslik">' + esc(k.baslik) + '</h1>' +
            '<p class="mb-0" style="opacity:.85">' + esc([k.semt, U.sehirAdi(k.sehir)].filter(Boolean).join(', ')) + '</p></div>' +
            '<div class="yk-voucher-logo">yakala<span>dım</span></div>' +
          '</div>' +
          '<div class="yk-voucher-govde">' +
            '<div class="yk-voucher-qr">' + (aktif ? qr : '<div class="yk-voucher-damga">' + esc(YK.durumAdi(c.durum)) + '</div>') +
              '<div class="yk-voucher-kod" aria-label="Kupon kodu">' + esc(c.kod) + '</div>' +
              '<div class="mt-5">' + '<span class="yk-durum yk-durum-' + esc(c.durum) + '">' + esc(YK.durumAdi(c.durum)) + '</span></div>' +
            '</div>' +
            '<div class="yk-voucher-bilgi">' +
              '<div class="yk-voucher-tutar"><span>Mekanda ödenecek</span><strong>' + tl(c.toplam) + '</strong>' +
                '<small>' + c.adet + ' × ' + tl(c.birim_fiyat) + (k.eski_fiyat ? ' <s>' + tl(k.eski_fiyat) + '</s>' : '') + '</small>' +
                (c.kupon_bedeli > 0 ? '<small class="d-block mt-5"><i class="fa-solid fa-circle-check" style="color:#16a34a"></i> Kupon bedeli ' + tl(c.kupon_bedeli) +
                  (c.odeme_durumu === 'iade' ? ' iade edildi' : ' online ödendi') + '</small>' : '') + '</div>' +
              (c.rezervasyon_tarihi ? '<div class="yk-voucher-satir"><i class="fa-regular fa-calendar-check"></i><div><strong>Rezervasyon</strong><br>' + rezervasyonMetni(c) +
                (c.musteri_notu ? '<br><span class="yk-muted">Not: ' + esc(c.musteri_notu) + '</span>' : '') + '</div></div>' : '') +
              '<div class="yk-voucher-satir"><i class="fa-regular fa-clock"></i><div><strong>' +
                (c.durum === 'kullanildi' ? 'Kullanıldı' : 'Son kullanma') + '</strong><br>' +
                U.tarihSaat(c.durum === 'kullanildi' ? c.kullanim_zamani : c.son_kullanma) + '</div></div>' +
              (k.adres ? '<div class="yk-voucher-satir"><i class="fa-solid fa-location-dot"></i><div><strong>Adres</strong><br>' + esc(k.adres) +
                (harita ? ' <a class="yazdirma" href="' + harita + '" target="_blank" rel="noopener">Yol tarifi</a>' : '') + '</div></div>' : '') +
              (k.isletme_telefon ? '<div class="yk-voucher-satir"><i class="fa-solid fa-phone"></i><div><strong>İşletme</strong><br><a href="tel:' +
                esc(String(k.isletme_telefon).replace(/[^0-9+]/g, '')) + '">' + esc(k.isletme_telefon) + '</a></div></div>' : '') +
            '</div>' +
          '</div>' +
          '<div class="yk-voucher-alt">' +
            '<h5>Nasıl kullanılır?</h5>' +
            '<ol><li>' + (c.rezervasyon_tarihi ? 'Rezervasyon saatinde işletmede ol.' : 'İşletmeye git veya siparişini ver.') + '</li>' +
              '<li>Ödeme öncesinde bu kodu ya da QR’ı kasiyere göster.</li>' +
              '<li>İşletme kodu doğruladıktan sonra indirimli fiyatı öde.</li></ol>' +
            ((k.kosullar || []).length ? '<h5 class="mt-15">Koşullar</h5><ul>' + k.kosullar.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
          '</div>' +
        '</div>' +
        '<div class="d-flex gap-2 flex-wrap justify-content-center mt-25 yazdirma">' +
          '<button type="button" class="yk-btn-outline" onclick="window.print()"><i class="fa-solid fa-print"></i> Yazdır</button>' +
          '<a class="yk-btn-outline" href="kampanya.html?id=' + encodeURIComponent(k.id) + '"><i class="fa-solid fa-tag"></i> Kampanya sayfası</a>' +
          '<a class="yk-btn" href="hesabim.html"><i class="fa-solid fa-ticket"></i> Tüm kuponlarım</a>' +
          (aktif ? '<button type="button" class="yk-btn-outline" id="yk-kupon-iptal">Kuponu iptal et</button>' : '') +
        '</div>';

      var ib = document.getElementById('yk-kupon-iptal');
      if (ib) ib.addEventListener('click', function () {
        ikiAdimli(ib, c.odeme_durumu === 'odendi' ? 'Kupon bedeli iade edilmez. İptal et?' : 'Emin misin? İptal et', function () {
          ib.disabled = true;
          YK.kupon.iptal(c.id).then(function (y) { U.bildir('Kupon iptal edildi.', 'basari'); ciz(y); },
            function (e) { U.bildir(e.message, 'hata'); ib.disabled = false; });
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    girisSayfasi();
    hesabimSayfasi();
    kuponSayfasi();
  });
})();
