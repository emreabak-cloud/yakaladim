/* =====================================================================
   YAKALADIM.COM — SAYFA MOTORU
   Kampanyaları window.YK (assets/js/yk-api.js) üzerinden alır; kartları,
   filtreleri, detay sayfasını ve kupon alma akışını oluşturur.
   Diğer sayfa dosyaları (yk-uyelik.js, yk-isletme.js, yk-yonetim.js)
   buradaki window.YKUI yardımcılarını kullanır.
   ===================================================================== */
(function () {
  'use strict';

  var YK = window.YK;
  var KAT = window.KATEGORILER || {};
  var SEHIR = window.SEHIRLER || {};
  var GUN_MS = 24 * 60 * 60 * 1000;
  var DATA = [];

  /* ---------- Yardımcılar ---------- */
  function tl(n) {
    return Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' TL';
  }
  function indirim(k) {
    if (!k.eskiFiyat || k.eskiFiyat <= k.yeniFiyat) return 0;
    return Math.round((1 - k.yeniFiyat / k.eskiFiyat) * 100);
  }
  function bitisTarihi(k) { return new Date(k.bitis + 'T23:59:59+03:00'); }
  function kalanGun(k) { return Math.ceil((bitisTarihi(k) - new Date()) / GUN_MS); }
  function aktif(k) { return bitisTarihi(k) >= new Date(); }
  function kalanMetin(k) {
    var g = kalanGun(k);
    if (g <= 1) return 'Bugün son gün';
    if (g === 2) return 'Yarın bitiyor';
    if (g <= 7) return 'Son ' + g + ' gün';
    return tarih(k.bitis, { day: 'numeric', month: 'long' }) + "'e kadar";
  }
  function tarih(t, ayar) {
    if (!t) return '';
    var d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(t + 'T12:00:00+03:00') : new Date(t);
    return d.toLocaleDateString('tr-TR', ayar || { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function tarihSaat(t) {
    if (!t) return '';
    return new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) {
    return String(s || '').toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
  }
  function sehirAdi(s) { return SEHIR[s] || (s ? s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1) : ''); }
  function konum(k) {
    return k.sehir === 'online' ? 'Online · ' + (k.semt || 'Tüm Türkiye') : [k.semt, sehirAdi(k.sehir)].filter(Boolean).join(', ');
  }
  function params() { return new URLSearchParams(window.location.search); }
  function imgFallback(img) {
    img.onerror = null;
    img.removeAttribute('src');
    img.classList.add('yk-img-fallback');
  }
  window.ykImgFallback = imgFallback;

  // Kısa bilgi mesajı (sağ alt köşe)
  function bildir(mesaj, tur) {
    var kutu = document.getElementById('yk-bildirim');
    if (!kutu) {
      kutu = document.createElement('div');
      kutu.id = 'yk-bildirim';
      kutu.setAttribute('role', 'status');
      kutu.setAttribute('aria-live', 'polite');
      document.body.appendChild(kutu);
    }
    var m = document.createElement('div');
    m.className = 'yk-toast yk-toast-' + (tur || 'bilgi');
    m.textContent = mesaj;
    kutu.appendChild(m);
    setTimeout(function () { m.classList.add('cik'); setTimeout(function () { m.remove(); }, 400); }, 4200);
  }

  function yukleniyor(el, metin) {
    if (el) el.innerHTML = '<div class="yk-loading"><span class="yk-spin"></span> ' + esc(metin || 'Yükleniyor…') + '</div>';
  }

  function hataKutusu(el, e, tekrar) {
    if (!el) return;
    el.innerHTML = '<div class="yk-empty"><i class="fa-solid fa-triangle-exclamation"></i><h5>Bir sorun oluştu</h5><p>' +
      esc(e && e.message || 'Veriler yüklenemedi.') + '</p>' +
      (tekrar ? '<button type="button" class="yk-btn" data-tekrar>Tekrar dene</button>' : '') + '</div>';
    var b = el.querySelector('[data-tekrar]');
    if (b) b.addEventListener('click', tekrar);
  }

  /* ---------- Kart ---------- */
  function kart(k) {
    var g = kalanGun(k), off = indirim(k);
    var kat = KAT[k.kategori] || { ad: k.kategori };
    var kalanPill = (k.kalan !== null && k.kalan !== undefined && k.kalan <= 20)
      ? '<span class="yk-pill-time urgent">' + (k.kalan === 0 ? 'Tükendi' : 'Son ' + k.kalan + ' kupon') + '</span>'
      : '<span class="yk-pill-time' + (g <= 3 ? ' urgent' : '') + '"><i class="fa-regular fa-clock"></i> ' + esc(kalanMetin(k)) + '</span>';
    return '' +
      '<a href="kampanya.html?id=' + encodeURIComponent(k.id) + '" class="yk-card-link">' +
        '<div class="yk-card">' +
          (k.gorsel ? '<img class="yk-card-img" src="' + esc(k.gorsel) + '" alt="' + esc(k.baslik) + '" loading="lazy" onerror="ykImgFallback(this)">'
                    : '<div class="yk-card-img yk-img-fallback yk-kat-' + esc(k.kategori) + '"><i class="fa-solid ' + esc(kat.ikon || 'fa-tag') + '"></i></div>') +
          '<div class="yk-card-overlay"></div>' +
          '<div class="yk-card-top">' +
            '<span class="yk-badge-cat">' + esc(kat.ad) + '</span>' +
            (off ? '<div class="yk-badge-off"><small>indirim</small>%' + off + '</div>' : '<div class="yk-badge-off"><small>fırsat</small><i class="fa-solid fa-tag"></i></div>') +
          '</div>' +
          '<div class="yk-card-bottom">' +
            '<span class="yk-card-biz">' + esc(k.isletme) + '</span>' +
            '<h4 class="yk-card-title">' + esc(k.baslik) + '</h4>' +
            '<p class="yk-card-loc"><i class="fa-solid fa-location-dot"></i>' + esc(konum(k)) + '</p>' +
            '<div class="yk-card-meta">' +
              '<div>' + (k.eskiFiyat && off ? '<span class="yk-price-old">' + tl(k.eskiFiyat) + '</span>' : '') +
                '<span class="yk-price-new">' + tl(k.yeniFiyat) + '</span></div>' +
              kalanPill +
            '</div>' +
          '</div>' +
        '</div>' +
      '</a>';
  }

  function aktifler() { return DATA.filter(aktif); }

  /* ---------- Üst menü: üye düğmesi ve demo bandı ---------- */
  function uyeAlaniniGuncelle(k) {
    var btn = document.getElementById('yk-uye-btn');
    var mobil = document.getElementById('yk-uye-mobil');
    if (btn) {
      if (k) {
        var ad = (k.ad_soyad || k.eposta || 'Hesabım').split(' ')[0];
        btn.href = 'hesabim.html';
        btn.innerHTML = '<i class="fa-solid fa-user-check"></i> <span>' + esc(ad.length > 14 ? 'Hesabım' : ad) + '</span>';
        btn.title = 'Hesabım ve kuponlarım';
      } else {
        btn.href = 'giris.html?donus=' + encodeURIComponent(sayfaAdi());
        btn.innerHTML = '<i class="fa-regular fa-user"></i> <span>Giriş Yap</span>';
        btn.title = 'Giriş yap veya üye ol';
      }
    }
    if (mobil) {
      mobil.innerHTML = k ? '<i class="fa-solid fa-ticket"></i> Hesabım ve Kuponlarım' : '<i class="fa-regular fa-user"></i> Giriş Yap / Üye Ol';
      mobil.href = k ? 'hesabim.html' : 'giris.html';
    }
  }
  function sayfaAdi() {
    var ad = window.location.pathname.split('/').pop() || 'index.html';
    if (!/\.html$/.test(ad)) ad += '.html';
    return ad + window.location.search;
  }

  /* ---------- Ana sayfa ---------- */
  function anaSayfa() {
    var one = document.getElementById('yk-featured');
    if (one) {
      var liste = aktifler().filter(function (k) { return k.oneCikan; });
      if (!liste.length) liste = aktifler().slice(0, 8);
      one.innerHTML = liste.map(kart).join('') || '<p class="yk-lead">Şu an öne çıkan kampanya yok.</p>';
    }
    var son = document.getElementById('yk-ending');
    if (son) {
      var bitenler = aktifler().slice().sort(function (a, b) { return bitisTarihi(a) - bitisTarihi(b); }).slice(0, 4);
      son.innerHTML = bitenler.map(kart).join('');
    }
    document.querySelectorAll('[data-cat-count]').forEach(function (el) {
      var c = el.getAttribute('data-cat-count');
      var n = aktifler().filter(function (k) { return k.kategori === c; }).length;
      el.textContent = n ? n + ' fırsat' : 'Yakında';
    });
    var toplam = document.getElementById('yk-total-count');
    if (toplam) toplam.textContent = aktifler().length;
    var ort = document.getElementById('yk-avg-off');
    var indirimli = aktifler().filter(indirim);
    if (ort && indirimli.length) {
      ort.textContent = '%' + Math.round(indirimli.reduce(function (s, k) { return s + indirim(k); }, 0) / indirimli.length);
    }
  }

  function kaydirmaDugmeleri() {
    document.querySelectorAll('[data-scroll]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = document.getElementById(btn.getAttribute('data-target'));
        if (t) t.scrollBy({ left: Number(btn.getAttribute('data-scroll')), behavior: 'smooth' });
      });
    });
  }

  /* ---------- Arama formu (her sayfada olabilir) ---------- */
  function aramaFormu() {
    document.querySelectorAll('form[data-yk-search]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = (f.querySelector('[name=q]') || {}).value || '';
        var s = (f.querySelector('[name=sehir]') || {}).value || '';
        var p = new URLSearchParams();
        if (q.trim()) p.set('q', q.trim());
        if (s) p.set('sehir', s);
        window.location.href = 'kampanyalar.html' + (p.toString() ? '?' + p.toString() : '');
      });
    });
  }

  /* ---------- Liste sayfası ---------- */
  function listeSayfasi() {
    var grid = document.getElementById('yk-list');
    if (!grid) return;

    var p = params();
    var durum = {
      q: p.get('q') || '',
      kategori: p.get('kategori') ? p.get('kategori').split(',') : [],
      sehir: p.get('sehir') ? p.get('sehir').split(',') : [],
      minIndirim: Number(p.get('min') || 0),
      sirala: p.get('sirala') || 'onerilen'
    };

    var katKutu = document.getElementById('yk-f-kategori');
    var sehirKutu = document.getElementById('yk-f-sehir');
    var qInput = document.getElementById('yk-f-q');
    var range = document.getElementById('yk-f-min');
    var rangeVal = document.getElementById('yk-f-min-val');
    var sirala = document.getElementById('yk-f-sirala');
    var sayac = document.getElementById('yk-count');
    var pills = document.getElementById('yk-cat-pills');

    function say(alan, deger) {
      return aktifler().filter(function (k) { return k[alan] === deger; }).length;
    }
    // Yalnızca kampanyası olan (veya filtrede seçili) seçenekleri göster
    katKutu.innerHTML = Object.keys(KAT).filter(function (key) {
      return say('kategori', key) || durum.kategori.indexOf(key) > -1;
    }).map(function (key) {
      return '<label class="yk-check"><input type="checkbox" value="' + key + '"' + (durum.kategori.indexOf(key) > -1 ? ' checked' : '') + '> ' +
        '<i class="fa-solid ' + KAT[key].ikon + '" style="color:#ff4a22;width:16px"></i> ' + KAT[key].ad +
        '<span class="count">' + say('kategori', key) + '</span></label>';
    }).join('');
    var sehirler = Object.keys(SEHIR);
    aktifler().forEach(function (k) { if (sehirler.indexOf(k.sehir) === -1) sehirler.push(k.sehir); });
    sehirKutu.innerHTML = sehirler.filter(function (key) {
      return say('sehir', key) || durum.sehir.indexOf(key) > -1;
    }).map(function (key) {
      return '<label class="yk-check"><input type="checkbox" value="' + esc(key) + '"' + (durum.sehir.indexOf(key) > -1 ? ' checked' : '') + '> ' +
        esc(sehirAdi(key)) + '<span class="count">' + say('sehir', key) + '</span></label>';
    }).join('');
    if (pills) {
      pills.innerHTML = '<button type="button" class="yk-pill" data-k="">Tümü</button>' + Object.keys(KAT).filter(function (key) {
        return say('kategori', key);
      }).map(function (key) {
        return '<button type="button" class="yk-pill" data-k="' + key + '"><i class="fa-solid ' + KAT[key].ikon + '"></i> ' + KAT[key].ad + '</button>';
      }).join('');
    }

    qInput.value = durum.q;
    range.value = durum.minIndirim;
    rangeVal.textContent = '%' + durum.minIndirim + '+';
    sirala.value = durum.sirala;

    function urlGuncelle() {
      var u = new URLSearchParams();
      if (durum.q) u.set('q', durum.q);
      if (durum.kategori.length) u.set('kategori', durum.kategori.join(','));
      if (durum.sehir.length) u.set('sehir', durum.sehir.join(','));
      if (durum.minIndirim) u.set('min', durum.minIndirim);
      if (durum.sirala !== 'onerilen') u.set('sirala', durum.sirala);
      try { history.replaceState(null, '', 'kampanyalar.html' + (u.toString() ? '?' + u.toString() : '')); } catch (e) { /* önizleme */ }
    }

    function ciz() {
      var q = norm(durum.q);
      var sonuc = aktifler().filter(function (k) {
        if (durum.kategori.length && durum.kategori.indexOf(k.kategori) === -1) return false;
        if (durum.sehir.length && durum.sehir.indexOf(k.sehir) === -1) return false;
        if (indirim(k) < durum.minIndirim) return false;
        if (q) {
          var metin = norm([k.baslik, k.isletme, k.semt, k.kisa, (KAT[k.kategori] || {}).ad, sehirAdi(k.sehir)].join(' '));
          if (metin.indexOf(q) === -1) return false;
        }
        return true;
      });
      sonuc.sort(function (a, b) {
        switch (durum.sirala) {
          case 'indirim': return indirim(b) - indirim(a);
          case 'fiyat-artan': return a.yeniFiyat - b.yeniFiyat;
          case 'fiyat-azalan': return b.yeniFiyat - a.yeniFiyat;
          case 'bitis': return bitisTarihi(a) - bitisTarihi(b);
          default: return (b.oneCikan ? 1 : 0) - (a.oneCikan ? 1 : 0) || indirim(b) - indirim(a);
        }
      });
      sayac.textContent = sonuc.length + ' fırsat bulundu';
      grid.innerHTML = sonuc.length ? sonuc.map(kart).join('') :
        '<div class="yk-empty" style="grid-column:1/-1"><i class="fa-solid fa-magnifying-glass"></i>' +
        '<h5>Bu kriterlere uygun fırsat bulunamadı</h5><p>Filtreleri azaltmayı ya da farklı bir kelime aramayı deneyin.</p>' +
        '<button type="button" class="yk-btn" id="yk-reset-2" style="margin-top:10px">Filtreleri temizle</button></div>';
      var r2 = document.getElementById('yk-reset-2');
      if (r2) r2.addEventListener('click', sifirla);
      if (pills) {
        pills.querySelectorAll('.yk-pill').forEach(function (b) {
          var k = b.getAttribute('data-k');
          b.classList.toggle('active', k === '' ? durum.kategori.length === 0 : (durum.kategori.length === 1 && durum.kategori[0] === k));
        });
      }
      urlGuncelle();
    }

    function seciliDegerler(kutu) {
      return Array.prototype.map.call(kutu.querySelectorAll('input:checked'), function (i) { return i.value; });
    }
    function sifirla() {
      durum = { q: '', kategori: [], sehir: [], minIndirim: 0, sirala: 'onerilen' };
      qInput.value = ''; range.value = 0; rangeVal.textContent = '%0+'; sirala.value = 'onerilen';
      document.querySelectorAll('#yk-f-kategori input, #yk-f-sehir input').forEach(function (i) { i.checked = false; });
      ciz();
    }

    katKutu.addEventListener('change', function () { durum.kategori = seciliDegerler(katKutu); ciz(); });
    sehirKutu.addEventListener('change', function () { durum.sehir = seciliDegerler(sehirKutu); ciz(); });
    qInput.addEventListener('input', function () { durum.q = qInput.value.trim(); ciz(); });
    range.addEventListener('input', function () { durum.minIndirim = Number(range.value); rangeVal.textContent = '%' + range.value + '+'; ciz(); });
    sirala.addEventListener('change', function () { durum.sirala = sirala.value; ciz(); });
    document.getElementById('yk-reset').addEventListener('click', sifirla);
    if (pills) {
      pills.addEventListener('click', function (e) {
        var b = e.target.closest('.yk-pill');
        if (!b) return;
        var k = b.getAttribute('data-k');
        durum.kategori = k ? [k] : [];
        katKutu.querySelectorAll('input').forEach(function (i) { i.checked = durum.kategori.indexOf(i.value) > -1; });
        ciz();
      });
    }
    var toggle = document.getElementById('yk-filter-toggle');
    if (toggle) toggle.addEventListener('click', function () {
      document.getElementById('yk-filter-box').classList.toggle('open');
    });

    ciz();
  }

  /* ---------- Detay sayfası ve kupon alma ---------- */
  function saatSecenekleri() {
    var s = '';
    for (var h = 8; h <= 23; h++) {
      ['00', '30'].forEach(function (m) {
        var v = (h < 10 ? '0' : '') + h + ':' + m;
        s += '<option value="' + v + '"' + (v === '19:00' ? ' selected' : '') + '>' + v + '</option>';
      });
    }
    return s;
  }

  function satinAlKutusu(k) {
    var off = indirim(k);
    var tukendi = k.kalan === 0;
    var maxAdet = Math.max(1, Math.min(k.kisiBasiLimit || 5, k.kalan === null || k.kalan === undefined ? 99 : k.kalan));
    var adetSec = '';
    for (var i = 1; i <= maxAdet; i++) adetSec += '<option value="' + i + '">' + i + '</option>';
    var bugun = YK.bugun();

    var form = tukendi
      ? '<div class="yk-empty" style="padding:18px;margin-bottom:12px"><i class="fa-solid fa-box-open"></i>Bu kampanyanın kuponları tükendi.</div>'
      : '<form id="yk-kupon-form" class="yk-kupon-form" novalidate>' +
          (k.rezervasyonGerekli
            ? '<div class="yk-rez-baslik"><i class="fa-regular fa-calendar-check"></i> Rezervasyon bilgileri</div>' +
              '<div class="row g-2 mb-10">' +
                '<div class="col-12"><label for="yk-rez-tarih">Tarih</label><input id="yk-rez-tarih" name="tarih" type="date" class="yk-input" min="' + bugun + '" max="' + esc(k.bitis) + '" required></div>' +
                '<div class="col-6"><label for="yk-rez-saat">Saat</label><select id="yk-rez-saat" name="saat" class="yk-select">' + saatSecenekleri() + '</select></div>' +
                '<div class="col-6"><label for="yk-rez-kisi">Kişi</label><select id="yk-rez-kisi" name="kisi" class="yk-select">' +
                  [1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(function (n) { return '<option value="' + n + '"' + (n === 2 ? ' selected' : '') + '>' + n + ' kişi</option>'; }).join('') +
                '</select></div>' +
              '</div>'
            : '') +
          '<div class="row g-2 mb-10">' +
            '<div class="col-5"><label for="yk-adet">Kupon adedi</label><select id="yk-adet" name="adet" class="yk-select">' + adetSec + '</select></div>' +
            '<div class="col-7"><label>Mekanda ödenecek</label><div class="yk-toplam" id="yk-toplam">' + tl(k.yeniFiyat) + '</div></div>' +
          '</div>' +
          (k.rezervasyonGerekli ? '<label for="yk-not">İşletmeye not (isteğe bağlı)</label><textarea id="yk-not" name="not" rows="2" maxlength="500" class="yk-textarea mb-10" placeholder="Örn. cam kenarı masa"></textarea>' : '') +
          '<div class="yk-form-hata" id="yk-kupon-hata" role="alert"></div>' +
          '<button type="submit" class="yk-btn" id="yk-kupon-al"><i class="fa-solid fa-ticket"></i> ' +
            (YK.kullanici ? 'Kuponu Al' : 'Giriş Yap ve Kuponu Al') + '</button>' +
        '</form>';

    return '' +
      '<div class="yk-buy-box">' +
        (off ? '<span class="yk-buy-off">%' + off + ' indirim</span>' : '<span class="yk-buy-off">Yakaladım fırsatı</span>') +
        '<div class="yk-buy-price"><span class="new">' + tl(k.yeniFiyat) + '</span>' + (off ? '<span class="old">' + tl(k.eskiFiyat) + '</span>' : '') + '</div>' +
        (off ? '<div class="yk-buy-save"><i class="fa-solid fa-tag"></i> ' + tl(k.eskiFiyat - k.yeniFiyat) + ' tasarruf</div>' : '<div class="yk-buy-save">&nbsp;</div>') +
        '<div class="yk-countdown" id="yk-countdown"><div><strong data-u="g">0</strong><span>Gün</span></div><div><strong data-u="s">0</strong><span>Saat</span></div><div><strong data-u="d">0</strong><span>Dakika</span></div><div><strong data-u="sn">0</strong><span>Saniye</span></div></div>' +
        (k.kalan !== null && k.kalan !== undefined && !tukendi ? '<div class="yk-stok"><i class="fa-solid fa-fire"></i> Son <strong>' + k.kalan + '</strong> kupon</div>' : '') +
        form +
        '<ul class="yk-adimlar">' +
          '<li><i class="fa-solid fa-1"></i> Kuponu ücretsiz al, kodun hesabına kaydedilsin.</li>' +
          '<li><i class="fa-solid fa-2"></i> ' + (k.sehir === 'online' ? 'Siparişte kodu işletmeye ilet.' : 'Mekanda kodu veya QR’ı göster.') + '</li>' +
          '<li><i class="fa-solid fa-3"></i> İndirimli fiyatı doğrudan işletmeye öde.</li>' +
        '</ul>' +
      '</div>';
  }

  function kuponAlmaAkisi(k) {
    var f = document.getElementById('yk-kupon-form');
    if (!f) return;
    var adet = f.querySelector('[name=adet]'), toplam = document.getElementById('yk-toplam');
    var hataEl = document.getElementById('yk-kupon-hata'), btn = document.getElementById('yk-kupon-al');
    adet.addEventListener('change', function () { toplam.textContent = tl(k.yeniFiyat * Number(adet.value)); });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      hataEl.textContent = '';
      if (!YK.kullanici) {
        window.location.href = 'giris.html?donus=' + encodeURIComponent('kampanya.html?id=' + k.id) + '&neden=kupon';
        return;
      }
      var veri = { kampanyaId: k.id, adet: Number(adet.value) };
      if (k.rezervasyonGerekli) {
        veri.tarih = f.querySelector('[name=tarih]').value;
        veri.saat = f.querySelector('[name=saat]').value;
        veri.kisi = Number(f.querySelector('[name=kisi]').value);
        veri.not = f.querySelector('[name=not]').value;
        if (!veri.tarih) { hataEl.textContent = 'Lütfen rezervasyon tarihini seçin.'; f.querySelector('[name=tarih]').focus(); return; }
      }
      btn.disabled = true;
      btn.innerHTML = '<span class="yk-spin"></span> Kupon oluşturuluyor…';
      YK.kupon.al(veri).then(function (c) {
        window.location.href = 'kupon.html?kod=' + encodeURIComponent(c.kod) + '&yeni=1';
      }, function (err) {
        hataEl.textContent = err.message;
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-ticket"></i> Kuponu Al';
      });
    });
  }

  function detaySayfasi() {
    var kok = document.getElementById('yk-detail');
    if (!kok) return;
    var id = params().get('id');
    var k = DATA.filter(function (x) { return x.id === id; })[0];

    if (!k) {
      kok.innerHTML = '<div class="yk-empty"><i class="fa-solid fa-tag"></i><h4>Kampanya bulunamadı</h4>' +
        '<p>Aradığınız kampanya kaldırılmış ya da süresi dolmuş olabilir.</p>' +
        '<a href="kampanyalar.html" class="yk-btn" style="margin-top:10px">Tüm fırsatlara göz at</a></div>';
      return;
    }

    var kat = KAT[k.kategori] || { ad: k.kategori, ikon: 'fa-tag' };
    var off = indirim(k);
    document.title = k.baslik + ' — ' + k.isletme + ' | Yakaladım';
    var md = document.querySelector('meta[name=description]');
    if (md) md.setAttribute('content', k.kisa + (off ? ' %' + off + ' indirimle ' : ' ') + tl(k.yeniFiyat) + '. ' + konum(k) + '.');
    var bc = document.getElementById('yk-bc-title');
    if (bc) bc.textContent = k.baslik;
    var hTitle = document.getElementById('yk-hero-title');
    if (hTitle) hTitle.textContent = k.isletme;
    var hSub = document.getElementById('yk-hero-sub');
    if (hSub) hSub.textContent = konum(k);

    var haritaLink = k.adres ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(k.isletme + ' ' + k.adres) : '';
    var paylasMetni = encodeURIComponent(k.baslik + (off ? ' - %' + off + ' indirim! ' : ' ') + window.location.href);

    kok.innerHTML = '' +
      '<div class="row">' +
        '<div class="col-lg-7 col-xl-8">' +
          (k.gorsel ? '<img class="yk-detail-img" src="' + esc(k.gorsel) + '" alt="' + esc(k.baslik) + '" onerror="ykImgFallback(this)">'
                    : '<div class="yk-detail-img yk-img-fallback yk-kat-' + esc(k.kategori) + '"><i class="fa-solid ' + esc(kat.ikon) + '"></i></div>') +
          '<div class="yk-detail-badges">' +
            '<span class="yk-tag"><i class="fa-solid ' + kat.ikon + '"></i> ' + esc(kat.ad) + '</span>' +
            '<span class="yk-tag yk-tag-blue"><i class="fa-solid fa-location-dot"></i> ' + esc(konum(k)) + '</span>' +
            '<span class="yk-tag"><i class="fa-regular fa-clock"></i> ' + esc(kalanMetin(k)) + '</span>' +
            (k.rezervasyonGerekli ? '<span class="yk-tag yk-tag-blue"><i class="fa-regular fa-calendar-check"></i> Rezervasyonlu</span>' : '') +
          '</div>' +
          '<h1 class="yk-detail-title">' + esc(k.baslik) + '</h1>' +
          '<p class="yk-detail-biz"><strong>' + esc(k.isletme) + '</strong>' + (k.kisa ? ' · ' + esc(k.kisa) : '') + '</p>' +
          (k.aciklama ? '<div class="yk-detail-section"><h4>Kampanya Detayı</h4><p>' + esc(k.aciklama) + '</p></div>' : '') +
          '<div class="yk-detail-section"><h4>Kampanya Koşulları</h4><ul class="yk-conditions">' +
            (k.kosullar || []).map(function (c) { return '<li><i class="fa-solid fa-check"></i><span>' + esc(c) + '</span></li>'; }).join('') +
            '<li><i class="fa-solid fa-check"></i><span>Kişi başı en fazla ' + (k.kisiBasiLimit || 5) + ' kupon alınabilir.</span></li>' +
            '<li><i class="fa-solid fa-check"></i><span>Kupon, alındıktan sonra ' + (k.kuponGecerlilikGun || 30) + ' gün içinde ve en geç ' + tarih(k.bitis) + ' tarihine kadar kullanılmalıdır.</span></li>' +
            '<li><i class="fa-solid fa-check"></i><span>Ödeme, kupon gösterilerek doğrudan işletmeye yapılır.</span></li>' +
          '</ul></div>' +
          ((k.adres || k.telefon) ? '<div class="yk-detail-section"><h4>İşletme Bilgileri</h4>' +
            (k.adres ? '<p><i class="fa-solid fa-location-dot" style="color:#ff4a22"></i> ' + esc(k.adres) +
              ' — <a href="' + haritaLink + '" target="_blank" rel="noopener" style="color:#ff4a22;font-weight:600">Haritada aç</a></p>' : '') +
            (k.telefon ? '<p><i class="fa-solid fa-phone" style="color:#ff4a22"></i> <a href="tel:' + esc(k.telefon.replace(/[^0-9+]/g, '')) + '">' + esc(k.telefon) + '</a></p>' : '') +
          '</div>' : '') +
        '</div>' +
        '<div class="col-lg-5 col-xl-4">' + satinAlKutusu(k) +
          '<div class="yk-paylas">' +
            (haritaLink ? '<a class="yk-btn-outline" href="' + haritaLink + '" target="_blank" rel="noopener"><i class="fa-solid fa-location-dot"></i> Yol Tarifi</a>' : '') +
            '<a class="yk-btn-outline" href="https://wa.me/?text=' + paylasMetni + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Paylaş</a>' +
            (k.link ? '<a class="yk-btn-outline" href="' + esc(k.link) + '" target="_blank" rel="noopener nofollow"><i class="fa-solid fa-arrow-up-right-from-square"></i> İşletme</a>' : '') +
          '</div>' +
        '</div>' +
      '</div>';

    kuponAlmaAkisi(k);

    var cd = document.getElementById('yk-countdown');
    if (cd) {
      var tick = function () {
        var fark = Math.max(0, bitisTarihi(k) - new Date());
        cd.querySelector('[data-u=g]').textContent = Math.floor(fark / GUN_MS);
        cd.querySelector('[data-u=s]').textContent = Math.floor(fark % GUN_MS / 3600000);
        cd.querySelector('[data-u=d]').textContent = Math.floor(fark % 3600000 / 60000);
        cd.querySelector('[data-u=sn]').textContent = Math.floor(fark % 60000 / 1000);
      };
      tick();
      setInterval(tick, 1000);
    }

    var benzer = document.getElementById('yk-similar');
    if (benzer) {
      var liste = aktifler().filter(function (x) { return x.id !== k.id && (x.kategori === k.kategori || x.sehir === k.sehir); }).slice(0, 4);
      if (liste.length < 4) {
        liste = liste.concat(aktifler().filter(function (x) { return x.id !== k.id && liste.indexOf(x) === -1; }).slice(0, 4 - liste.length));
      }
      benzer.innerHTML = liste.map(kart).join('');
    }
  }

  /* ---------- Formlar: iletişim, işletme başvurusu, bülten ---------- */
  function formlar() {
    document.querySelectorAll('form[data-yk-form]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (f.checkValidity && !f.checkValidity()) { if (f.reportValidity) f.reportValidity(); return; }
        var veri = {};
        f.querySelectorAll('[name]').forEach(function (el) {
          if (el.type === 'checkbox') veri[el.name] = el.checked;
          else if (el.value) veri[el.name] = String(el.value).slice(0, 1500);
        });
        var btn = f.querySelector('[type=submit]');
        if (btn) btn.disabled = true;
        YK.basvuru(f.getAttribute('data-yk-form'), veri).then(function () {
          var msg = f.querySelector('.yk-form-msg');
          if (msg) msg.style.display = 'block';
          else bildir('Teşekkürler! Kaydınız alındı.', 'basari');
          f.reset();
        }, function (err) {
          bildir(err.message, 'hata');
        }).then(function () { if (btn) btn.disabled = false; });
      });
    });
    var tabs = document.querySelectorAll('[data-yk-tab]');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { x.classList.toggle('active', x === t); });
        document.querySelectorAll('[data-yk-panel]').forEach(function (p) {
          p.style.display = p.getAttribute('data-yk-panel') === t.getAttribute('data-yk-tab') ? 'block' : 'none';
        });
      });
    });
    if (params().get('tip') === 'isletme') {
      var b = document.querySelector('[data-yk-tab=isletme]');
      if (b) b.click();
    }
  }

  window.YKUI = {
    tl: tl, esc: esc, tarih: tarih, tarihSaat: tarihSaat, indirim: indirim, konum: konum, kart: kart,
    bildir: bildir, yukleniyor: yukleniyor, hataKutusu: hataKutusu, sehirAdi: sehirAdi, params: params,
    kategoriAdi: function (k) { return (KAT[k] || { ad: k }).ad; }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var yil = document.getElementById('yk-year');
    if (yil) yil.textContent = new Date().getFullYear();
    if (YK.mod === 'demo') {
      var bant = document.getElementById('yk-demo-bant');
      if (bant) bant.hidden = false;
    }
    aramaFormu();
    formlar();
    kaydirmaDugmeleri();
    YK.oturumDegisince(uyeAlaniniGuncelle);

    var kampanyaGereken = document.getElementById('yk-featured') || document.getElementById('yk-ending') ||
      document.getElementById('yk-list') || document.getElementById('yk-detail') || document.querySelector('[data-cat-count]');
    if (!kampanyaGereken) return;

    var hedef = document.getElementById('yk-list') || document.getElementById('yk-detail') || document.getElementById('yk-featured');
    yukleniyor(hedef, 'Fırsatlar yükleniyor…');
    function yukle() {
      YK.hazir.then(function () { return YK.kampanyalar(); }).then(function (liste) {
        DATA = liste;
        anaSayfa();
        listeSayfasi();
        detaySayfasi();
      }, function (e) {
        console.error(e);
        hataKutusu(hedef, e, function () { yukleniyor(hedef); YK.kampanyalar(true); yukle(); });
      });
    }
    yukle();
  });
})();
