/* =====================================================================
   YAKALADIM — YÖNETİM PANELİ (yonetim.html, yalnızca rol = admin)
   Sekmeler: Özet · Kampanyalar · İşletmeler · Kuponlar · Üyeler · Başvurular
   ===================================================================== */
(function () {
  'use strict';
  var YK = window.YK, U = window.YKUI, esc = U.esc, tl = U.tl;
  var KAT = window.KATEGORILER || {}, SEHIR = window.SEHIRLER || {};
  var IZIN = { bekliyor: 'İzin bekleniyor', gorusuldu: 'Görüşüldü', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi' };
  var DURUM = { taslak: 'Taslak', yayinda: 'Yayında', durduruldu: 'Durduruldu' };
  var kok, isletmeOnbellek = null;

  function rozet(sinif, metin) { return '<span class="yk-durum yk-durum-' + esc(sinif) + '">' + esc(metin) + '</span>'; }
  function secenekler(nesne, secili, bos) {
    return (bos ? '<option value="">' + esc(bos) + '</option>' : '') + Object.keys(nesne).map(function (k) {
      var ad = typeof nesne[k] === 'string' ? nesne[k] : nesne[k].ad;
      return '<option value="' + esc(k) + '"' + (k === secili ? ' selected' : '') + '>' + esc(ad) + '</option>';
    }).join('');
  }
  function isletmeler(taze) {
    if (!isletmeOnbellek || taze) isletmeOnbellek = YK.yonetim.isletmeler();
    return isletmeOnbellek;
  }

  /* ---------- Basit pencere (modal) ---------- */
  function pencere(baslik, icerik) {
    var m = document.createElement('div');
    m.className = 'yk-modal';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="yk-modal-kutu"><div class="yk-modal-ust"><h4>' + esc(baslik) + '</h4>' +
      '<button type="button" class="yk-modal-kapat" aria-label="Kapat">&times;</button></div><div class="yk-modal-govde">' + icerik + '</div></div>';
    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';
    function kapat() { m.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', esc_); }
    function esc_(e) { if (e.key === 'Escape') kapat(); }
    m.querySelector('.yk-modal-kapat').addEventListener('click', kapat);
    m.addEventListener('click', function (e) { if (e.target === m) kapat(); });
    document.addEventListener('keydown', esc_);
    var ilk = m.querySelector('input, select, textarea');
    if (ilk) ilk.focus();
    return { el: m, kapat: kapat };
  }
  function formVeri(f) {
    var v = {};
    f.querySelectorAll('[name]').forEach(function (el) {
      v[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
    });
    return v;
  }

  /* ---------- Özet ---------- */
  function ozet(el) {
    U.yukleniyor(el);
    YK.yonetim.ozet().then(function (o) {
      var kutu = function (sayi, ad, ikon, sekme) {
        return '<button type="button" class="yk-ozet-kutu" data-git="' + (sekme || '') + '"><i class="fa-solid ' + ikon + '"></i><strong>' + sayi + '</strong><span>' + ad + '</span></button>';
      };
      el.innerHTML = '<div class="yk-ozet-izgara">' +
        kutu(o.kampanya_yayinda, 'Yayındaki kampanya', 'fa-bullhorn', 'kampanyalar') +
        kutu(o.kampanya_taslak, 'Taslak kampanya', 'fa-file-pen', 'kampanyalar') +
        kutu(o.isletme, 'İşletme', 'fa-store', 'isletmeler') +
        kutu(o.izin_bekleyen, 'İzin bekleyen işletme', 'fa-hourglass-half', 'isletmeler') +
        kutu(o.uye, 'Üye', 'fa-users', 'uyeler') +
        kutu(o.kupon_toplam, 'Alınan kupon', 'fa-ticket', 'kuponlar') +
        kutu(o.kupon_kullanildi, 'Kullanılan kupon', 'fa-check-double', 'kuponlar') +
        kutu(tl(o.ciro_kullanilan), 'Kuponla yapılan satış', 'fa-turkish-lira-sign', 'kuponlar') +
        kutu(o.basvuru_yeni, 'Yeni başvuru / mesaj', 'fa-envelope-open-text', 'basvurular') +
        kutu(tl(o.kupon_geliri || 0), 'Kupon geliri (online)', 'fa-sack-dollar', 'kuponlar') +
        kutu(o.odeme_bekleyen || 0, 'Ödemesi süren kupon', 'fa-credit-card', 'kuponlar') +
      '</div>' +
      (!o.odeme_aktif ? '<div class="yk-uyari mt-20"><i class="fa-solid fa-circle-info"></i> <strong>Kupon bedeli kapalı:</strong> şu an tüm kuponlar ücretsiz. ' +
        'Ödeme sağlayıcısı bağlandıktan sonra <a href="#" data-git-link="ayarlar">Ayarlar</a> sekmesinden açabilirsiniz.</div>' : '') +
      (o.izin_bekleyen ? '<div class="yk-uyari mt-20"><i class="fa-solid fa-circle-info"></i> <strong>' + o.izin_bekleyen +
        ' işletmeden yayın izni bekleniyor.</strong> Bu işletmelerin kampanyaları, izin "Onaylandı" yapılana kadar sitede görünmez ve kupon alınamaz.</div>' : '');
      el.querySelectorAll('[data-git]').forEach(function (b) {
        b.addEventListener('click', function () { if (b.getAttribute('data-git')) sekmeAc(b.getAttribute('data-git')); });
      });
      el.querySelectorAll('[data-git-link]').forEach(function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); sekmeAc(a.getAttribute('data-git-link')); });
      });
    }, function (e) { U.hataKutusu(el, e, function () { ozet(el); }); });
  }

  /* ---------- Kampanyalar ---------- */
  function kampanyalar(el) {
    var liste = [], filtre = { durum: '', izin: '', ara: '' };
    function ciz() {
      var l = liste.filter(function (k) {
        if (filtre.durum && k.durum !== filtre.durum) return false;
        if (filtre.izin && k.izin_durumu !== filtre.izin) return false;
        if (filtre.ara && (k.baslik + ' ' + (k.isletme || '') + ' ' + k.id).toLocaleLowerCase('tr-TR').indexOf(filtre.ara) === -1) return false;
        return true;
      });
      el.querySelector('#yk-k-tablo').innerHTML = l.length ? '<div class="yk-tablo-sar"><table class="yk-tablo"><thead><tr>' +
        '<th>Kampanya</th><th>İşletme / izin</th><th>Fiyat</th><th>Bitiş</th><th>Kupon</th><th>Durum</th><th></th></tr></thead><tbody>' +
        l.map(function (k) {
          var bitti = k.bitis < YK.bugun();
          return '<tr><td><strong>' + esc(k.baslik) + '</strong><br><span class="yk-muted" style="font-size:12px">' + esc(k.id) + ' · ' + esc(U.kategoriAdi(k.kategori)) +
              (k.kaynak && k.kaynak !== 'manuel' ? ' · kaynak: ' + esc(k.kaynak) : '') + '</span></td>' +
            '<td>' + esc(k.isletme || '—') + '<br>' + (k.izin_durumu ? rozet('izin-' + k.izin_durumu, IZIN[k.izin_durumu]) : '') + '</td>' +
            '<td>' + tl(k.yeni_fiyat) + (k.eski_fiyat ? '<br><s class="yk-muted">' + tl(k.eski_fiyat) + '</s>' : '') +
              '<br><span class="yk-muted" style="font-size:12px">Kupon: ' + (Number(k.hesaplanan_bedel) ? tl(k.hesaplanan_bedel) : 'ücretsiz') +
              (k.kupon_bedeli !== null && k.kupon_bedeli !== undefined ? ' (özel)' : '') + '</span></td>' +
            '<td>' + U.tarih(k.bitis, { day: 'numeric', month: 'short', year: 'numeric' }) + (bitti ? '<br>' + rozet('suresi_doldu', 'Bitti') : '') + '</td>' +
            '<td>' + (k.satilan || 0) + (k.stok !== null && k.stok !== undefined ? ' / ' + k.stok : '') + '<br><span class="yk-muted" style="font-size:12px">' + (k.kullanilan || 0) + ' kullanıldı' +
              (Number(k.kupon_geliri) ? ' · ' + tl(k.kupon_geliri) + ' gelir' : '') + '</span></td>' +
            '<td>' + rozet(k.durum, DURUM[k.durum]) + '</td>' +
            '<td class="text-end" style="white-space:nowrap">' +
              (k.durum !== 'yayinda' ? '<button type="button" class="yk-mini-btn" data-durum="yayinda" data-id="' + esc(k.id) + '">Yayına al</button>' :
                '<button type="button" class="yk-mini-btn" data-durum="durduruldu" data-id="' + esc(k.id) + '">Durdur</button>') +
              ' <button type="button" class="yk-mini-btn" data-duzenle="' + esc(k.id) + '">Düzenle</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="yk-empty">Kampanya yok.</div>';
      el.querySelectorAll('[data-durum]').forEach(function (b) {
        b.addEventListener('click', function () {
          b.disabled = true;
          YK.yonetim.kampanyaDurum(b.getAttribute('data-id'), b.getAttribute('data-durum')).then(function () {
            U.bildir('Kampanya durumu güncellendi.', 'basari'); yukle();
          }, function (e) { U.bildir(e.message, 'hata'); b.disabled = false; });
        });
      });
      el.querySelectorAll('[data-duzenle]').forEach(function (b) {
        b.addEventListener('click', function () {
          kampanyaFormu(liste.filter(function (k) { return k.id === b.getAttribute('data-duzenle'); })[0], yukle);
        });
      });
    }
    function yukle() {
      U.yukleniyor(el.querySelector('#yk-k-tablo'));
      YK.yonetim.kampanyalar().then(function (l) { liste = l || []; ciz(); },
        function (e) { U.hataKutusu(el.querySelector('#yk-k-tablo'), e, yukle); });
    }
    el.innerHTML = '<div class="yk-arac-cubugu">' +
      '<input class="yk-input" id="yk-k-ara" placeholder="Kampanya, işletme veya kimlik ara">' +
      '<select class="yk-select" id="yk-k-durum">' + secenekler(DURUM, '', 'Tüm durumlar') + '</select>' +
      '<select class="yk-select" id="yk-k-izin">' + secenekler(IZIN, '', 'Tüm izin durumları') + '</select>' +
      '<button type="button" class="yk-btn" id="yk-k-yeni"><i class="fa-solid fa-plus"></i> Yeni kampanya</button></div>' +
      '<div id="yk-k-tablo"></div>';
    el.querySelector('#yk-k-ara').addEventListener('input', function (e) { filtre.ara = e.target.value.trim().toLocaleLowerCase('tr-TR'); ciz(); });
    el.querySelector('#yk-k-durum').addEventListener('change', function (e) { filtre.durum = e.target.value; ciz(); });
    el.querySelector('#yk-k-izin').addEventListener('change', function (e) { filtre.izin = e.target.value; ciz(); });
    el.querySelector('#yk-k-yeni').addEventListener('click', function () { kampanyaFormu(null, yukle); });
    yukle();
  }

  function kampanyaFormu(k, sonra) {
    var yeni = !k;
    k = k || { durum: 'taslak', kisi_basi_limit: 5, kupon_gecerlilik_gun: 30, odeme_tipi: 'mekanda', kosullar: [], kategori: 'restoran', sehir: 'istanbul' };
    isletmeler().then(function (isl) {
      var islSec = '<option value="">— İşletme seçin —</option>' + isl.map(function (i) {
        return '<option value="' + esc(i.id) + '"' + (i.id === k.isletme_id ? ' selected' : '') + '>' + esc(i.ad) + ' (' + esc(IZIN[i.izin_durumu] || '') + ')</option>';
      }).join('');
      var g = function (ad) { return k[ad] === null || k[ad] === undefined ? '' : esc(k[ad]); };
      var p = pencere(yeni ? 'Yeni kampanya' : 'Kampanyayı düzenle', '' +
        '<form id="yk-kf" novalidate><div class="row g-3">' +
          '<div class="col-md-8"><label>Başlık *</label><input class="yk-input" name="baslik" value="' + g('baslik') + '" required maxlength="140"></div>' +
          '<div class="col-md-4"><label>Kimlik (URL) *</label><input class="yk-input" name="id" value="' + g('id') + '"' + (yeni ? '' : ' readonly') +
            ' placeholder="ornek-kampanya" pattern="[a-z0-9][a-z0-9-]+"></div>' +
          '<div class="col-md-6"><label>İşletme *</label><select class="yk-select" name="isletme_id">' + islSec + '</select></div>' +
          '<div class="col-md-3"><label>Kategori</label><select class="yk-select" name="kategori">' + secenekler(KAT, k.kategori) + '</select></div>' +
          '<div class="col-md-3"><label>Durum</label><select class="yk-select" name="durum">' + secenekler(DURUM, k.durum) + '</select></div>' +
          '<div class="col-md-3"><label>Şehir</label><select class="yk-select" name="sehir">' + secenekler(SEHIR, k.sehir) + '</select></div>' +
          '<div class="col-md-3"><label>Semt</label><input class="yk-input" name="semt" value="' + g('semt') + '"></div>' +
          '<div class="col-md-6"><label>Adres (boşsa işletme adresi)</label><input class="yk-input" name="adres" value="' + g('adres') + '"></div>' +
          '<div class="col-md-3"><label>Normal fiyat (TL)</label><input class="yk-input" type="number" step="0.01" min="0" name="eski_fiyat" value="' + g('eski_fiyat') + '"></div>' +
          '<div class="col-md-3"><label>İndirimli fiyat (TL) *</label><input class="yk-input" type="number" step="0.01" min="0" name="yeni_fiyat" value="' + g('yeni_fiyat') + '" required></div>' +
          '<div class="col-md-3"><label>Başlangıç</label><input class="yk-input" type="date" name="baslangic" value="' + g('baslangic') + '"></div>' +
          '<div class="col-md-3"><label>Bitiş *</label><input class="yk-input" type="date" name="bitis" value="' + g('bitis') + '" required></div>' +
          '<div class="col-md-3"><label>Toplam kupon (boş = sınırsız)</label><input class="yk-input" type="number" min="0" name="stok" value="' + g('stok') + '"></div>' +
          '<div class="col-md-3"><label>Kişi başı en fazla</label><input class="yk-input" type="number" min="1" max="50" name="kisi_basi_limit" value="' + g('kisi_basi_limit') + '"></div>' +
          '<div class="col-md-3"><label>Kupon geçerliliği (gün)</label><input class="yk-input" type="number" min="1" max="365" name="kupon_gecerlilik_gun" value="' + g('kupon_gecerlilik_gun') + '"></div>' +
          '<div class="col-md-3"><label>Kupon bedeli (TL / adet)</label><input class="yk-input" type="number" step="0.01" min="0" name="kupon_bedeli" value="' + g('kupon_bedeli') +
            '" placeholder="Boş = genel kural"><small class="yk-muted">0 yazarsanız kupon ücretsiz olur.</small></div>' +
          '<div class="col-12 d-flex gap-4 flex-wrap">' +
            '<label class="yk-check"><input type="checkbox" name="rezervasyon_gerekli"' + (k.rezervasyon_gerekli ? ' checked' : '') + '> Rezervasyon gerekli (tarih/saat/kişi sorulur)</label>' +
            '<label class="yk-check"><input type="checkbox" name="one_cikan"' + (k.one_cikan ? ' checked' : '') + '> Ana sayfada öne çıkar</label></div>' +
          '<div class="col-12"><label>Kısa açıklama (kartta)</label><input class="yk-input" name="kisa" maxlength="140" value="' + g('kisa') + '"></div>' +
          '<div class="col-12"><label>Detaylı açıklama</label><textarea class="yk-textarea" rows="3" name="aciklama">' + g('aciklama') + '</textarea></div>' +
          '<div class="col-12"><label>Koşullar (her satıra bir madde)</label><textarea class="yk-textarea" rows="3" name="kosullar">' + esc((k.kosullar || []).join('\n')) + '</textarea></div>' +
          '<div class="col-md-8"><label>Görsel adresi (URL)</label><input class="yk-input" name="gorsel" value="' + g('gorsel') + '" placeholder="https://..."></div>' +
          '<div class="col-md-4"><label>İşletme web linki</label><input class="yk-input" name="link" value="' + g('link') + '"></div>' +
          '<div class="col-12"><label>Ek fotoğraflar (her satıra bir adres)</label><textarea class="yk-textarea" rows="2" name="galeri">' + esc((k.galeri || []).join('\n')) + '</textarea></div>' +
          '<div class="col-12"><div class="yk-form-hata" id="yk-kf-hata"></div>' +
            '<button type="submit" class="yk-btn">Kaydet</button> <span class="yk-muted" style="font-size:13px">Kampanya, işletmenin izin durumu "Onaylandı" ve kendi durumu "Yayında" ise sitede görünür.</span></div>' +
        '</div></form>');
      var f = p.el.querySelector('#yk-kf');
      if (yeni) {
        f.querySelector('[name=baslik]').addEventListener('input', function (e) {
          var idEl = f.querySelector('[name=id]');
          if (!idEl.dataset.elle) idEl.value = e.target.value.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
            .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
        });
        f.querySelector('[name=id]').addEventListener('input', function (e) { e.target.dataset.elle = '1'; });
      }
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = formVeri(f), hata = f.querySelector('#yk-kf-hata');
        v.odeme_tipi = 'mekanda';
        v.kosullar = String(v.kosullar || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        v.galeri = String(v.galeri || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!v.isletme_id) { hata.textContent = 'Lütfen bir işletme seçin.'; return; }
        if (!v.baslik || !v.id || !v.yeni_fiyat || !v.bitis) { hata.textContent = 'Yıldızlı alanlar zorunludur.'; return; }
        var b = f.querySelector('[type=submit]'); b.disabled = true;
        YK.yonetim.kampanyaKaydet(v).then(function () {
          p.kapat(); U.bildir('Kampanya kaydedildi.', 'basari'); sonra();
        }, function (er) { hata.textContent = er.message; b.disabled = false; });
      });
    });
  }

  /* ---------- İşletmeler ---------- */
  function isletmeSekmesi(el) {
    var liste = [], filtre = { izin: '', ara: '' };
    function ciz() {
      var l = liste.filter(function (i) {
        if (filtre.izin && i.izin_durumu !== filtre.izin) return false;
        if (filtre.ara && (i.ad + ' ' + (i.semt || '') + ' ' + (i.telefon || '')).toLocaleLowerCase('tr-TR').indexOf(filtre.ara) === -1) return false;
        return true;
      });
      el.querySelector('#yk-i-tablo').innerHTML = l.length ? '<div class="yk-tablo-sar"><table class="yk-tablo"><thead><tr>' +
        '<th>İşletme</th><th>İzin</th><th>Telefon</th><th>Konum</th><th>Kampanya / kullanıcı</th><th>Kaynak</th><th></th></tr></thead><tbody>' +
        l.map(function (i) {
          return '<tr><td><strong>' + esc(i.ad) + '</strong>' + (i.aktif === false ? ' ' + rozet('iptal', 'Pasif') : '') +
              (i.notlar ? '<br><span class="yk-muted" style="font-size:12px">' + esc(String(i.notlar).slice(0, 90)) + '</span>' : '') + '</td>' +
            '<td>' + rozet('izin-' + i.izin_durumu, IZIN[i.izin_durumu] || i.izin_durumu) + '</td>' +
            '<td style="white-space:nowrap">' + (i.telefon ? '<a href="tel:' + esc(String(i.telefon).replace(/[^0-9+]/g, '')) + '">' + esc(i.telefon) + '</a>' : '<span class="yk-muted">—</span>') + '</td>' +
            '<td>' + esc([i.semt, U.sehirAdi(i.sehir)].filter(Boolean).join(', ')) + '</td>' +
            '<td>' + (i.kampanya_sayisi || 0) + ' / ' + (i.kullanici_sayisi || 0) + '</td>' +
            '<td>' + esc(i.kaynak || '') + (i.kaynak_url ? ' <a href="' + esc(i.kaynak_url) + '" target="_blank" rel="noopener noreferrer" title="Kaynak sayfa"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>' : '') + '</td>' +
            '<td class="text-end"><button type="button" class="yk-mini-btn" data-duzenle="' + esc(i.id) + '">Düzenle</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="yk-empty">İşletme yok.</div>';
      el.querySelectorAll('[data-duzenle]').forEach(function (b) {
        b.addEventListener('click', function () {
          isletmeFormu(liste.filter(function (i) { return i.id === b.getAttribute('data-duzenle'); })[0], yukle);
        });
      });
    }
    function yukle() {
      U.yukleniyor(el.querySelector('#yk-i-tablo'));
      isletmeler(true).then(function (l) { liste = l || []; ciz(); },
        function (e) { U.hataKutusu(el.querySelector('#yk-i-tablo'), e, yukle); });
    }
    el.innerHTML = '<div class="yk-arac-cubugu">' +
      '<input class="yk-input" id="yk-i-ara" placeholder="İşletme, semt veya telefon ara">' +
      '<select class="yk-select" id="yk-i-izin">' + secenekler(IZIN, '', 'Tüm izin durumları') + '</select>' +
      '<button type="button" class="yk-btn" id="yk-i-yeni"><i class="fa-solid fa-plus"></i> Yeni işletme</button></div>' +
      '<div id="yk-i-tablo"></div>';
    el.querySelector('#yk-i-ara').addEventListener('input', function (e) { filtre.ara = e.target.value.trim().toLocaleLowerCase('tr-TR'); ciz(); });
    el.querySelector('#yk-i-izin').addEventListener('change', function (e) { filtre.izin = e.target.value; ciz(); });
    el.querySelector('#yk-i-yeni').addEventListener('click', function () { isletmeFormu(null, yukle); });
    yukle();
  }

  function isletmeFormu(i, sonra) {
    var yeni = !i;
    i = i || { izin_durumu: 'onaylandi', aktif: true, sehir: 'istanbul', kategori: 'restoran' };
    var g = function (ad) { return i[ad] === null || i[ad] === undefined ? '' : esc(i[ad]); };
    var p = pencere(yeni ? 'Yeni işletme' : 'İşletmeyi düzenle', '' +
      '<form id="yk-if" novalidate><div class="row g-3">' +
        '<div class="col-md-8"><label>İşletme adı *</label><input class="yk-input" name="ad" value="' + g('ad') + '" required></div>' +
        '<div class="col-md-4"><label>Yayın izni</label><select class="yk-select" name="izin_durumu">' + secenekler(IZIN, i.izin_durumu) + '</select></div>' +
        '<div class="col-md-4"><label>Kategori</label><select class="yk-select" name="kategori">' + secenekler(KAT, i.kategori) + '</select></div>' +
        '<div class="col-md-4"><label>Şehir</label><select class="yk-select" name="sehir">' + secenekler(SEHIR, i.sehir) + '</select></div>' +
        '<div class="col-md-4"><label>Semt</label><input class="yk-input" name="semt" value="' + g('semt') + '"></div>' +
        '<div class="col-12"><label>Adres</label><input class="yk-input" name="adres" value="' + g('adres') + '"></div>' +
        '<div class="col-md-4"><label>Telefon</label><input class="yk-input" name="telefon" value="' + g('telefon') + '"></div>' +
        '<div class="col-md-4"><label>E-posta</label><input class="yk-input" type="email" name="eposta" value="' + g('eposta') + '"></div>' +
        '<div class="col-md-4"><label>Web / Instagram</label><input class="yk-input" name="web" value="' + g('web') + '"></div>' +
        '<div class="col-md-6"><label>Görüşülen kişi (iç not)</label><input class="yk-input" name="yetkili" value="' + g('yetkili') + '"></div>' +
        '<div class="col-md-6 d-flex align-items-end"><label class="yk-check"><input type="checkbox" name="aktif"' + (i.aktif !== false ? ' checked' : '') + '> İşletme aktif</label></div>' +
        '<div class="col-12"><label>Notlar (yalnızca yöneticiler görür)</label><textarea class="yk-textarea" rows="3" name="notlar">' + g('notlar') + '</textarea></div>' +
        '<input type="hidden" name="id" value="' + g('id') + '">' +
        '<div class="col-12"><div class="yk-form-hata" id="yk-if-hata"></div><button type="submit" class="yk-btn">Kaydet</button></div>' +
      '</div></form>');
    var f = p.el.querySelector('#yk-if');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = formVeri(f), hata = f.querySelector('#yk-if-hata');
      if (!v.ad) { hata.textContent = 'İşletme adı zorunludur.'; return; }
      var b = f.querySelector('[type=submit]'); b.disabled = true;
      YK.yonetim.isletmeKaydet(v).then(function () {
        p.kapat(); U.bildir('İşletme kaydedildi.', 'basari'); isletmeOnbellek = null; sonra();
      }, function (er) { hata.textContent = er.message; b.disabled = false; });
    });
  }

  /* ---------- Kuponlar ---------- */
  function kuponlar(el) {
    U.yukleniyor(el);
    YK.yonetim.kuponlar().then(function (l) {
      l = l || [];
      el.innerHTML = l.length ? '<div class="yk-tablo-sar"><table class="yk-tablo"><thead><tr>' +
        '<th>Kod</th><th>Kampanya</th><th>Müşteri</th><th>Adet / tutar</th><th>Kupon bedeli</th><th>Rezervasyon</th><th>Alınma</th><th>Durum</th></tr></thead><tbody>' +
        l.map(function (c) {
          var odeme = Number(c.kupon_bedeli) ? tl(c.kupon_bedeli) + '<br>' + rozet('odeme-' + c.odeme_durumu,
              { odendi: 'Ödendi', bekliyor: 'Bekliyor', basarisiz: 'Başarısız', iade: 'İade edildi', yok: '-' }[c.odeme_durumu] || c.odeme_durumu) +
              (c.odeme_durumu === 'odendi' ? ' <button type="button" class="yk-mini-btn" data-iade="' + esc(c.id) + '" data-kod="' + esc(c.kod) + '">İade</button>' : '')
            : '<span class="yk-muted">Ücretsiz</span>';
          return '<tr><td><code>' + esc(c.kod || '—') + '</code></td><td>' + esc((c.kampanya || {}).baslik) + '<br><span class="yk-muted" style="font-size:12px">' + esc((c.kampanya || {}).isletme || '') + '</span></td>' +
            '<td>' + esc((c.musteri || {}).ad_soyad || '') + '<br><span class="yk-muted" style="font-size:12px">' + esc(c.musteri_eposta || '') + '</span></td>' +
            '<td>' + c.adet + ' · ' + tl(c.toplam) + '</td><td>' + odeme + '</td>' +
            '<td>' + (c.rezervasyon_tarihi ? U.tarih(c.rezervasyon_tarihi, { day: 'numeric', month: 'short' }) + ' ' + esc(c.rezervasyon_saati || '') : '—') + '</td>' +
            '<td>' + U.tarihSaat(c.olusturma) + '</td><td>' + rozet(c.durum, YK.durumAdi(c.durum)) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="yk-empty">Henüz kupon alınmadı.</div>';
      el.querySelectorAll('[data-iade]').forEach(function (b) {
        b.addEventListener('click', function () {
          var pn = pencere('Kupon bedeli iadesi — ' + b.getAttribute('data-kod'),
            '<form id="yk-iade-f"><p class="yk-muted">Bu işlem kuponu iptal eder ve bedeli "iade edildi" olarak işaretler. ' +
            '<strong>Paranın kendisini ödeme kuruluşunun (PayTR) panelinden ayrıca iade etmelisiniz.</strong></p>' +
            '<label>İade nedeni</label><textarea class="yk-textarea mb-15" rows="3" name="not" placeholder="Örn. işletme kampanyayı uygulamadı"></textarea>' +
            '<div class="yk-form-hata" id="yk-iade-hata"></div><button type="submit" class="yk-btn">İadeyi kaydet</button></form>');
          pn.el.querySelector('#yk-iade-f').addEventListener('submit', function (e) {
            e.preventDefault();
            YK.yonetim.kuponIade(b.getAttribute('data-iade'), pn.el.querySelector('[name=not]').value).then(function () {
              pn.kapat(); U.bildir('İade kaydedildi.', 'basari'); kuponlar(el);
            }, function (er) { pn.el.querySelector('#yk-iade-hata').textContent = er.message; });
          });
        });
      });
    }, function (e) { U.hataKutusu(el, e, function () { kuponlar(el); }); });
  }

  /* ---------- Üyeler ---------- */
  function uyeler(el) {
    el.innerHTML = '<div class="yk-arac-cubugu"><input class="yk-input" id="yk-u-ara" placeholder="E-posta veya ad ile ara"></div><div id="yk-u-tablo"></div>' +
      '<p class="yk-muted mt-15" style="font-size:13px">Bir işletmenin kasiyerine panel erişimi vermek için: kişi önce siteye üye olur, sonra burada rolünü "İşletme" yapıp işletmesini seçersiniz.</p>';
    var zaman = null;
    function yukle(arama) {
      var t = el.querySelector('#yk-u-tablo');
      U.yukleniyor(t);
      Promise.all([YK.yonetim.kullanicilar(arama), isletmeler()]).then(function (r) {
        var l = r[0] || [], isl = r[1] || [];
        t.innerHTML = l.length ? '<div class="yk-tablo-sar"><table class="yk-tablo"><thead><tr><th>Üye</th><th>Telefon</th><th>Kupon</th><th>Kayıt</th><th>Rol ve işletme</th></tr></thead><tbody>' +
          l.map(function (u) {
            return '<tr data-uid="' + esc(u.id) + '"><td><strong>' + esc(u.ad_soyad || '—') + '</strong><br><span class="yk-muted" style="font-size:12px">' + esc(u.eposta || '') + '</span></td>' +
              '<td>' + esc(u.telefon || '') + '</td><td>' + (u.kupon_sayisi || 0) + '</td><td>' + U.tarih(u.olusturma, { day: 'numeric', month: 'short', year: 'numeric' }) + '</td>' +
              '<td><div class="d-flex gap-2 flex-wrap"><select class="yk-select yk-kucuk" data-rol>' + secenekler({ musteri: 'Müşteri', isletme: 'İşletme', admin: 'Yönetici' }, u.rol) + '</select>' +
              '<select class="yk-select yk-kucuk" data-isl><option value="">— işletme —</option>' + isl.map(function (i) {
                return '<option value="' + esc(i.id) + '"' + (i.id === u.isletme_id ? ' selected' : '') + '>' + esc(i.ad) + '</option>';
              }).join('') + '</select><button type="button" class="yk-mini-btn" data-kaydet>Kaydet</button></div></td></tr>';
          }).join('') + '</tbody></table></div>' : '<div class="yk-empty">Üye bulunamadı.</div>';
        t.querySelectorAll('[data-kaydet]').forEach(function (b) {
          b.addEventListener('click', function () {
            var tr = b.closest('tr');
            b.disabled = true;
            YK.yonetim.kullaniciRol(tr.getAttribute('data-uid'), tr.querySelector('[data-rol]').value, tr.querySelector('[data-isl]').value)
              .then(function () { U.bildir('Üye rolü güncellendi.', 'basari'); }, function (e) { U.bildir(e.message, 'hata'); })
              .then(function () { b.disabled = false; });
          });
        });
      }, function (e) { U.hataKutusu(t, e, function () { yukle(arama); }); });
    }
    el.querySelector('#yk-u-ara').addEventListener('input', function (e) {
      clearTimeout(zaman); var v = e.target.value.trim();
      zaman = setTimeout(function () { yukle(v); }, 350);
    });
    yukle('');
  }

  /* ---------- Başvurular ---------- */
  function basvurular(el) {
    U.yukleniyor(el);
    var TIP = { genel: 'İletişim', isletme: 'İşletme başvurusu', bulten: 'Bülten' };
    var ALAN = { ad: 'Ad', eposta: 'E-posta', konu: 'Konu', mesaj: 'Mesaj', isletme: 'İşletme', yetkili: 'Yetkili', telefon: 'Telefon',
      kategori: 'Kategori', sehir: 'Şehir/semt', eskiFiyat: 'Normal fiyat', yeniFiyat: 'Kampanyalı fiyat', bitis: 'Bitiş', detay: 'Detay' };
    YK.yonetim.basvurular().then(function (l) {
      l = l || [];
      el.innerHTML = l.length ? l.map(function (b) {
        var v = b.veri || {};
        return '<div class="yk-basvuru' + (b.durum === 'yeni' ? ' yeni' : '') + '">' +
          '<div class="d-flex justify-content-between flex-wrap gap-2 mb-10"><div>' + rozet(b.tip === 'isletme' ? 'aktif' : 'kullanildi', TIP[b.tip] || b.tip) +
            ' <span class="yk-muted" style="font-size:13px">' + U.tarihSaat(b.olusturma) + '</span></div>' +
            '<select class="yk-select yk-kucuk" data-bid="' + esc(b.id) + '">' + secenekler({ yeni: 'Yeni', okundu: 'Okundu', tamamlandi: 'Tamamlandı' }, b.durum) + '</select></div>' +
          '<dl class="yk-dl">' + Object.keys(v).map(function (a) {
            return '<dt>' + esc(ALAN[a] || a) + '</dt><dd>' + esc(v[a]) + '</dd>';
          }).join('') + '</dl></div>';
      }).join('') : '<div class="yk-empty">Henüz başvuru veya mesaj yok.</div>';
      el.querySelectorAll('[data-bid]').forEach(function (s) {
        s.addEventListener('change', function () {
          YK.yonetim.basvuruDurum(s.getAttribute('data-bid'), s.value).then(function () { U.bildir('Güncellendi.', 'basari'); },
            function (e) { U.bildir(e.message, 'hata'); });
        });
      });
    }, function (e) { U.hataKutusu(el, e, function () { basvurular(el); }); });
  }

  /* ---------- Ayarlar: kupon bedeli ---------- */
  function ayarlar(el) {
    U.yukleniyor(el);
    YK.yonetim.ayarlar().then(function (a) {
      el.innerHTML = '<form class="yk-form-card" id="yk-ayar-f" style="max-width:760px">' +
        '<h4 class="mb-5">Kupon bedeli</h4>' +
        '<p class="yk-muted">Müşteri kuponu alırken bu bedeli online öder; ürünün indirimli fiyatını mekanda öder. Kampanya bazında farklı bir bedel, kampanya düzenleme ekranından verilebilir.</p>' +
        '<label class="yk-check mb-20"><input type="checkbox" name="odeme_aktif"' + (a.odeme_aktif ? ' checked' : '') + '>' +
          '<span><strong>Kupon bedeli alınsın</strong> — kapalıyken tüm kuponlar ücretsizdir. Açmadan önce ödeme sağlayıcısı (PayTR) bağlantısının yapıldığından emin olun.</span></label>' +
        '<div class="row g-3">' +
          '<div class="col-sm-3"><label>Oran (%)</label><input class="yk-input" type="number" step="0.1" min="0" max="100" name="oran" value="' + (Number(a.bedel_oran) * 100) + '"></div>' +
          '<div class="col-sm-3"><label>En az (TL)</label><input class="yk-input" type="number" step="1" min="0" name="bedel_min" value="' + Number(a.bedel_min) + '"></div>' +
          '<div class="col-sm-3"><label>En fazla (TL)</label><input class="yk-input" type="number" step="1" min="0" name="bedel_max" value="' + Number(a.bedel_max) + '"></div>' +
          '<div class="col-sm-3"><label>Ödeme süresi (dk)</label><input class="yk-input" type="number" step="1" min="5" max="120" name="odeme_suresi_dk" value="' + a.odeme_suresi_dk + '"></div>' +
        '</div>' +
        '<div class="yk-ornek-bedel mt-20" id="yk-ornek-bedel"></div>' +
        '<button type="submit" class="yk-btn mt-20">Kaydet</button></form>';
      var f = el.querySelector('#yk-ayar-f');
      function ornek() {
        var v = formVeri(f), o = Number(v.oran) / 100, mn = Number(v.bedel_min), mx = Number(v.bedel_max);
        el.querySelector('#yk-ornek-bedel').innerHTML = '<strong>Örnek:</strong> ' + [300, 1000, 2500, 9000].map(function (fy) {
          var b = v.odeme_aktif ? Math.min(mx, Math.max(mn, Math.round(fy * o))) : 0;
          return tl(fy) + ' ürün → <strong>' + (b ? tl(b) : 'ücretsiz') + '</strong>';
        }).join(' · ');
      }
      f.addEventListener('input', ornek);
      ornek();
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = formVeri(f), btn = f.querySelector('[type=submit]');
        if (Number(v.bedel_min) > Number(v.bedel_max)) { U.bildir('En az bedel, en fazla bedelden büyük olamaz.', 'hata'); return; }
        btn.disabled = true;
        YK.yonetim.ayarKaydet({ odeme_aktif: v.odeme_aktif, bedel_oran: Number(v.oran) / 100, bedel_min: v.bedel_min,
          bedel_max: v.bedel_max, odeme_suresi_dk: v.odeme_suresi_dk })
          .then(function () { U.bildir('Ayarlar kaydedildi.', 'basari'); }, function (er) { U.bildir(er.message, 'hata'); })
          .then(function () { btn.disabled = false; });
      });
    }, function (e) { U.hataKutusu(el, e, function () { ayarlar(el); }); });
  }

  /* ---------- Sekmeler ---------- */
  var SEKMELER = {
    ozet: ['Özet', 'fa-gauge', ozet], kampanyalar: ['Kampanyalar', 'fa-bullhorn', kampanyalar],
    isletmeler: ['İşletmeler', 'fa-store', isletmeSekmesi], kuponlar: ['Kuponlar', 'fa-ticket', kuponlar],
    uyeler: ['Üyeler', 'fa-users', uyeler], basvurular: ['Başvurular', 'fa-envelope-open-text', basvurular],
    ayarlar: ['Ayarlar', 'fa-sliders', ayarlar]
  };
  function sekmeAc(ad) {
    if (!SEKMELER[ad]) ad = 'ozet';
    kok.querySelectorAll('[data-sekme]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-sekme') === ad); });
    var icerik = kok.querySelector('#yk-y-icerik');
    SEKMELER[ad][2](icerik);
    try { history.replaceState(null, '', 'yonetim.html?sekme=' + ad); } catch (e) { /* önizleme */ }
  }

  document.addEventListener('DOMContentLoaded', function () {
    kok = document.getElementById('yk-yonetim');
    if (!kok) return;
    YK.hazir.then(function () {
      var k = YK.kullanici;
      if (!k) { window.location.href = 'giris.html?donus=yonetim.html'; return; }
      if (k.rol !== 'admin') {
        kok.innerHTML = '<div class="yk-empty"><i class="fa-solid fa-lock"></i><h4>Bu sayfa yalnızca yöneticiler içindir</h4><a class="yk-btn" href="hesabim.html">Hesabıma dön</a></div>';
        return;
      }
      kok.innerHTML = '<div class="yk-tabs">' + Object.keys(SEKMELER).map(function (a) {
        return '<button type="button" class="yk-pill" data-sekme="' + a + '"><i class="fa-solid ' + SEKMELER[a][1] + '"></i> ' + SEKMELER[a][0] + '</button>';
      }).join('') + (YK.mod === 'demo' ? '<button type="button" class="yk-pill" id="yk-demo-sifirla" title="Demo verisini başa al"><i class="fa-solid fa-rotate"></i> Demoyu sıfırla</button>' : '') +
        '</div><div id="yk-y-icerik"></div>';
      kok.querySelectorAll('[data-sekme]').forEach(function (b) {
        b.addEventListener('click', function () { sekmeAc(b.getAttribute('data-sekme')); });
      });
      var ds = document.getElementById('yk-demo-sifirla');
      if (ds) ds.addEventListener('click', function () {
        if (ds.dataset.onay) { YK.demoSifirla(); window.location.href = 'giris.html'; return; }
        ds.dataset.onay = '1'; ds.innerHTML = 'Tüm demo verisi silinsin mi? Onayla';
      });
      sekmeAc(U.params().get('sekme') || 'ozet');
    });
  });
})();
