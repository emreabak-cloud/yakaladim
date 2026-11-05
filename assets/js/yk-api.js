/* =====================================================================
   YAKALADIM — VERİ VE ÜYELİK KATMANI
   Sayfalar yalnızca window.YK üzerinden konuşur. İki arka uç vardır:
     • supabase : assets/js/yk-config.js doluysa gerçek veritabanı
     • demo     : yapılandırma yoksa, tarayıcı içi (localStorage) taklit
   İkisi de aynı fonksiyonları ve aynı JSON biçimini döndürür;
   demo, supabase/01_sema.sql içindeki kuralların birebir kopyasıdır.
   ===================================================================== */
(function () {
  'use strict';

  var C = window.YK_CONFIG || {};
  var SUPABASE = !!(C.supabaseUrl && C.supabaseAnonKey);
  var YK = window.YK = { mod: SUPABASE ? 'supabase' : 'demo', kullanici: null };

  /* ------------------------------------------------------------------
     Ortak yardımcılar
     ------------------------------------------------------------------ */
  function Hata(mesaj, kod) {
    var e = new Error(mesaj);
    e.kod = kod || '';
    return e;
  }
  YK.Hata = Hata;

  var dinleyiciler = [];
  // Sonradan kaydolan dinleyici de mevcut oturum durumunu hemen alır
  YK.oturumDegisince = function (cb) {
    dinleyiciler.push(cb);
    if (YK.hazir) YK.hazir.then(function () { try { cb(YK.kullanici); } catch (e) { console.error(e); } });
  };
  function yayinla() {
    dinleyiciler.forEach(function (cb) { try { cb(YK.kullanici); } catch (e) { console.error(e); } });
  }

  function depoOku(anahtar) {
    try { return JSON.parse(window.localStorage.getItem(anahtar)); } catch (e) { return null; }
  }
  function depoYaz(anahtar, deger) {
    try {
      if (deger === null) window.localStorage.removeItem(anahtar);
      else window.localStorage.setItem(anahtar, JSON.stringify(deger));
    } catch (e) { /* gizli sekme vb. — bellekte devam */ }
  }

  // Türkiye saatiyle bugün (YYYY-AA-GG) ve bir günün bitiş anı
  function bugun() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
    } catch (e) {
      return new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
    }
  }
  function gunSonu(tarih) { return new Date(Date.parse(tarih + 'T00:00:00+03:00') + 86400000); }
  YK.bugun = bugun;

  function sayi(x) { return x === null || x === undefined || x === '' ? null : Number(x); }

  // Veritabanı satırını sayfaların kullandığı biçime çevir
  function kampanyaUI(r) {
    return {
      id: r.id, baslik: r.baslik, isletme: r.isletme || '', kategori: r.kategori, sehir: r.sehir,
      semt: r.semt || '', adres: r.adres || '', telefon: r.isletme_telefon || '',
      kisa: r.kisa || '', aciklama: r.aciklama || '', kosullar: r.kosullar || [], gorsel: r.gorsel || '',
      eskiFiyat: sayi(r.eski_fiyat), yeniFiyat: sayi(r.yeni_fiyat),
      baslangic: r.baslangic, bitis: r.bitis,
      stok: sayi(r.stok), kalan: sayi(r.kalan),
      kisiBasiLimit: sayi(r.kisi_basi_limit) || 5,
      rezervasyonGerekli: !!r.rezervasyon_gerekli,
      kuponGecerlilikGun: sayi(r.kupon_gecerlilik_gun) || 30,
      odemeTipi: r.odeme_tipi || 'mekanda', link: r.link || '', oneCikan: !!r.one_cikan,
      kuponBedeli: sayi(r.kupon_bedeli) || 0
    };
  }

  YK.durumAdi = function (d) {
    return { aktif: 'Kullanılabilir', kullanildi: 'Kullanıldı', iptal: 'İptal edildi', suresi_doldu: 'Süresi doldu',
      odeme_bekliyor: 'Ödeme bekleniyor', odeme_zaman_asimi: 'Ödeme süresi doldu' }[d] || d;
  };
  YK.rolAdi = function (r) {
    return { musteri: 'Müşteri', isletme: 'İşletme', admin: 'Yönetici' }[r] || r;
  };
  YK.kuponLinki = function (kod) {
    var site = (C.siteUrl || window.location.origin).replace(/\/$/, '');
    return site + '/isletme-paneli.html?kod=' + encodeURIComponent(kod);
  };

  // Geri dönüş adresi yalnızca sitenin kendi sayfası olabilir (açık yönlendirme engeli)
  YK.guvenliDonus = function (adres, varsayilan) {
    if (!adres || !/^[a-z0-9-]+\.html(\?[^#]*)?$/i.test(adres)) return varsayilan || 'hesabim.html';
    return adres;
  };

  /* ==================================================================
     SUPABASE ARKA UCU (bağımlılıksız REST istemcisi)
     ================================================================== */
  function supabaseArkaUc() {
    var URL = C.supabaseUrl.replace(/\/$/, '');
    var KEY = C.supabaseAnonKey;
    var OTURUM = 'yk_oturum';
    var oturum = depoOku(OTURUM);
    var tazeleniyor = null;

    function oturumKaydet(v) {
      if (!v || !v.access_token) { oturum = null; depoYaz(OTURUM, null); return; }
      var bitis = v.expires_at ? Number(v.expires_at) : Math.floor(Date.now() / 1000) + Number(v.expires_in || 3600);
      oturum = { access_token: v.access_token, refresh_token: v.refresh_token, expires_at: bitis };
      depoYaz(OTURUM, oturum);
    }

    function hataCevir(veri, durum) {
      var m = (veri && (veri.message || veri.msg || veri.error_description || veri.error)) || '';
      var kod = (veri && (veri.error_code || veri.code)) || '';
      var cevir = [
        [/invalid login credentials/i, 'E-posta veya şifre hatalı.'],
        [/already registered|already been registered|user_already_exists/i, 'Bu e-posta adresiyle zaten üyelik var. Giriş yapmayı deneyin.'],
        [/email not confirmed/i, 'E-posta adresinizi henüz doğrulamadınız. Gelen kutunuzdaki bağlantıya tıklayın.'],
        [/password should be at least|weak_password|weak password/i, 'Şifre en az 8 karakter olmalı ve tahmin edilmesi zor olmalıdır.'],
        [/unable to validate email|invalid email|email_address_invalid/i, 'Geçerli bir e-posta adresi girin.'],
        [/rate limit|too many/i, 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.'],
        [/same_password|should be different/i, 'Yeni şifre eskisinden farklı olmalıdır.'],
        [/jwt expired|invalid jwt|refresh token/i, 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.'],
        [/permission denied/i, 'Bu işlem için yetkiniz yok.']
      ];
      for (var i = 0; i < cevir.length; i++) if (cevir[i][0].test(m) || cevir[i][0].test(kod)) return Hata(cevir[i][1], kod);
      if (durum === 429) return Hata('Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.', kod);
      if (m) return Hata(m, kod);
      return Hata('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.', kod);
    }

    function hamIstek(yol, ayar) {
      ayar = ayar || {};
      var h = { apikey: KEY, 'Content-Type': 'application/json' };
      if (ayar.token) h.Authorization = 'Bearer ' + ayar.token;
      else if (/^eyJ/.test(KEY)) h.Authorization = 'Bearer ' + KEY;   // eski tip anon anahtarı
      Object.keys(ayar.basliklar || {}).forEach(function (k) { h[k] = ayar.basliklar[k]; });
      return fetch(URL + yol, {
        method: ayar.method || 'GET', headers: h,
        body: ayar.govde === undefined ? undefined : JSON.stringify(ayar.govde)
      }).then(function (r) {
        return r.text().then(function (t) {
          var veri = null;
          try { veri = t ? JSON.parse(t) : null; } catch (e) { veri = { message: t }; }
          if (!r.ok) { var e = hataCevir(veri, r.status); e.durum = r.status; throw e; }
          return veri;
        });
      }, function () { throw Hata('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'); });
    }

    function tazele() {
      if (!oturum || !oturum.refresh_token) return Promise.resolve(null);
      if (!tazeleniyor) {
        tazeleniyor = hamIstek('/auth/v1/token?grant_type=refresh_token', {
          method: 'POST', govde: { refresh_token: oturum.refresh_token }
        }).then(function (v) { oturumKaydet(v); return oturum; }, function () { oturumKaydet(null); return null; })
          .then(function (s) { tazeleniyor = null; return s; });
      }
      return tazeleniyor;
    }

    function gecerliToken() {
      if (!oturum) return Promise.resolve(null);
      if (oturum.expires_at - 60 > Date.now() / 1000) return Promise.resolve(oturum.access_token);
      return tazele().then(function (s) { return s ? s.access_token : null; });
    }

    function istek(yol, ayar) {
      ayar = ayar || {};
      return gecerliToken().then(function (token) {
        ayar.token = token;
        return hamIstek(yol, ayar).catch(function (e) {
          if (e.durum === 401 && token && !ayar.tekrar) {
            ayar.tekrar = true;
            return tazele().then(function (s) {
              if (!s) { YK.kullanici = null; yayinla(); throw Hata('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.'); }
              ayar.token = s.access_token;
              return hamIstek(yol, ayar);
            });
          }
          throw e;
        });
      });
    }
    function rpc(ad, arg) { return istek('/rest/v1/rpc/' + ad, { method: 'POST', govde: arg || {} }); }

    function profilYukle() {
      if (!oturum) { YK.kullanici = null; return Promise.resolve(null); }
      return rpc('profilim').then(function (p) { YK.kullanici = p; return p; },
        function () { YK.kullanici = null; return null; });
    }

    // E-postadaki doğrulama / şifre sıfırlama bağlantısından dönüş (#access_token=...)
    function adresOturumunuIsle() {
      var h = window.location.hash || '';
      if (h.indexOf('access_token=') === -1 && h.indexOf('error=') === -1) return null;
      var p = new URLSearchParams(h.slice(1));
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { /* yok say */ }
      if (p.get('error')) {
        return { tip: 'hata', mesaj: /expired/i.test(p.get('error_code') || p.get('error_description') || '')
          ? 'Bağlantının süresi dolmuş. Lütfen yeni bir bağlantı isteyin.' : 'Bağlantı geçersiz. Lütfen tekrar deneyin.' };
      }
      oturumKaydet({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'),
        expires_at: p.get('expires_at'), expires_in: p.get('expires_in') });
      return { tip: p.get('type') || 'giris' };
    }

    var donus = { site: (C.siteUrl || window.location.origin).replace(/\/$/, '') + '/giris.html' };

    return {
      baslat: function () {
        var bag = adresOturumunuIsle();
        return profilYukle().then(function () { return bag; });
      },
      kayit: function (d) {
        return hamIstek('/auth/v1/signup?redirect_to=' + encodeURIComponent(donus.site), {
          method: 'POST',
          govde: { email: d.eposta, password: d.sifre,
            data: { ad_soyad: d.adSoyad, telefon: d.telefon, kvkk: !!d.kvkk, pazarlama_izni: !!d.pazarlama } }
        }).then(function (v) {
          if (v && v.access_token) { oturumKaydet(v); return profilYukle().then(function () { return { durum: 'giris' }; }); }
          return { durum: 'dogrulama' };
        });
      },
      giris: function (eposta, sifre) {
        return hamIstek('/auth/v1/token?grant_type=password', { method: 'POST', govde: { email: eposta, password: sifre } })
          .then(function (v) { oturumKaydet(v); return profilYukle(); });
      },
      cikis: function () {
        var t = oturum && oturum.access_token;
        oturumKaydet(null); YK.kullanici = null;
        return (t ? hamIstek('/auth/v1/logout', { method: 'POST', token: t }) : Promise.resolve()).catch(function () {});
      },
      sifreSifirla: function (eposta) {
        return hamIstek('/auth/v1/recover?redirect_to=' + encodeURIComponent(donus.site + '?sifre=yeni'), {
          method: 'POST', govde: { email: eposta } });
      },
      yeniSifre: function (sifre) {
        return gecerliToken().then(function (t) {
          if (!t) throw Hata('Şifre değiştirmek için giriş yapmalısınız.');
          return hamIstek('/auth/v1/user', { method: 'PUT', token: t, govde: { password: sifre } });
        });
      },
      profilYukle: profilYukle,
      odemeBaslat: function (siparisNo) {
        return istek('/functions/v1/odeme-baslat', { method: 'POST', govde: { siparis_no: siparisNo } });
      },
      kampanyalar: function () {
        return istek('/rest/v1/kampanya_liste?select=*&order=one_cikan.desc,bitis.asc').then(function (r) {
          return (r || []).map(kampanyaUI);
        });
      },
      rpc: rpc
    };
  }

  /* ==================================================================
     DEMO ARKA UCU (tarayıcı içi). 01_sema.sql'deki kuralları taklit eder.
     ================================================================== */
  function demoArkaUc() {
    var ANAHTAR = 'yk_demo_v3';
    var db = null;

    function uid() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
    function slug(s) {
      return String(s).toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function tohum() {
      var kaynak = (window.KAMPANYALAR || []).concat(window.KAMPANYALAR_EK || []);
      var isletmeler = {}, kampanyalar = [];
      kaynak.forEach(function (k) {
        var anahtar = slug(k.isletme || 'isletme');
        if (!isletmeler[anahtar]) {
          isletmeler[anahtar] = {
            id: 'i-' + anahtar, ad: k.isletme, kategori: k.kategori, sehir: k.sehir, semt: k.semt,
            adres: k.adres || '', telefon: k.telefon || '', eposta: '', web: k.web || '', yetkili: '',
            izin_durumu: k.izinDurumu || 'onaylandi', kaynak: k.kaynak || 'manuel', kaynak_url: k.kaynakUrl || '',
            notlar: k.not || '', aktif: true, olusturma: new Date().toISOString()
          };
        }
        kampanyalar.push({
          id: k.id, isletme_id: isletmeler[anahtar].id, baslik: k.baslik, kategori: k.kategori, sehir: k.sehir,
          semt: k.semt || '', adres: k.adres || '', kisa: k.kisa || '', aciklama: k.aciklama || '',
          kosullar: k.kosullar || [], gorsel: k.gorsel || '', eski_fiyat: k.eskiFiyat === undefined ? null : k.eskiFiyat,
          yeni_fiyat: k.yeniFiyat, baslangic: k.baslangic || '2026-01-01', bitis: k.bitis,
          stok: k.stok === undefined ? null : k.stok, kisi_basi_limit: k.kisiBasiLimit || 5,
          rezervasyon_gerekli: !!k.rezervasyonGerekli, kupon_gecerlilik_gun: k.kuponGecerlilikGun || 30,
          odeme_tipi: k.odemeTipi || 'mekanda', link: k.link || '', one_cikan: !!k.oneCikan,
          kupon_bedeli: k.kuponBedeli === undefined ? null : k.kuponBedeli,
          durum: k.durum || 'yayinda', kaynak: k.kaynak || 'manuel', kaynak_url: k.kaynakUrl || '',
          olusturma: new Date().toISOString(), guncelleme: new Date().toISOString()
        });
      });
      var ilk = kampanyalar[0] ? kampanyalar[0].isletme_id : null;
      var simdi = new Date().toISOString();
      return {
        surum: 3,
        // Demo'da ödeme açık: kupon bedeli ve test ödeme ekranı denenebilir
        ayarlar: { odeme_aktif: true, bedel_oran: 0.01, bedel_min: 5, bedel_max: 50, odeme_suresi_dk: 20 },
        isletmeler: Object.keys(isletmeler).map(function (a) { return isletmeler[a]; }),
        kampanyalar: kampanyalar,
        kullanicilar: [
          { id: 'u-admin', eposta: 'yonetici@demo.yakaladim.com', sifre: 'demo1234' },
          { id: 'u-isletme', eposta: 'isletme@demo.yakaladim.com', sifre: 'demo1234' }
        ],
        profiller: [
          { id: 'u-admin', eposta: 'yonetici@demo.yakaladim.com', ad_soyad: 'Demo Yönetici', telefon: '', rol: 'admin',
            isletme_id: null, pazarlama_izni: false, olusturma: simdi },
          { id: 'u-isletme', eposta: 'isletme@demo.yakaladim.com', ad_soyad: 'Demo Kasiyer', telefon: '', rol: 'isletme',
            isletme_id: ilk, pazarlama_izni: false, olusturma: simdi }
        ],
        kuponlar: [], basvurular: [], oturum: null
      };
    }

    function yukle() {
      if (db) return db;
      var kayitli = depoOku(ANAHTAR);
      db = (kayitli && kayitli.surum === 3) ? kayitli : tohum();
      // Kaynak dosyaya yeni eklenen kampanyaları demo veritabanına da ekle
      var taze = tohum(), varOlan = {};
      db.kampanyalar.forEach(function (k) { varOlan[k.id] = true; });
      taze.kampanyalar.forEach(function (k) {
        if (!varOlan[k.id]) {
          db.kampanyalar.push(k);
          if (!db.isletmeler.some(function (i) { return i.id === k.isletme_id; })) {
            db.isletmeler.push(taze.isletmeler.filter(function (i) { return i.id === k.isletme_id; })[0]);
          }
        }
      });
      kaydet();
      return db;
    }
    function kaydet() { depoYaz(ANAHTAR, db); }

    function benId() { return yukle().oturum; }
    function profil(id) { return yukle().profiller.filter(function (p) { return p.id === id; })[0] || null; }
    function rolum() { var p = profil(benId()); return p ? p.rol : 'misafir'; }
    function yoneticiMi() { return rolum() === 'admin'; }
    function isletmem() { var p = profil(benId()); return p && (p.rol === 'isletme' || p.rol === 'admin') ? p.isletme_id : null; }
    function kampanya(id) { return yukle().kampanyalar.filter(function (k) { return k.id === id; })[0] || null; }
    function isletme(id) { return yukle().isletmeler.filter(function (i) { return i.id === id; })[0] || null; }
    function odemeSuresiMs() { return (yukle().ayarlar.odeme_suresi_dk || 20) * 60000; }
    function stokTutuyor(c) {
      return c.durum === 'aktif' || c.durum === 'kullanildi' ||
        (c.durum === 'odeme_bekliyor' && Date.now() - new Date(c.olusturma) < odemeSuresiMs());
    }
    function satilan(kid) {
      return yukle().kuponlar.reduce(function (s, c) { return s + (c.kampanya_id === kid && stokTutuyor(c) ? c.adet : 0); }, 0);
    }
    function bedelHesapla(k) {
      var a = yukle().ayarlar;
      if (!a.odeme_aktif) return 0;
      if (k.kupon_bedeli !== null && k.kupon_bedeli !== undefined && k.kupon_bedeli !== '') return Number(k.kupon_bedeli);
      return Math.min(a.bedel_max, Math.max(a.bedel_min, Math.round(k.yeni_fiyat * a.bedel_oran)));
    }
    // Kampanyanın işletmesi aktif ve yayın izni onaylanmış mı? (01_sema.sql ile aynı kural)
    function isletmeYayinda(k) {
      var i = isletme(k.isletme_id);
      return !!(i && i.aktif !== false && i.izin_durumu === 'onaylandi');
    }
    function gorunenDurum(c) {
      if (c.durum === 'odeme_bekliyor' && Date.now() - new Date(c.olusturma) >= odemeSuresiMs()) return 'odeme_zaman_asimi';
      return c.durum === 'aktif' && new Date(c.son_kullanma) < new Date() ? 'suresi_doldu' : c.durum;
    }
    function kodUret() {
      var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(8), s = '';
      (window.crypto || window.msCrypto).getRandomValues(b);
      for (var i = 0; i < 8; i++) s += a[b[i] % 32];
      return 'YK-' + s.slice(0, 4) + '-' + s.slice(4);
    }
    function kodNormal(p) {
      var x = String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (x.length === 10 && x.slice(0, 2) === 'YK') return 'YK-' + x.slice(2, 6) + '-' + x.slice(6, 10);
      if (x.length === 8) return 'YK-' + x.slice(0, 4) + '-' + x.slice(4);
      return String(p || '');
    }
    function girisGerekli() { if (!benId()) throw Hata('Kupon almak için giriş yapmalısınız.', '28000'); }
    function isletmeGerekli() {
      var r = rolum();
      if (r !== 'isletme' && r !== 'admin') throw Hata('Bu işlem için işletme hesabı gerekir.', '42501');
    }
    function yoneticiGerekli() { if (!yoneticiMi()) throw Hata('Bu işlem için yönetici yetkisi gerekir.', '42501'); }
    function tl(n) { return Number(n).toLocaleString('tr-TR'); }

    function kuponJson(c) {
      var k = kampanya(c.kampanya_id) || {}, i = isletme(k.isletme_id) || {};
      return {
        id: c.id, kod: c.kod, durum: gorunenDurum(c), adet: c.adet, birim_fiyat: c.birim_fiyat, toplam: c.toplam,
        rezervasyon_tarihi: c.rezervasyon_tarihi, rezervasyon_saati: c.rezervasyon_saati, kisi_sayisi: c.kisi_sayisi,
        musteri_notu: c.musteri_notu, son_kullanma: c.son_kullanma, olusturma: c.olusturma,
        kullanim_zamani: c.kullanim_zamani, iptal_zamani: c.iptal_zamani,
        kupon_bedeli: c.kupon_bedeli || 0, odeme_durumu: c.odeme_durumu || 'yok', siparis_no: c.siparis_no || null,
        odeme_zamani: c.odeme_zamani || null, iade_zamani: c.iade_zamani || null,
        odeme_son: c.durum === 'odeme_bekliyor' ? new Date(new Date(c.olusturma).getTime() + odemeSuresiMs()).toISOString() : null,
        kampanya: {
          id: k.id, baslik: k.baslik, kategori: k.kategori, sehir: k.sehir, semt: k.semt, gorsel: k.gorsel,
          eski_fiyat: k.eski_fiyat, yeni_fiyat: k.yeni_fiyat, kosullar: k.kosullar, odeme_tipi: k.odeme_tipi,
          rezervasyon_gerekli: k.rezervasyon_gerekli, adres: k.adres || i.adres, isletme: i.ad, isletme_telefon: i.telefon
        }
      };
    }
    function isletmeKuponJson(c) {
      var p = profil(c.kullanici_id) || {};
      var j = kuponJson(c);
      j.musteri = { ad_soyad: p.ad_soyad || 'Yakaladım üyesi',
        telefon: c.rezervasyon_tarihi ? (p.telefon || null) : null };
      return j;
    }
    function isletmeKuponBul(kod) {
      isletmeGerekli();
      var c = yukle().kuponlar.filter(function (x) { return x.kod && x.kod === kodNormal(kod); })[0];
      if (!c) throw Hata('Kupon bulunamadı.');
      var k = kampanya(c.kampanya_id);
      if (!yoneticiMi() && (!k || k.isletme_id !== isletmem())) throw Hata('Kupon bulunamadı.');
      return c;
    }

    var R = {
      profilim: function () {
        var p = profil(benId()); if (!p) return null;
        var i = isletme(p.isletme_id);
        return { id: p.id, eposta: p.eposta, ad_soyad: p.ad_soyad, telefon: p.telefon, rol: p.rol,
          isletme_id: p.isletme_id, isletme: i ? i.ad : null, pazarlama_izni: p.pazarlama_izni, olusturma: p.olusturma };
      },
      profil_guncelle: function (a) {
        if (!benId()) throw Hata('Giriş yapmalısınız.');
        var p = profil(benId());
        p.ad_soyad = (a.p_ad_soyad || '').trim().slice(0, 120) || null;
        p.telefon = (a.p_telefon || '').trim().slice(0, 30) || null;
        p.pazarlama_izni = !!a.p_pazarlama_izni;
        kaydet(); return R.profilim();
      },
      kupon_al: function (a) {
        girisGerekli();
        var k = kampanya(a.p_kampanya_id), b = bugun(), adet = a.p_adet == null ? 1 : Number(a.p_adet);
        if (!k || k.durum !== 'yayinda' || !isletmeYayinda(k)) throw Hata('Kampanya bulunamadı veya yayında değil.');
        if (b > k.bitis) throw Hata('Bu kampanyanın süresi doldu.');
        if (b < k.baslangic) throw Hata('Bu kampanya henüz başlamadı.');
        if (k.odeme_tipi === 'online') throw Hata('Bu kampanya online ödeme gerektiriyor; ödeme altyapısı yakında aktif olacak.');
        if (!(adet >= 1 && adet <= k.kisi_basi_limit)) throw Hata('Adet 1 ile ' + k.kisi_basi_limit + ' arasında olmalıdır.');
        var benim = yukle().kuponlar.reduce(function (s, c) {
          return s + (c.kampanya_id === k.id && c.kullanici_id === benId() && stokTutuyor(c) ? c.adet : 0);
        }, 0);
        if (benim + adet > k.kisi_basi_limit) {
          throw Hata('Bu kampanyadan kişi başı en fazla ' + k.kisi_basi_limit + ' kupon alınabilir (şu ana kadar ' + benim + ').');
        }
        if (k.stok !== null && k.stok !== undefined) {
          var s = satilan(k.id);
          if (s + adet > k.stok) throw Hata(k.stok - s <= 0 ? 'Bu kampanyanın kuponları tükendi.' : 'Bu kampanyada yalnızca ' + (k.stok - s) + ' kupon kaldı.');
        }
        var rt = null, rs = null, ks = null;
        if (k.rezervasyon_gerekli) {
          rt = a.p_rezervasyon_tarihi; rs = a.p_rezervasyon_saati;
          if (!rt || !rs) throw Hata('Bu kampanya için rezervasyon tarihi ve saati seçmelisiniz.');
          if (rt < b || rt > k.bitis) {
            throw Hata('Rezervasyon tarihi bugün ile kampanya bitişi (' + k.bitis.split('-').reverse().join('.') + ') arasında olmalıdır.');
          }
          var simdiSaat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
          if (rt === b && rs < simdiSaat) throw Hata('Geçmiş bir saat için rezervasyon yapılamaz.');
          ks = a.p_kisi_sayisi == null ? 1 : Number(a.p_kisi_sayisi);
          if (!(ks >= 1 && ks <= 50)) throw Hata('Kişi sayısı 1 ile 50 arasında olmalıdır.');
          rs = String(rs).slice(0, 5);
        }
        var son = Math.min(gunSonu(k.bitis).getTime(), Date.now() + k.kupon_gecerlilik_gun * 86400000);
        if (rt) son = Math.min(son, gunSonu(rt).getTime());
        var bedel = bedelHesapla(k) * adet;
        var c = {
          id: uid(), kod: bedel > 0 ? null : kodUret(), kampanya_id: k.id, kullanici_id: benId(), adet: adet,
          birim_fiyat: k.yeni_fiyat, toplam: k.yeni_fiyat * adet, durum: bedel > 0 ? 'odeme_bekliyor' : 'aktif',
          kupon_bedeli: bedel, odeme_durumu: bedel > 0 ? 'bekliyor' : 'yok',
          siparis_no: bedel > 0 ? 'YK' + uid().replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 24) : null,
          rezervasyon_tarihi: rt, rezervasyon_saati: rs, kisi_sayisi: ks,
          musteri_notu: (a.p_not || '').trim().slice(0, 500) || null,
          son_kullanma: new Date(son).toISOString(), olusturma: new Date().toISOString(),
          kullanim_zamani: null, kullanan: null, iptal_zamani: null
        };
        yukle().kuponlar.push(c); kaydet();
        return kuponJson(c);
      },
      kuponlarim: function () {
        return yukle().kuponlar.filter(function (c) {
          return c.kullanici_id === benId() && gorunenDurum(c) !== 'odeme_zaman_asimi' &&
            !(c.durum === 'iptal' && c.odeme_durumu === 'basarisiz');
        })
          .sort(function (a, b) { return b.olusturma < a.olusturma ? -1 : 1; }).map(kuponJson);
      },
      kupon_getir: function (a) {
        var c = yukle().kuponlar.filter(function (x) { return x.kod === kodNormal(a.p_kod) && x.kullanici_id === benId(); })[0];
        if (!c) throw Hata('Kupon bulunamadı.');
        return kuponJson(c);
      },
      kupon_iptal: function (a) {
        var c = yukle().kuponlar.filter(function (x) { return x.id === a.p_kupon_id && x.kullanici_id === benId(); })[0];
        if (!c) throw Hata('Kupon bulunamadı.');
        if (c.durum !== 'aktif' && c.durum !== 'odeme_bekliyor') throw Hata('Yalnızca kullanılmamış kuponlar iptal edilebilir.');
        if (c.odeme_durumu === 'bekliyor') c.odeme_durumu = 'basarisiz';
        c.durum = 'iptal'; c.iptal_zamani = new Date().toISOString(); kaydet();
        return kuponJson(c);
      },
      kupon_siparis: function (a) {
        var c = yukle().kuponlar.filter(function (x) { return x.siparis_no === a.p_siparis_no && x.kullanici_id === benId(); })[0];
        if (!c) throw Hata('Sipariş bulunamadı.');
        return kuponJson(c);
      },
      // Yalnızca demo: gerçek modda bu işlemi ödeme sağlayıcısının bildirimi sunucuda yapar
      demo_odeme: function (a) {
        var c = yukle().kuponlar.filter(function (x) { return x.siparis_no === a.p_siparis_no && x.kullanici_id === benId(); })[0];
        if (!c) throw Hata('Sipariş bulunamadı.');
        if (c.odeme_durumu === 'odendi') return kuponJson(c);
        if (a.p_basarili) {
          c.kod = kodUret(); c.durum = 'aktif'; c.odeme_durumu = 'odendi'; c.odeme_zamani = new Date().toISOString();
          c.odeme_saglayici = 'demo'; c.iptal_zamani = null;
        } else if (c.durum === 'odeme_bekliyor') {
          c.durum = 'iptal'; c.odeme_durumu = 'basarisiz'; c.iptal_zamani = new Date().toISOString();
        }
        kaydet(); return kuponJson(c);
      },
      basvuru_gonder: function (a) {
        if (['genel', 'isletme', 'bulten'].indexOf(a.p_tip) === -1) throw Hata('Geçersiz form.');
        if (JSON.stringify(a.p_veri || {}).length > 5000) throw Hata('Form verisi geçersiz veya çok uzun.');
        yukle().basvurular.push({ id: uid(), tip: a.p_tip, veri: a.p_veri, durum: 'yeni', kullanici_id: benId(), olusturma: new Date().toISOString() });
        kaydet(); return true;
      },
      kupon_sorgula: function (a) { return isletmeKuponJson(isletmeKuponBul(a.p_kod)); },
      kupon_kullan: function (a) {
        var c = isletmeKuponBul(a.p_kod);
        if (c.durum === 'kullanildi') {
          throw Hata('Bu kupon ' + new Date(c.kullanim_zamani).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) + ' tarihinde zaten kullanılmış.');
        }
        if (c.durum === 'iptal') throw Hata('Bu kupon müşteri tarafından iptal edilmiş.');
        if (new Date(c.son_kullanma) < new Date()) throw Hata('Bu kuponun süresi dolmuş.');
        c.durum = 'kullanildi'; c.kullanim_zamani = new Date().toISOString(); c.kullanan = benId(); kaydet();
        return isletmeKuponJson(c);
      },
      isletme_kuponlari: function () {
        isletmeGerekli();
        var isl = isletmem(), hepsi = yoneticiMi() && !isl;
        var liste = yukle().kuponlar.filter(function (c) {
          var k = kampanya(c.kampanya_id); return c.kod && (hepsi || (k && k.isletme_id === isl));
        }).sort(function (a, b) { return b.olusturma < a.olusturma ? -1 : 1; });
        var simdi = new Date(), b = bugun();
        return {
          isletme: isl ? (isletme(isl) || {}).ad : null,
          ozet: {
            aktif: liste.filter(function (c) { return c.durum === 'aktif' && new Date(c.son_kullanma) >= simdi; }).length,
            kullanildi: liste.filter(function (c) { return c.durum === 'kullanildi'; }).length,
            bugun_rezervasyon: liste.filter(function (c) { return c.durum === 'aktif' && c.rezervasyon_tarihi === b; }).length,
            tahsil_edilen: liste.filter(function (c) { return c.durum === 'kullanildi'; }).reduce(function (s, c) { return s + c.toplam; }, 0)
          },
          kuponlar: liste.slice(0, 200).map(isletmeKuponJson)
        };
      },
      yonetim_ozet: function () {
        yoneticiGerekli(); var d = yukle(), b = bugun();
        return {
          kampanya_yayinda: d.kampanyalar.filter(function (k) { return k.durum === 'yayinda' && k.bitis >= b; }).length,
          kampanya_taslak: d.kampanyalar.filter(function (k) { return k.durum === 'taslak'; }).length,
          isletme: d.isletmeler.length,
          izin_bekleyen: d.isletmeler.filter(function (i) { return i.izin_durumu === 'bekliyor' || i.izin_durumu === 'gorusuldu'; }).length,
          uye: d.profiller.length, kupon_toplam: d.kuponlar.length,
          kupon_kullanildi: d.kuponlar.filter(function (c) { return c.durum === 'kullanildi'; }).length,
          ciro_kullanilan: d.kuponlar.filter(function (c) { return c.durum === 'kullanildi'; }).reduce(function (s, c) { return s + c.toplam; }, 0),
          basvuru_yeni: d.basvurular.filter(function (x) { return x.durum === 'yeni'; }).length,
          kupon_geliri: d.kuponlar.filter(function (c) { return c.odeme_durumu === 'odendi'; }).reduce(function (s, c) { return s + c.kupon_bedeli; }, 0),
          iade_toplam: d.kuponlar.filter(function (c) { return c.odeme_durumu === 'iade'; }).reduce(function (s, c) { return s + c.kupon_bedeli; }, 0),
          odeme_bekleyen: d.kuponlar.filter(function (c) { return c.durum === 'odeme_bekliyor' && stokTutuyor(c); }).length,
          odeme_aktif: d.ayarlar.odeme_aktif
        };
      },
      yonetim_kampanyalar: function () {
        yoneticiGerekli();
        return yukle().kampanyalar.map(function (k) {
          var i = isletme(k.isletme_id) || {}, o = JSON.parse(JSON.stringify(k));
          o.isletme = i.ad; o.izin_durumu = i.izin_durumu; o.satilan = satilan(k.id);
          o.hesaplanan_bedel = bedelHesapla(k);
          o.kupon_geliri = yukle().kuponlar.filter(function (c) { return c.kampanya_id === k.id && c.odeme_durumu === 'odendi'; })
            .reduce(function (s, c) { return s + c.kupon_bedeli; }, 0);
          o.kullanilan = yukle().kuponlar.filter(function (c) { return c.kampanya_id === k.id && c.durum === 'kullanildi'; }).length;
          return o;
        }).sort(function (a, b) { return b.guncelleme < a.guncelleme ? -1 : 1; });
      },
      yonetim_kampanya_kaydet: function (a) {
        yoneticiGerekli();
        var p = a.p, id = String(p.id || '').trim().toLowerCase();
        if (!id) throw Hata('Kampanya kimliği (id) zorunludur.');
        if (!/^[a-z0-9][a-z0-9-]{1,80}$/.test(id)) throw Hata('Kampanya kimliği yalnızca küçük harf, rakam ve tire içerebilir.');
        var eski = sayi(p.eski_fiyat), yeni = sayi(p.yeni_fiyat);
        if (yeni === null || isNaN(yeni) || yeni < 0) throw Hata('İndirimli fiyat geçerli bir sayı olmalıdır.');
        if (eski !== null && yeni > eski) throw Hata('İndirimli fiyat normal fiyattan büyük olamaz.');
        if (!p.bitis) throw Hata('Bitiş tarihi zorunludur.');
        if (!p.baslik || String(p.baslik).length < 3) throw Hata('Başlık en az 3 karakter olmalıdır.');
        var d = yukle(), k = kampanya(id), simdi = new Date().toISOString();
        var yeniK = {
          id: id, isletme_id: p.isletme_id || null, baslik: p.baslik, kategori: p.kategori, sehir: p.sehir,
          semt: p.semt || '', adres: p.adres || '', kisa: p.kisa || '', aciklama: p.aciklama || '',
          kosullar: (p.kosullar || []).filter(function (x) { return String(x).trim(); }), gorsel: p.gorsel || '',
          eski_fiyat: eski, yeni_fiyat: yeni, baslangic: p.baslangic || bugun(), bitis: p.bitis,
          stok: sayi(p.stok), kisi_basi_limit: sayi(p.kisi_basi_limit) || 5, rezervasyon_gerekli: !!p.rezervasyon_gerekli,
          kupon_gecerlilik_gun: sayi(p.kupon_gecerlilik_gun) || 30, odeme_tipi: p.odeme_tipi || 'mekanda',
          link: p.link || '', one_cikan: !!p.one_cikan, durum: p.durum || 'taslak',
          kupon_bedeli: p.kupon_bedeli === '' || p.kupon_bedeli === undefined || p.kupon_bedeli === null ? null : Number(p.kupon_bedeli),
          kaynak: p.kaynak || (k && k.kaynak) || 'manuel', kaynak_url: p.kaynak_url || (k && k.kaynak_url) || '',
          olusturma: k ? k.olusturma : simdi, guncelleme: simdi
        };
        if (k) d.kampanyalar[d.kampanyalar.indexOf(k)] = yeniK; else d.kampanyalar.push(yeniK);
        kaydet(); return yeniK;
      },
      yonetim_kampanya_durum: function (a) {
        yoneticiGerekli(); var k = kampanya(a.p_id);
        if (!k) throw Hata('Kampanya bulunamadı.');
        k.durum = a.p_durum; k.guncelleme = new Date().toISOString(); kaydet(); return k;
      },
      yonetim_isletmeler: function () {
        yoneticiGerekli(); var d = yukle();
        return d.isletmeler.map(function (i) {
          var o = JSON.parse(JSON.stringify(i));
          o.kampanya_sayisi = d.kampanyalar.filter(function (k) { return k.isletme_id === i.id; }).length;
          o.kullanici_sayisi = d.profiller.filter(function (p) { return p.isletme_id === i.id; }).length;
          return o;
        }).sort(function (a, b) { return a.ad.localeCompare(b.ad, 'tr'); });
      },
      yonetim_isletme_kaydet: function (a) {
        yoneticiGerekli(); var p = a.p, d = yukle(), i = p.id ? isletme(p.id) : null;
        if (!p.ad || String(p.ad).length < 2) throw Hata('İşletme adı zorunludur.');
        if (p.id && !i) throw Hata('İşletme bulunamadı.');
        if (!i) { i = { id: uid(), olusturma: new Date().toISOString(), kaynak: p.kaynak || 'manuel', kaynak_url: p.kaynak_url || '', aktif: true }; d.isletmeler.push(i); }
        ['ad', 'kategori', 'sehir', 'semt', 'adres', 'telefon', 'eposta', 'web', 'yetkili', 'notlar'].forEach(function (f) { i[f] = p[f] || ''; });
        i.izin_durumu = p.izin_durumu || i.izin_durumu || 'onaylandi';
        if (p.aktif !== undefined) i.aktif = !!p.aktif;
        kaydet(); return i;
      },
      yonetim_kuponlar: function () {
        yoneticiGerekli();
        return yukle().kuponlar.slice().sort(function (a, b) { return b.olusturma < a.olusturma ? -1 : 1; }).map(function (c) {
          var j = isletmeKuponJson(c); j.musteri_eposta = (profil(c.kullanici_id) || {}).eposta; return j;
        });
      },
      yonetim_kullanicilar: function (a) {
        yoneticiGerekli(); var s = String(a.p_arama || '').toLocaleLowerCase('tr-TR');
        return yukle().profiller.filter(function (p) {
          return !s || String(p.eposta).toLocaleLowerCase('tr-TR').indexOf(s) > -1 || String(p.ad_soyad || '').toLocaleLowerCase('tr-TR').indexOf(s) > -1;
        }).map(function (p) {
          return { id: p.id, eposta: p.eposta, ad_soyad: p.ad_soyad, telefon: p.telefon, rol: p.rol, isletme_id: p.isletme_id,
            isletme: (isletme(p.isletme_id) || {}).ad || null, olusturma: p.olusturma,
            kupon_sayisi: yukle().kuponlar.filter(function (c) { return c.kullanici_id === p.id; }).length };
        });
      },
      yonetim_kullanici_rol: function (a) {
        yoneticiGerekli();
        if (['musteri', 'isletme', 'admin'].indexOf(a.p_rol) === -1) throw Hata('Geçersiz rol.');
        if (a.p_rol === 'isletme' && !a.p_isletme) throw Hata('İşletme kullanıcısı için bir işletme seçmelisiniz.');
        if (a.p_kullanici === benId() && a.p_rol !== 'admin') throw Hata('Kendi yönetici yetkinizi kaldıramazsınız.');
        var p = profil(a.p_kullanici); if (!p) throw Hata('Kullanıcı bulunamadı.');
        p.rol = a.p_rol; p.isletme_id = a.p_rol === 'musteri' ? null : (a.p_isletme || null); kaydet();
        return { ok: true };
      },
      yonetim_ayarlar: function () { yoneticiGerekli(); return JSON.parse(JSON.stringify(yukle().ayarlar)); },
      yonetim_ayar_kaydet: function (a) {
        yoneticiGerekli(); var x = yukle().ayarlar, p = a.p || {};
        if (p.odeme_aktif !== undefined) x.odeme_aktif = !!p.odeme_aktif;
        ['bedel_oran', 'bedel_min', 'bedel_max', 'odeme_suresi_dk'].forEach(function (f) {
          if (p[f] !== undefined && p[f] !== '') x[f] = Number(p[f]);
        });
        kaydet(); return JSON.parse(JSON.stringify(x));
      },
      yonetim_kupon_iade: function (a) {
        yoneticiGerekli();
        var c = yukle().kuponlar.filter(function (x) { return x.id === a.p_kupon_id; })[0];
        if (!c) throw Hata('Kupon bulunamadı.');
        if (c.odeme_durumu !== 'odendi') throw Hata('Yalnızca ödenmiş kupon bedeli iade edilebilir.');
        c.odeme_durumu = 'iade'; c.iade_zamani = new Date().toISOString(); c.iade_notu = (a.p_not || '').slice(0, 500);
        if (c.durum === 'aktif') { c.durum = 'iptal'; c.iptal_zamani = new Date().toISOString(); }
        kaydet(); return kuponJson(c);
      },
      yonetim_basvurular: function () {
        yoneticiGerekli();
        return yukle().basvurular.slice().sort(function (a, b) { return b.olusturma < a.olusturma ? -1 : 1; });
      },
      yonetim_basvuru_durum: function (a) {
        yoneticiGerekli(); var b = yukle().basvurular.filter(function (x) { return x.id === a.p_id; })[0];
        if (b) { b.durum = a.p_durum; kaydet(); } return !!b;
      }
    };

    function profilYukle() { YK.kullanici = R.profilim(); return Promise.resolve(YK.kullanici); }

    return {
      baslat: function () { yukle(); return profilYukle().then(function () { return null; }); },
      kayit: function (d) {
        var v = yukle(), e = String(d.eposta || '').trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return Promise.reject(Hata('Geçerli bir e-posta adresi girin.'));
        if (String(d.sifre || '').length < 8) return Promise.reject(Hata('Şifre en az 8 karakter olmalı ve tahmin edilmesi zor olmalıdır.'));
        if (v.kullanicilar.some(function (u) { return u.eposta === e; })) return Promise.reject(Hata('Bu e-posta adresiyle zaten üyelik var. Giriş yapmayı deneyin.'));
        var id = uid();
        v.kullanicilar.push({ id: id, eposta: e, sifre: d.sifre });
        v.profiller.push({ id: id, eposta: e, ad_soyad: (d.adSoyad || '').trim() || null, telefon: (d.telefon || '').trim() || null,
          rol: 'musteri', isletme_id: null, kvkk_onay: d.kvkk ? new Date().toISOString() : null,
          pazarlama_izni: !!d.pazarlama, olusturma: new Date().toISOString() });
        v.oturum = id; kaydet();
        return profilYukle().then(function () { return { durum: 'giris' }; });
      },
      giris: function (eposta, sifre) {
        var v = yukle(), e = String(eposta || '').trim().toLowerCase();
        var u = v.kullanicilar.filter(function (x) { return x.eposta === e && x.sifre === sifre; })[0];
        if (!u) return Promise.reject(Hata('E-posta veya şifre hatalı.'));
        v.oturum = u.id; kaydet(); return profilYukle();
      },
      cikis: function () { yukle().oturum = null; kaydet(); YK.kullanici = null; return Promise.resolve(); },
      sifreSifirla: function () { return Promise.resolve({ demo: true }); },
      yeniSifre: function (sifre) {
        if (!benId()) return Promise.reject(Hata('Şifre değiştirmek için giriş yapmalısınız.'));
        if (String(sifre || '').length < 8) return Promise.reject(Hata('Şifre en az 8 karakter olmalı ve tahmin edilmesi zor olmalıdır.'));
        yukle().kullanicilar.forEach(function (u) { if (u.id === benId()) u.sifre = sifre; }); kaydet();
        return Promise.resolve({});
      },
      profilYukle: profilYukle,
      kampanyalar: function () {
        var d = yukle(), b = bugun();
        var liste = d.kampanyalar.filter(function (k) { return k.durum === 'yayinda' && k.bitis >= b && k.baslangic <= b && isletmeYayinda(k); })
          .map(function (k) {
            var i = isletme(k.isletme_id) || {};
            var r = JSON.parse(JSON.stringify(k));
            r.isletme = i.ad; r.isletme_telefon = i.telefon; r.adres = k.adres || i.adres;
            r.kalan = k.stok === null || k.stok === undefined ? null : Math.max(k.stok - satilan(k.id), 0);
            r.kupon_bedeli = bedelHesapla(k);
            return r;
          });
        return Promise.resolve(liste.map(kampanyaUI));
      },
      odemeBaslat: function () { return Promise.resolve({ tip: 'demo' }); },
      rpc: function (ad, arg) {
        try {
          if (!R[ad]) throw Hata('Bilinmeyen işlem: ' + ad);
          return Promise.resolve(R[ad](arg || {}));
        } catch (e) { return Promise.reject(e); }
      },
      sifirla: function () { db = tohum(); kaydet(); }
    };
  }

  /* ==================================================================
     ORTAK ARAYÜZ — sayfalar yalnızca bunları kullanır
     ================================================================== */
  var AU = SUPABASE ? supabaseArkaUc() : demoArkaUc();
  var kampanyaOnbellek = null;

  function guncelle(p) { YK.kullanici = p || null; yayinla(); return YK.kullanici; }

  YK.hazir = AU.baslat().then(function (bag) { yayinla(); return bag; }, function (e) {
    console.error(e); yayinla(); return null;
  });

  YK.auth = {
    kayit: function (d) { return AU.kayit(d).then(function (r) { yayinla(); return r; }); },
    giris: function (e, s) { return AU.giris(e, s).then(guncelle); },
    cikis: function () { return AU.cikis().then(function () { return guncelle(null); }); },
    sifreSifirla: AU.sifreSifirla,
    yeniSifre: AU.yeniSifre,
    yenile: function () { return AU.profilYukle().then(guncelle); }
  };

  YK.kampanyalar = function (taze) {
    if (!kampanyaOnbellek || taze) kampanyaOnbellek = AU.kampanyalar();
    return kampanyaOnbellek;
  };
  YK.kampanya = function (id) {
    return YK.kampanyalar().then(function (l) { return l.filter(function (k) { return k.id === id; })[0] || null; });
  };

  YK.kupon = {
    al: function (d) {
      return AU.rpc('kupon_al', {
        p_kampanya_id: d.kampanyaId, p_adet: d.adet || 1,
        p_rezervasyon_tarihi: d.tarih || null, p_rezervasyon_saati: d.saat || null,
        p_kisi_sayisi: d.kisi || null, p_not: d.not || null
      }).then(function (r) { kampanyaOnbellek = null; return r; });
    },
    listem: function () { return AU.rpc('kuponlarim'); },
    getir: function (kod) { return AU.rpc('kupon_getir', { p_kod: kod }); },
    siparis: function (no) { return AU.rpc('kupon_siparis', { p_siparis_no: no }); },
    iptal: function (id) { return AU.rpc('kupon_iptal', { p_kupon_id: id }).then(function (r) { kampanyaOnbellek = null; return r; }); }
  };

  YK.odeme = {
    baslat: function (siparisNo) { return AU.odemeBaslat(siparisNo); },
    // Yalnızca demo modunda: test ödemesini tamamla / başarısız say
    demo: function (siparisNo, basarili) {
      if (YK.mod !== 'demo') return Promise.reject(Hata('Test ödemesi yalnızca demo modunda kullanılabilir.'));
      return AU.rpc('demo_odeme', { p_siparis_no: siparisNo, p_basarili: !!basarili });
    }
  };

  YK.profil = {
    guncelle: function (d) {
      return AU.rpc('profil_guncelle', { p_ad_soyad: d.adSoyad, p_telefon: d.telefon, p_pazarlama_izni: !!d.pazarlama })
        .then(guncelle);
    }
  };

  YK.isletme = {
    sorgula: function (kod) { return AU.rpc('kupon_sorgula', { p_kod: kod }); },
    kullan: function (kod) { return AU.rpc('kupon_kullan', { p_kod: kod }); },
    kuponlar: function () { return AU.rpc('isletme_kuponlari', { p_limit: 200 }); }
  };

  YK.yonetim = {
    ozet: function () { return AU.rpc('yonetim_ozet'); },
    kampanyalar: function () { return AU.rpc('yonetim_kampanyalar'); },
    kampanyaKaydet: function (p) { return AU.rpc('yonetim_kampanya_kaydet', { p: p }).then(function (r) { kampanyaOnbellek = null; return r; }); },
    kampanyaDurum: function (id, durum) { return AU.rpc('yonetim_kampanya_durum', { p_id: id, p_durum: durum }).then(function (r) { kampanyaOnbellek = null; return r; }); },
    isletmeler: function () { return AU.rpc('yonetim_isletmeler'); },
    isletmeKaydet: function (p) { return AU.rpc('yonetim_isletme_kaydet', { p: p }); },
    kuponlar: function () { return AU.rpc('yonetim_kuponlar', { p_limit: 300 }); },
    kullanicilar: function (arama) { return AU.rpc('yonetim_kullanicilar', { p_arama: arama || null }); },
    kullaniciRol: function (id, rol, isletmeId) {
      return AU.rpc('yonetim_kullanici_rol', { p_kullanici: id, p_rol: rol, p_isletme: isletmeId || null });
    },
    basvurular: function () { return AU.rpc('yonetim_basvurular'); },
    ayarlar: function () { return AU.rpc('yonetim_ayarlar'); },
    ayarKaydet: function (p) { return AU.rpc('yonetim_ayar_kaydet', { p: p }).then(function (r) { kampanyaOnbellek = null; return r; }); },
    kuponIade: function (id, not) { return AU.rpc('yonetim_kupon_iade', { p_kupon_id: id, p_not: not || '' }); },
    basvuruDurum: function (id, durum) { return AU.rpc('yonetim_basvuru_durum', { p_id: id, p_durum: durum }); }
  };

  YK.basvuru = function (tip, veri) { return AU.rpc('basvuru_gonder', { p_tip: tip, p_veri: veri }); };
  YK.demoSifirla = AU.sifirla || function () {};
})();
