/* =====================================================================
   YAKALADIM.COM — SAYFA MOTORU
   Kampanya verisini (assets/data/kampanyalar.js) okuyup kartları,
   filtreleri ve detay sayfasını oluşturur. Değiştirmeniz gerekmez.
   ===================================================================== */
(function () {
  'use strict';

  var DATA = window.KAMPANYALAR || [];
  var KAT = window.KATEGORILER || {};
  var SEHIR = window.SEHIRLER || {};
  var GUN_MS = 24 * 60 * 60 * 1000;

  /* ---------- Yardımcılar ---------- */
  function tl(n) {
    return Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL';
  }
  function indirim(k) {
    return Math.round((1 - k.yeniFiyat / k.eskiFiyat) * 100);
  }
  function bitisTarihi(k) {
    return new Date(k.bitis + 'T23:59:59');
  }
  function kalanGun(k) {
    return Math.ceil((bitisTarihi(k) - new Date()) / GUN_MS);
  }
  function aktif(k) {
    return bitisTarihi(k) >= new Date();
  }
  function kalanMetin(k) {
    var g = kalanGun(k);
    if (g <= 0) return 'Bugün son gün';
    if (g === 1) return 'Yarın bitiyor';
    if (g <= 7) return 'Son ' + g + ' gün';
    return bitisTarihi(k).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) + "'e kadar";
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
  function konum(k) {
    return k.sehir === 'online' ? 'Online · ' + k.semt : k.semt + ', ' + (SEHIR[k.sehir] || k.sehir);
  }
  function params() {
    return new URLSearchParams(window.location.search);
  }
  function imgFallback(img) {
    img.onerror = null;
    img.removeAttribute('src');
    img.classList.add('yk-img-fallback');
  }
  window.ykImgFallback = imgFallback;

  /* ---------- Kart ---------- */
  function kart(k) {
    var g = kalanGun(k);
    var kat = KAT[k.kategori] || { ad: k.kategori };
    return '' +
      '<a href="kampanya.html?id=' + encodeURIComponent(k.id) + '" class="yk-card-link">' +
        '<div class="yk-card">' +
          '<img class="yk-card-img" src="' + esc(k.gorsel) + '" alt="' + esc(k.baslik) + '" loading="lazy" onerror="ykImgFallback(this)">' +
          '<div class="yk-card-overlay"></div>' +
          '<div class="yk-card-top">' +
            '<span class="yk-badge-cat">' + esc(kat.ad) + '</span>' +
            '<div class="yk-badge-off"><small>indirim</small>%' + indirim(k) + '</div>' +
          '</div>' +
          '<div class="yk-card-bottom">' +
            '<span class="yk-card-biz">' + esc(k.isletme) + '</span>' +
            '<h4 class="yk-card-title">' + esc(k.baslik) + '</h4>' +
            '<p class="yk-card-loc"><i class="fa-solid fa-location-dot"></i>' + esc(konum(k)) + '</p>' +
            '<div class="yk-card-meta">' +
              '<div><span class="yk-price-old">' + tl(k.eskiFiyat) + '</span><span class="yk-price-new">' + tl(k.yeniFiyat) + '</span></div>' +
              '<span class="yk-pill-time' + (g <= 3 ? ' urgent' : '') + '"><i class="fa-regular fa-clock"></i> ' + esc(kalanMetin(k)) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</a>';
  }

  function aktifler() {
    return DATA.filter(aktif);
  }

  /* ---------- Ana sayfa ---------- */
  function anaSayfa() {
    var one = document.getElementById('yk-featured');
    if (one) {
      var liste = aktifler().filter(function (k) { return k.oneCikan; });
      if (!liste.length) liste = aktifler();
      one.innerHTML = liste.map(kart).join('');
    }
    var son = document.getElementById('yk-ending');
    if (son) {
      var bitenler = aktifler().slice().sort(function (a, b) { return bitisTarihi(a) - bitisTarihi(b); }).slice(0, 4);
      son.innerHTML = bitenler.map(kart).join('');
    }
    document.querySelectorAll('[data-cat-count]').forEach(function (el) {
      var c = el.getAttribute('data-cat-count');
      var n = aktifler().filter(function (k) { return k.kategori === c; }).length;
      el.textContent = n + ' fırsat';
    });
    var toplam = document.getElementById('yk-total-count');
    if (toplam) toplam.textContent = aktifler().length;
    var ort = document.getElementById('yk-avg-off');
    if (ort && aktifler().length) {
      var a = aktifler();
      ort.textContent = '%' + Math.round(a.reduce(function (s, k) { return s + indirim(k); }, 0) / a.length);
    }

    document.querySelectorAll('[data-scroll]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = document.getElementById(btn.getAttribute('data-target'));
        if (t) t.scrollBy({ left: Number(btn.getAttribute('data-scroll')), behavior: 'smooth' });
      });
    });
  }

  /* ---------- Hero arama formu (her sayfada olabilir) ---------- */
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

    katKutu.innerHTML = Object.keys(KAT).map(function (key) {
      return '<label class="yk-check"><input type="checkbox" value="' + key + '"' + (durum.kategori.indexOf(key) > -1 ? ' checked' : '') + '> ' +
        '<i class="fa-solid ' + KAT[key].ikon + '" style="color:#ff4a22;width:16px"></i> ' + KAT[key].ad +
        '<span class="count">' + say('kategori', key) + '</span></label>';
    }).join('');
    sehirKutu.innerHTML = Object.keys(SEHIR).map(function (key) {
      return '<label class="yk-check"><input type="checkbox" value="' + key + '"' + (durum.sehir.indexOf(key) > -1 ? ' checked' : '') + '> ' +
        SEHIR[key] + '<span class="count">' + say('sehir', key) + '</span></label>';
    }).join('');
    if (pills) {
      pills.innerHTML = '<button type="button" class="yk-pill" data-k="">Tümü</button>' + Object.keys(KAT).map(function (key) {
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
      history.replaceState(null, '', 'kampanyalar.html' + (u.toString() ? '?' + u.toString() : ''));
    }

    function ciz() {
      var q = norm(durum.q);
      var sonuc = aktifler().filter(function (k) {
        if (durum.kategori.length && durum.kategori.indexOf(k.kategori) === -1) return false;
        if (durum.sehir.length && durum.sehir.indexOf(k.sehir) === -1) return false;
        if (indirim(k) < durum.minIndirim) return false;
        if (q) {
          var metin = norm([k.baslik, k.isletme, k.semt, k.kisa, (KAT[k.kategori] || {}).ad, SEHIR[k.sehir]].join(' '));
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
      qInput.value = '';
      range.value = 0;
      rangeVal.textContent = '%0+';
      sirala.value = 'onerilen';
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

  /* ---------- Detay sayfası ---------- */
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
    var bitti = !aktif(k);
    document.title = k.baslik + ' — ' + k.isletme + ' | Yakaladım';
    var md = document.querySelector('meta[name=description]');
    if (md) md.setAttribute('content', k.kisa + ' %' + indirim(k) + ' indirimle ' + tl(k.yeniFiyat) + '. ' + konum(k) + '.');
    var bc = document.getElementById('yk-bc-title');
    if (bc) bc.textContent = k.baslik;
    var hTitle = document.getElementById('yk-hero-title');
    if (hTitle) hTitle.textContent = k.isletme;
    var hSub = document.getElementById('yk-hero-sub');
    if (hSub) hSub.textContent = konum(k);

    var haritaLink = k.adres ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(k.isletme + ' ' + k.adres) : '';
    var paylasMetni = encodeURIComponent(k.baslik + ' - %' + indirim(k) + ' indirim! ' + window.location.href);

    kok.innerHTML = '' +
      '<div class="row">' +
        '<div class="col-lg-8">' +
          '<img class="yk-detail-img" src="' + esc(k.gorsel) + '" alt="' + esc(k.baslik) + '" onerror="ykImgFallback(this)">' +
          '<div class="yk-detail-badges">' +
            '<span class="yk-tag"><i class="fa-solid ' + kat.ikon + '"></i> ' + esc(kat.ad) + '</span>' +
            '<span class="yk-tag yk-tag-blue"><i class="fa-solid fa-location-dot"></i> ' + esc(konum(k)) + '</span>' +
            '<span class="yk-tag"><i class="fa-regular fa-clock"></i> ' + (bitti ? 'Süresi doldu' : esc(kalanMetin(k))) + '</span>' +
          '</div>' +
          '<h1 class="yk-detail-title">' + esc(k.baslik) + '</h1>' +
          '<p class="yk-detail-biz"><strong>' + esc(k.isletme) + '</strong> · ' + esc(k.kisa) + '</p>' +
          '<div class="yk-detail-section"><h4>Kampanya Detayı</h4><p>' + esc(k.aciklama) + '</p></div>' +
          '<div class="yk-detail-section"><h4>Kampanya Koşulları</h4><ul class="yk-conditions">' +
            (k.kosullar || []).map(function (c) { return '<li><i class="fa-solid fa-check"></i><span>' + esc(c) + '</span></li>'; }).join('') +
            '<li><i class="fa-solid fa-check"></i><span>Son geçerlilik tarihi: ' + bitisTarihi(k).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) + '</span></li>' +
          '</ul></div>' +
          (k.adres ? '<div class="yk-detail-section"><h4>Adres</h4><p><i class="fa-solid fa-location-dot" style="color:#ff4a22"></i> ' + esc(k.adres) +
            ' — <a href="' + haritaLink + '" target="_blank" rel="noopener" style="color:#ff4a22;font-weight:600">Haritada aç</a></p></div>' : '') +
        '</div>' +
        '<div class="col-lg-4">' +
          '<div class="yk-buy-box">' +
            '<span class="yk-buy-off">%' + indirim(k) + ' indirim</span>' +
            '<div class="yk-buy-price"><span class="new">' + tl(k.yeniFiyat) + '</span><span class="old">' + tl(k.eskiFiyat) + '</span></div>' +
            '<div class="yk-buy-save"><i class="fa-solid fa-tag"></i> ' + tl(k.eskiFiyat - k.yeniFiyat) + ' tasarruf</div>' +
            (bitti ? '<div class="yk-empty" style="padding:20px;margin-bottom:12px">Bu kampanyanın süresi doldu.</div>' :
              '<div class="yk-countdown" id="yk-countdown"><div><strong data-u="g">0</strong><span>Gün</span></div><div><strong data-u="s">0</strong><span>Saat</span></div><div><strong data-u="d">0</strong><span>Dakika</span></div><div><strong data-u="sn">0</strong><span>Saniye</span></div></div>') +
            (k.kupon && !bitti ? '<div class="yk-coupon"><code id="yk-kupon">' + esc(k.kupon) + '</code><button type="button" id="yk-copy"><i class="fa-regular fa-copy"></i> Kopyala</button></div>' : '') +
            (k.link && !bitti ? '<a class="yk-btn" href="' + esc(k.link) + '" target="_blank" rel="noopener sponsored">Fırsatı Yakala <i class="fa-solid fa-arrow-right"></i></a>' : '') +
            (haritaLink ? '<a class="yk-btn-outline" href="' + haritaLink + '" target="_blank" rel="noopener"><i class="fa-solid fa-location-dot"></i> Yol Tarifi Al</a>' : '') +
            '<a class="yk-btn-outline" href="https://wa.me/?text=' + paylasMetni + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Arkadaşına Gönder</a>' +
            '<p class="yk-buy-note">Kupon kodunu işletmede veya online sepette kullanın. Kampanya koşullarını işletme belirler.</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    var copy = document.getElementById('yk-copy');
    if (copy) copy.addEventListener('click', function () {
      var kod = k.kupon;
      var bitir = function () {
        copy.innerHTML = '<i class="fa-solid fa-check"></i> Kopyalandı';
        copy.classList.add('copied');
        setTimeout(function () { copy.innerHTML = '<i class="fa-regular fa-copy"></i> Kopyala'; copy.classList.remove('copied'); }, 2000);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(kod).then(bitir, bitir); else bitir();
    });

    var cd = document.getElementById('yk-countdown');
    if (cd) {
      var tick = function () {
        var fark = Math.max(0, bitisTarihi(k) - new Date());
        var gun = Math.floor(fark / GUN_MS);
        var saat = Math.floor(fark % GUN_MS / 3600000);
        var dk = Math.floor(fark % 3600000 / 60000);
        var sn = Math.floor(fark % 60000 / 1000);
        cd.querySelector('[data-u=g]').textContent = gun;
        cd.querySelector('[data-u=s]').textContent = saat;
        cd.querySelector('[data-u=d]').textContent = dk;
        cd.querySelector('[data-u=sn]').textContent = sn;
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

  /* ---------- İletişim formları (backend yok: e-posta istemcisini açar) ---------- */
  function formlar() {
    document.querySelectorAll('form[data-yk-mail]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var konu = f.getAttribute('data-yk-mail');
        var satirlar = [];
        f.querySelectorAll('[name]').forEach(function (el) {
          if (el.value) satirlar.push((el.getAttribute('data-label') || el.name) + ': ' + el.value);
        });
        var adres = f.getAttribute('data-yk-to') || 'info@yakaladim.com';
        window.location.href = 'mailto:' + adres + '?subject=' + encodeURIComponent(konu) + '&body=' + encodeURIComponent(satirlar.join('\n'));
        var msg = f.querySelector('.yk-form-msg');
        if (msg) msg.style.display = 'block';
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

  document.addEventListener('DOMContentLoaded', function () {
    aramaFormu();
    anaSayfa();
    listeSayfasi();
    detaySayfasi();
    formlar();
    var yil = document.getElementById('yk-year');
    if (yil) yil.textContent = new Date().getFullYear();
  });
})();
