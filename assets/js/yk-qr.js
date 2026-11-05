/* =====================================================================
   YAKALADIM — QR KOD ÜRETİCİ (bağımlılıksız)
   QR Code Model 2, bayt modu, hata düzeltme seviyesi M, sürüm 1–40.
   Algoritma ISO/IEC 18004 standardını izler (Nayuki'nin açık kaynak
   referans uygulamasının yapısı temel alınmıştır).
   Kullanım:  YKQR.svg("https://...", { boyut: 220 })  → SVG metni
   ===================================================================== */
(function (kok) {
  'use strict';

  // Hata düzeltme seviyesi M için tablo değerleri (indeks = sürüm)
  var ECC_BLOK_BASINA = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
  var BLOK_SAYISI = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
  var FORMAT_BITLERI_M = 0;

  function ham_veri_modulu(s) {
    var r = (16 * s + 128) * s + 64;
    if (s >= 2) {
      var n = Math.floor(s / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (s >= 7) r -= 36;
    }
    return r;
  }
  function veri_kod_sozcugu(s) {
    return Math.floor(ham_veri_modulu(s) / 8) - ECC_BLOK_BASINA[s] * BLOK_SAYISI[s];
  }

  // GF(2^8) çarpımı, indirgeme polinomu 0x11D
  function carp(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xFF;
  }
  function rs_bolen(derece) {
    var r = [];
    for (var i = 0; i < derece - 1; i++) r.push(0);
    r.push(1);
    var kok = 1;
    for (i = 0; i < derece; i++) {
      for (var j = 0; j < r.length; j++) {
        r[j] = carp(r[j], kok);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      kok = carp(kok, 0x02);
    }
    return r;
  }
  function rs_kalan(veri, bolen) {
    var r = bolen.map(function () { return 0; });
    veri.forEach(function (b) {
      var f = b ^ r.shift();
      r.push(0);
      bolen.forEach(function (c, i) { r[i] ^= carp(c, f); });
    });
    return r;
  }

  function utf8(metin) {
    var s = unescape(encodeURIComponent(metin));
    var out = [];
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function uret(metin) {
    var veri = utf8(metin);
    var surum, kapasite, sayac_bit;
    for (surum = 1; surum <= 40; surum++) {
      sayac_bit = surum <= 9 ? 8 : 16;
      kapasite = veri_kod_sozcugu(surum) * 8;
      if (4 + sayac_bit + veri.length * 8 <= kapasite) break;
    }
    if (surum > 40) throw new Error('QR için metin çok uzun');

    // Bit dizisi: mod (0100 = bayt), uzunluk, veri, sonlandırıcı, dolgu
    var bitler = [];
    function ekle(deger, uzunluk) {
      for (var i = uzunluk - 1; i >= 0; i--) bitler.push((deger >>> i) & 1);
    }
    ekle(4, 4);
    ekle(veri.length, sayac_bit);
    veri.forEach(function (b) { ekle(b, 8); });
    ekle(0, Math.min(4, kapasite - bitler.length));
    ekle(0, (8 - bitler.length % 8) % 8);
    for (var dolgu = 0xEC; bitler.length < kapasite; dolgu ^= 0xEC ^ 0x11) ekle(dolgu, 8);
    var sozcukler = [];
    for (var i = 0; i < bitler.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = (b << 1) | bitler[i + j];
      sozcukler.push(b);
    }

    // Bloklara böl, hata düzeltme ekle, iç içe geçir
    var blok_sayisi = BLOK_SAYISI[surum], ecc_uzun = ECC_BLOK_BASINA[surum];
    var ham = Math.floor(ham_veri_modulu(surum) / 8);
    var kisa_blok = blok_sayisi - ham % blok_sayisi;
    var kisa_uzun = Math.floor(ham / blok_sayisi);
    var bolen = rs_bolen(ecc_uzun), bloklar = [], k = 0;
    for (i = 0; i < blok_sayisi; i++) {
      var dat = sozcukler.slice(k, k + kisa_uzun - ecc_uzun + (i < kisa_blok ? 0 : 1));
      k += dat.length;
      var ecc = rs_kalan(dat, bolen);
      if (i < kisa_blok) dat.push(0);
      bloklar.push(dat.concat(ecc));
    }
    var son = [];
    for (i = 0; i < bloklar[0].length; i++) {
      for (j = 0; j < bloklar.length; j++) {
        if (i !== kisa_uzun - ecc_uzun || j >= kisa_blok) son.push(bloklar[j][i]);
      }
    }

    // Matris
    var n = surum * 4 + 17;
    var mod = [], fonk = [];
    for (i = 0; i < n; i++) {
      mod.push(new Array(n).fill(false));
      fonk.push(new Array(n).fill(false));
    }
    function koy(x, y, koyu) { mod[y][x] = koyu; fonk[y][x] = true; }

    for (i = 0; i < n; i++) { koy(6, i, i % 2 === 0); koy(i, 6, i % 2 === 0); }
    function bulucu(x, y) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < n && yy >= 0 && yy < n) koy(xx, yy, d !== 2 && d !== 4);
      }
    }
    bulucu(3, 3); bulucu(n - 4, 3); bulucu(3, n - 4);

    var hiza = [];
    if (surum > 1) {
      var adet = Math.floor(surum / 7) + 2;
      var adim = surum === 32 ? 26 : Math.ceil((surum * 4 + 4) / (adet * 2 - 2)) * 2;
      hiza = [6];
      for (var poz = n - 7; hiza.length < adet; poz -= adim) hiza.splice(1, 0, poz);
    }
    for (i = 0; i < hiza.length; i++) for (j = 0; j < hiza.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === hiza.length - 1) || (i === hiza.length - 1 && j === 0)) continue;
      for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) {
        koy(hiza[i] + dx2, hiza[j] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
      }
    }

    function format_ciz(maske) {
      var d = (FORMAT_BITLERI_M << 3) | maske, r = d;
      for (var i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var bits = ((d << 10) | r) ^ 0x5412;
      function bit(i) { return ((bits >>> i) & 1) !== 0; }
      for (i = 0; i <= 5; i++) koy(8, i, bit(i));
      koy(8, 7, bit(6)); koy(8, 8, bit(7)); koy(7, 8, bit(8));
      for (i = 9; i < 15; i++) koy(14 - i, 8, bit(i));
      for (i = 0; i < 8; i++) koy(n - 1 - i, 8, bit(i));
      for (i = 8; i < 15; i++) koy(8, n - 15 + i, bit(i));
      koy(8, n - 8, true);
    }
    format_ciz(0);

    if (surum >= 7) {
      var r = surum;
      for (i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      var vb = (surum << 12) | r;
      for (i = 0; i < 18; i++) {
        var bt = ((vb >>> i) & 1) !== 0, a = n - 11 + i % 3, c = Math.floor(i / 3);
        koy(a, c, bt); koy(c, a, bt);
      }
    }

    // Veri modüllerini zikzak yerleştir
    var ix = 0;
    for (var sag = n - 1; sag >= 1; sag -= 2) {
      if (sag === 6) sag = 5;
      for (var dikey = 0; dikey < n; dikey++) {
        for (j = 0; j < 2; j++) {
          var x = sag - j, yukari = ((sag + 1) & 2) === 0, y = yukari ? n - 1 - dikey : dikey;
          if (!fonk[y][x] && ix < son.length * 8) {
            mod[y][x] = ((son[ix >>> 3] >>> (7 - (ix & 7))) & 1) !== 0;
            ix++;
          }
        }
      }
    }

    function maske_uygula(m) {
      for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
        if (fonk[y][x]) continue;
        var t;
        switch (m) {
          case 0: t = (x + y) % 2 === 0; break;
          case 1: t = y % 2 === 0; break;
          case 2: t = x % 3 === 0; break;
          case 3: t = (x + y) % 3 === 0; break;
          case 4: t = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: t = x * y % 2 + x * y % 3 === 0; break;
          case 6: t = (x * y % 2 + x * y % 3) % 2 === 0; break;
          default: t = ((x + y) % 2 + x * y % 3) % 2 === 0;
        }
        if (t) mod[y][x] = !mod[y][x];
      }
    }

    // Basitleştirilmiş ceza puanı (ardışık aynı renk, 2x2 bloklar, denge)
    function ceza() {
      var p = 0, x, y;
      for (y = 0; y < n; y++) {
        var say = 1, sayd = 1;
        for (x = 1; x < n; x++) {
          if (mod[y][x] === mod[y][x - 1]) { say++; if (say === 5) p += 3; else if (say > 5) p++; } else say = 1;
          if (mod[x][y] === mod[x - 1][y]) { sayd++; if (sayd === 5) p += 3; else if (sayd > 5) p++; } else sayd = 1;
        }
      }
      for (y = 0; y < n - 1; y++) for (x = 0; x < n - 1; x++) {
        var c = mod[y][x];
        if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3;
      }
      // Köşe "göz" desenine benzeyen dizilimler (1011101 + 4 açık) okuyucuları şaşırtır
      var desen1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], desen2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
      function eslesir(al, desen) {
        for (var i = 0; i < 11; i++) if ((al(i) ? 1 : 0) !== desen[i]) return false;
        return true;
      }
      for (y = 0; y < n; y++) for (x = 0; x + 11 <= n; x++) {
        var satir = function (i) { return mod[y][x + i]; };
        var sutun = function (i) { return mod[x + i][y]; };
        if (eslesir(satir, desen1) || eslesir(satir, desen2)) p += 40;
        if (eslesir(sutun, desen1) || eslesir(sutun, desen2)) p += 40;
      }
      var koyu = 0;
      for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (mod[y][x]) koyu++;
      p += Math.floor(Math.abs(koyu * 20 - n * n * 10) / (n * n)) * 10;
      return p;
    }

    var en_iyi = 0, en_dusuk = Infinity;
    for (var m = 0; m < 8; m++) {
      maske_uygula(m); format_ciz(m);
      var c2 = ceza();
      if (c2 < en_dusuk) { en_dusuk = c2; en_iyi = m; }
      maske_uygula(m);
    }
    maske_uygula(en_iyi); format_ciz(en_iyi);
    return { boyut: n, moduller: mod, surum: surum };
  }

  function svg(metin, ayar) {
    ayar = ayar || {};
    var qr = uret(metin), bosluk = 4, n = qr.boyut + bosluk * 2;
    var yol = '';
    for (var y = 0; y < qr.boyut; y++) for (var x = 0; x < qr.boyut; x++) {
      if (qr.moduller[y][x]) yol += 'M' + (x + bosluk) + ',' + (y + bosluk) + 'h1v1h-1z';
    }
    var px = ayar.boyut || 200;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" width="' + px + '" height="' + px +
      '" shape-rendering="crispEdges" role="img" aria-label="' + (ayar.etiket || 'QR kod') + '">' +
      '<rect width="100%" height="100%" fill="' + (ayar.zemin || '#ffffff') + '"/>' +
      '<path d="' + yol + '" fill="' + (ayar.renk || '#000000') + '"/></svg>';
  }

  var api = { uret: uret, svg: svg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else kok.YKQR = api;
})(this);
