#!/usr/bin/env python3
"""
01_sema.sql için senaryo testleri (yerel PostgreSQL üzerinde).
Kullanım:  python3 supabase/test/test_sema.py  [psql bağlantı argümanları]
Her sorgu, Supabase'deki gibi 'anon' veya 'authenticated' rolüyle ve
JWT 'sub' bilgisiyle ayrı bir oturumda çalıştırılır.
"""
import json
import subprocess
import sys
import uuid

PSQL = ["psql", "-h", "/var/tmp/ykpg", "-p", "5433", "-U", "postgres", "-d", "yk", "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1"]
if len(sys.argv) > 1:
    PSQL = ["psql"] + sys.argv[1:] + ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1"]

GECTI = 0
KALDI = []


def q(sql, kim=None):
    """kim: None = süper kullanıcı, 'anon', ya da kullanıcı uuid'i (authenticated)."""
    on = ""
    if kim == "anon":
        on = "set role anon; "
    elif kim == "servis":
        on = "set role service_role; "
    elif kim:
        on = ("set role authenticated; select set_config('request.jwt.claims', "
              f"'{json.dumps({'sub': kim, 'role': 'authenticated'})}', false) \\g /dev/null\n")
    r = subprocess.run(PSQL, input=on + sql, capture_output=True, text=True)
    if r.returncode != 0:
        return False, r.stderr.strip().split("ERROR:")[-1].strip().split("\n")[0]
    return True, r.stdout.strip()


def j(sql, kim=None):
    ok, out = q(sql, kim)
    if not ok:
        raise AssertionError(f"Beklenmeyen hata: {out}\nSQL: {sql}")
    return json.loads(out) if out else None


def bekle(ad, kosul, detay=""):
    global GECTI
    if kosul:
        GECTI += 1
        print(f"  ✓ {ad}")
    else:
        KALDI.append(ad)
        print(f"  ✗ {ad}  {detay}")


def hata_bekle(ad, sql, kim, icerik):
    ok, out = q(sql, kim)
    bekle(ad, (not ok) and icerik.lower() in out.lower(), f"→ {'BAŞARILI oldu' if ok else out}")


def basari_bekle(ad, sql, kim):
    ok, out = q(sql, kim)
    bekle(ad, ok, f"→ {out}")
    return out


# --------------------------------------------------------------- KURULUM
print("Kurulum")
q("truncate public.kuponlar, public.basvurular, public.kampanyalar, public.isletmeler cascade; delete from auth.users;")

ADMIN, ISL_A, ISL_B, M1, M2 = (str(uuid.uuid4()) for _ in range(5))
for uid, eposta, ad in [(ADMIN, "admin@test.tr", "Yönetici"), (ISL_A, "a@test.tr", "A Kasiyer"),
                        (ISL_B, "b@test.tr", "B Kasiyer"), (M1, "m1@test.tr", "Ayşe Yılmaz"),
                        (M2, "m2@test.tr", "")]:
    meta = json.dumps({"ad_soyad": ad, "telefon": "0555 000 00 00", "kvkk": True})
    q(f"insert into auth.users (id, email, raw_user_meta_data) values ('{uid}', '{eposta}', '{meta}');")

bekle("üyelikte profil otomatik oluşur", q("select count(*) from public.profiller")[1] == "5")
bekle("kvkk onayı kaydedilir", q(f"select kvkk_onay is not null from public.profiller where id='{M1}'")[1] == "t")

A = q("insert into public.isletmeler (ad, telefon) values ('Moda Burger', '0216 111') returning id")[1]
B = q("insert into public.isletmeler (ad, telefon, adres) values ('Sahil Otel', '0212 222', 'Sahil Cad. 1') returning id")[1]
q(f"update public.profiller set rol='admin' where id='{ADMIN}';"
  f"update public.profiller set rol='isletme', isletme_id='{A}' where id='{ISL_A}';"
  f"update public.profiller set rol='isletme', isletme_id='{B}' where id='{ISL_B}';")

q(f"""insert into public.kampanyalar (id, isletme_id, baslik, kategori, sehir, eski_fiyat, yeni_fiyat, bitis, stok, kisi_basi_limit)
      values ('burger', '{A}', 'Burger Menü', 'restoran', 'istanbul', 500, 300, current_date + 10, 3, 2);
     insert into public.kampanyalar (id, isletme_id, baslik, kategori, sehir, eski_fiyat, yeni_fiyat, bitis, rezervasyon_gerekli)
      values ('otel', '{B}', 'Otel Gecesi', 'otel', 'istanbul', 3000, 2000, current_date + 30, true);
     insert into public.kampanyalar (id, isletme_id, baslik, kategori, sehir, yeni_fiyat, bitis, durum)
      values ('taslak', '{A}', 'Taslak Kampanya', 'restoran', 'istanbul', 100, current_date + 10, 'taslak');
     insert into public.kampanyalar (id, isletme_id, baslik, kategori, sehir, yeni_fiyat, baslangic, bitis)
      values ('eski', '{A}', 'Biten Kampanya', 'restoran', 'istanbul', 100, current_date - 20, current_date - 2);
     insert into public.kampanyalar (id, isletme_id, baslik, kategori, sehir, yeni_fiyat, bitis, odeme_tipi)
      values ('online', '{A}', 'Online Ödemeli', 'urun', 'online', 100, current_date + 10, 'online');""")

# --------------------------------------------------------------- ZİYARETÇİ
print("\nZiyaretçi (anon)")
liste = j("select json_agg(id order by id) from public.kampanya_liste", "anon")
bekle("yalnızca yayında ve süresi geçmemiş kampanyalar görünür", liste == ["burger", "online", "otel"], liste)
kalan = j("select json_agg(json_build_object('id', id, 'kalan', kalan, 'isletme', isletme)) from public.kampanya_liste where id='burger'", "anon")
bekle("kalan stok ve işletme adı listede", kalan[0]["kalan"] == 3 and kalan[0]["isletme"] == "Moda Burger", kalan)
hata_bekle("ziyaretçi kupon tablosunu okuyamaz", "select * from public.kuponlar", "anon", "permission denied")
hata_bekle("ziyaretçi işletme tablosunu okuyamaz", "select * from public.isletmeler", "anon", "permission denied")
hata_bekle("ziyaretçi kupon alamaz", "select public.kupon_al('burger')", "anon", "permission denied")
hata_bekle("ziyaretçi kampanya ekleyemez", "insert into public.kampanyalar (id, baslik, kategori, sehir, yeni_fiyat, bitis) values ('x1','xxx','a','b',1,current_date)", "anon", "permission denied")
hata_bekle("ziyaretçi kampanya tablosunu doğrudan okuyamaz (taslak/kaynak sızmaz)", "select * from public.kampanyalar", "anon", "permission denied")
hata_bekle("görünüme yazılamaz", "delete from public.kampanya_liste", "anon", "kampanya_liste")
basari_bekle("ziyaretçi iletişim formu gönderebilir", "select public.basvuru_gonder('genel', '{\"ad\":\"Ali\",\"mesaj\":\"Merhaba\"}')", "anon")
hata_bekle("başvurular ziyaretçiye kapalı", "select * from public.basvurular", "anon", "permission denied")
hata_bekle("çok uzun form reddedilir", "select public.basvuru_gonder('genel', jsonb_build_object('m', repeat('x', 6000)))", "anon", "çok uzun")

# --------------------------------------------------------------- MÜŞTERİ
print("\nMüşteri: kupon alma")
k1 = j("select public.kupon_al('burger', 2)", M1)
bekle("kupon alınır, kod biçimi YK-XXXX-XXXX", k1 and len(k1["kod"]) == 12 and k1["kod"].startswith("YK-"), k1)
bekle("toplam tutar = birim × adet", float(k1["toplam"]) == 600.0, k1["toplam"])
bekle("kupon aktif ve işletme bilgisi dolu", k1["durum"] == "aktif" and k1["kampanya"]["isletme"] == "Moda Burger")
hata_bekle("kişi başı limit aşılamaz", "select public.kupon_al('burger', 1)", M1, "kişi başı en fazla 2")
hata_bekle("stok aşılırsa kalan söylenir", "select public.kupon_al('burger', 2)", M2, "yalnızca 1 kupon kaldı")
k2 = j("select public.kupon_al('burger', 1)", M2)
bekle("son kupon alınabilir", k2["durum"] == "aktif")
hata_bekle("stok bitince tükendi denir", "select public.kupon_al('burger', 1)", ADMIN, "tükendi")
kalan = j("select kalan from public.kampanya_liste where id='burger'", "anon")
bekle("listede kalan 0 görünür", kalan == 0, kalan)
hata_bekle("taslak kampanyadan kupon alınamaz", "select public.kupon_al('taslak')", M1, "yayında değil")
hata_bekle("süresi dolan kampanyadan kupon alınamaz", "select public.kupon_al('eski')", M1, "süresi doldu")
hata_bekle("online ödemeli kampanya şimdilik kapalı", "select public.kupon_al('online')", M1, "online ödeme")
hata_bekle("olmayan kampanya", "select public.kupon_al('yok-boyle')", M1, "bulunamadı")
hata_bekle("adet 0 olamaz", "select public.kupon_al('otel', 0, current_date + 1, '20:00', 2)", M1, "Adet 1 ile")

print("\nMüşteri: rezervasyon")
hata_bekle("rezervasyonlu kampanyada tarih zorunlu", "select public.kupon_al('otel')", M1, "rezervasyon tarihi ve saati")
hata_bekle("geçmiş tarih reddedilir", "select public.kupon_al('otel', 1, current_date - 1, '20:00', 2)", M1, "arasında olmalıdır")
hata_bekle("kampanya bitişinden sonrası reddedilir", "select public.kupon_al('otel', 1, current_date + 40, '20:00', 2)", M1, "arasında olmalıdır")
r = j("select public.kupon_al('otel', 1, current_date + 3, '20:30', 2, 'Deniz manzaralı olursa sevinirim')", M1)
bekle("rezervasyonlu kupon alınır", r["rezervasyon_saati"] == "20:30" and r["kisi_sayisi"] == 2, r)
son = q(f"select (son_kullanma = public.gun_sonu(current_date + 3))::text from public.kuponlar where kod='{r['kod']}'")[1]
bekle("rezervasyonlu kupon rezervasyon gününün sonuna kadar geçerli", son == "true", son)

print("\nMüşteri: gizlilik")
hata_bekle("müşteri kupon tablosunu doğrudan okuyamaz", "select count(*) from public.kuponlar", M1, "permission denied")
bekle("kuponlarim() yalnızca kendi kuponları", len(j("select public.kuponlarim()", M1)) == 2)
hata_bekle("başkasının kuponu getirilemez", f"select public.kupon_getir('{k2['kod']}')", M1, "bulunamadı")
bekle("kendi kuponu getirilir (küçük harf/boşlukla bile)", j(f"select public.kupon_getir(lower(replace('{k1['kod']}', '-', ' ')))", M1)["kod"] == k1["kod"])
hata_bekle("müşteri tabloya doğrudan kupon yazamaz",
           f"insert into public.kuponlar (kod, kampanya_id, kullanici_id, birim_fiyat, toplam, son_kullanma) values ('YK-HACK-HACK','burger','{M1}',0,0,now()+interval '1 day')",
           M1, "permission denied")
hata_bekle("müşteri kendini yönetici yapamaz", f"update public.profiller set rol='admin' where id='{M1}'", M1, "permission denied")
hata_bekle("müşteri kuponunu kullanıldı yapamaz (tablo)", f"update public.kuponlar set durum='kullanildi' where kod='{k1['kod']}'", M1, "permission denied")
hata_bekle("müşteri işletme fonksiyonunu çağıramaz", f"select public.kupon_sorgula('{k1['kod']}')", M1, "işletme hesabı")
hata_bekle("müşteri yönetim fonksiyonunu çağıramaz", "select public.yonetim_ozet()", M1, "yönetici yetkisi")
hata_bekle("müşteri iç fonksiyonu çağıramaz", "select public.kupon_json(gen_random_uuid())", M1, "permission denied")
hata_bekle("müşteri profil tablosunu doğrudan okuyamaz", "select count(*) from public.profiller", M1, "permission denied")
p = j("select public.profil_guncelle('Ayşe Y.', '0555 123', true)", M1)
bekle("profil güncellenir, rol değişmez", p["ad_soyad"] == "Ayşe Y." and p["rol"] == "musteri", p)

# --------------------------------------------------------------- İŞLETME
print("\nİşletme paneli")
s = j(f"select public.kupon_sorgula('{k1['kod']}')", ISL_A)
bekle("işletme kendi kampanyasının kuponunu sorgular", s["durum"] == "aktif" and s["musteri"]["ad_soyad"] == "Ayşe Y.", s.get("musteri"))
bekle("rezervasyonsuz kuponda müşteri telefonu gizli", s["musteri"]["telefon"] is None)
hata_bekle("işletme başka işletmenin kuponunu göremez", f"select public.kupon_sorgula('{r['kod']}')", ISL_A, "bulunamadı")
sb = j(f"select public.kupon_sorgula('{r['kod']}')", ISL_B)
bekle("otel rezervasyonlu kuponda müşteri telefonunu görür", sb["musteri"]["telefon"] == "0555 123", sb["musteri"])
hata_bekle("işletme kupon tablosunu doğrudan okuyamaz", "select count(*) from public.kuponlar", ISL_A, "permission denied")
hata_bekle("işletme iç notları (isletmeler tablosu) okuyamaz", "select notlar from public.isletmeler", ISL_A, "permission denied")
u = j(f"select public.kupon_kullan('{k1['kod']}')", ISL_A)
bekle("kupon kullanıldı olarak işaretlenir", u["durum"] == "kullanildi" and u["kullanim_zamani"])
hata_bekle("aynı kupon ikinci kez kullanılamaz", f"select public.kupon_kullan('{k1['kod']}')", ISL_A, "zaten kullanılmış")
hata_bekle("işletme başka işletmenin kuponunu kullanamaz", f"select public.kupon_kullan('{r['kod']}')", ISL_A, "bulunamadı")
ik = j("select public.isletme_kuponlari()", ISL_A)
bekle("işletme listesi ve özet doğru", ik["isletme"] == "Moda Burger" and len(ik["kuponlar"]) == 2
      and ik["ozet"]["kullanildi"] == 1 and float(ik["ozet"]["tahsil_edilen"]) == 600, ik["ozet"])

print("\nİptal ve süre")
hata_bekle("kullanılmış kupon iptal edilemez", f"select public.kupon_iptal('{k1['id']}')", M1, "Yalnızca kullanılmamış")
hata_bekle("başkasının kuponu iptal edilemez", f"select public.kupon_iptal('{k2['id']}')", M1, "bulunamadı")
iptal = j(f"select public.kupon_iptal('{k2['id']}')", M2)
bekle("aktif kupon iptal edilir", iptal["durum"] == "iptal")
bekle("iptal edilen kupon stoğa geri döner", j("select kalan from public.kampanya_liste where id='burger'", "anon") == 1)
hata_bekle("iptal edilmiş kupon kullanılamaz", f"select public.kupon_kullan('{k2['kod']}')", ISL_A, "iptal")
q(f"update public.kuponlar set son_kullanma = now() - interval '1 hour' where kod='{r['kod']}'")
bekle("süresi geçen kupon 'suresi_doldu' görünür", j(f"select public.kupon_getir('{r['kod']}')", M1)["durum"] == "suresi_doldu")
hata_bekle("süresi geçen kupon kullanılamaz", f"select public.kupon_kullan('{r['kod']}')", ISL_B, "süresi dolmuş")

# --------------------------------------------------------------- YÖNETİCİ
print("\nYönetim")
oz = j("select public.yonetim_ozet()", ADMIN)
bekle("yönetim özeti", oz["uye"] == 5 and oz["kupon_toplam"] == 3 and oz["basvuru_yeni"] == 1, oz)
km = j("select public.yonetim_kampanyalar()", ADMIN)
bekle("yönetici taslak dahil tüm kampanyaları görür", len(km) == 5)
yeni = j("""select public.yonetim_kampanya_kaydet('{"id":"Yeni-Kampanya","baslik":"Yeni kampanya","kategori":"kafe","sehir":"izmir",
           "eski_fiyat":"200","yeni_fiyat":"120","bitis":"2099-01-01","kosullar":["Hafta içi geçerli",""],"durum":"yayinda"}'::jsonb)""", ADMIN)
bekle("yönetici kampanya ekler (id küçük harfe çevrilir, boş koşul atılır)", yeni["id"] == "yeni-kampanya" and yeni["kosullar"] == ["Hafta içi geçerli"], yeni)
hata_bekle("indirimli fiyat eski fiyattan büyük olamaz",
           """select public.yonetim_kampanya_kaydet('{"id":"hatali","baslik":"Hatalı","kategori":"kafe","sehir":"izmir","eski_fiyat":"100","yeni_fiyat":"200","bitis":"2099-01-01"}'::jsonb)""",
           ADMIN, "fiyat_mantikli")
j("select public.yonetim_kampanya_durum('yeni-kampanya', 'durduruldu')", ADMIN)
bekle("durdurulan kampanya listeden çıkar", j("select count(*) from public.kampanya_liste where id='yeni-kampanya'", "anon") == 0)
isl = j("""select public.yonetim_isletme_kaydet('{"ad":"Grupanya Kaynaklı Kafe","izin_durumu":"bekliyor","kaynak":"grupanya","telefon":"0212 333"}'::jsonb)""", ADMIN)
bekle("işletme izin durumu ile eklenir", isl["izin_durumu"] == "bekliyor")
j(f"select public.yonetim_kullanici_rol('{M2}', 'isletme', '{isl['id']}')", ADMIN)
bekle("yönetici kullanıcıyı işletme yapar", j("select public.profilim()", M2)["isletme"] == "Grupanya Kaynaklı Kafe")
hata_bekle("işletme rolü işletmesiz verilemez", f"select public.yonetim_kullanici_rol('{M1}', 'isletme', null)", ADMIN, "işletme seçmelisiniz")
hata_bekle("yönetici kendi yetkisini kaldıramaz", f"select public.yonetim_kullanici_rol('{ADMIN}', 'musteri')", ADMIN, "kaldıramazsınız")
hata_bekle("işletme kullanıcısı yönetim yapamaz", "select public.yonetim_kampanyalar()", ISL_A, "yönetici yetkisi")
bekle("yönetici tüm kuponları görür", len(j("select public.yonetim_kuponlar()", ADMIN)) == 3)
bekle("yönetici kullanıcı arar", len(j("select public.yonetim_kullanicilar('m1@')", ADMIN)) == 1)
bekle("yönetici başvuruları görür", len(j("select public.yonetim_basvurular()", ADMIN)) == 1)

# --------------------------------------------------------------- İNCELEME BULGULARI
print("\nBağımsız inceleme bulguları")
RED = q("insert into public.isletmeler (ad, telefon, izin_durumu) values ('İzinsiz İşletme', '0532 999', 'bekliyor') returning id")[1]
q(f"insert into public.kampanyalar (id, isletme_id, baslik, kategori, sehir, yeni_fiyat, bitis) values ('izinsiz', '{RED}', 'İzinsiz kampanya', 'restoran', 'istanbul', 100, current_date + 10)")
bekle("izni alınmamış işletmenin kampanyası listede görünmez", j("select count(*) from public.kampanya_liste where id='izinsiz'", "anon") == 0)
hata_bekle("izni alınmamış işletmenin kampanyasından kupon alınamaz", "select public.kupon_al('izinsiz')", M1, "yayında değil")
q(f"update public.isletmeler set izin_durumu='onaylandi' where id='{RED}'")
bekle("izin onaylanınca kampanya yayına girer", j("select count(*) from public.kampanya_liste where id='izinsiz'", "anon") == 1)
q(f"update public.isletmeler set aktif=false where id='{RED}'")
bekle("pasif işletmenin kampanyası gizlenir", j("select count(*) from public.kampanya_liste where id='izinsiz'", "anon") == 0)
ok, out = q(f"update public.profiller set rol='isletme', isletme_id=null where id='{M1}'")
bekle("işletme rolü işletmesiz olamaz (veritabanı kuralı)", (not ok) and "isletme_rolu_isletme_ister" in out, out)
DOGRULANMAMIS = str(uuid.uuid4())
q(f"insert into auth.users (id, email, email_confirmed_at) values ('{DOGRULANMAMIS}', 'yeni@test.tr', null)")
hata_bekle("e-postası doğrulanmamış üye kupon alamaz", "select public.kupon_al('yeni-kampanya')", DOGRULANMAMIS, "doğrulamalısınız")
q("""insert into public.kampanyalar (id, isletme_id, baslik, kategori, sehir, yeni_fiyat, bitis, kisi_basi_limit)
     select 'hiz', isletme_id, 'Hız testi', 'kafe', 'izmir', 10, current_date + 5, 50 from public.kampanyalar where id='burger'""")
for _ in range(10):
    q("select public.kupon_al('hiz', 1)", ADMIN)
hata_bekle("saatte 10'dan fazla kupon alınamaz", "select public.kupon_al('hiz', 1)", ADMIN, "Kısa sürede")
isimsiz = j(f"select public.kupon_sorgula('{k2['kod']}')", ISL_A)["musteri"]["ad_soyad"]
bekle("adı olmayan müşterinin e-postası işletmeye sızmaz", isimsiz == "Yakaladım üyesi", isimsiz)

# --------------------------------------------------------------- KUPON BEDELİ VE ÖDEME
print("\nKupon bedeli ve online ödeme")
bedel = lambda kid: j(f"select kupon_bedeli from public.kampanya_liste where id='{kid}'", "anon")
bekle("ödeme kapalıyken kupon bedeli 0", float(bedel("otel")) == 0)
hata_bekle("müşteri ayarları değiştiremez", "select public.yonetim_ayar_kaydet('{\"odeme_aktif\":true}')", M1, "yönetici yetkisi")
hata_bekle("ayarlar tablosu istemciye kapalı", "select * from public.ayarlar", M1, "permission denied")
j("select public.yonetim_ayar_kaydet('{\"odeme_aktif\":true}')", ADMIN)
q("""insert into public.kampanyalar (id, isletme_id, baslik, kategori, sehir, eski_fiyat, yeni_fiyat, bitis, stok, kisi_basi_limit)
     select 'ucuz', isletme_id, 'Ucuz kahvaltı', 'kahvalti', 'istanbul', 400, 300, current_date + 9, null, 5 from public.kampanyalar where id='burger';
   insert into public.kampanyalar (id, isletme_id, baslik, kategori, sehir, eski_fiyat, yeni_fiyat, bitis, stok, kisi_basi_limit)
     select 'pahali', isletme_id, 'Lüks otel', 'otel', 'istanbul', 20000, 9000, current_date + 9, 2, 2 from public.kampanyalar where id='burger';
   insert into public.kampanyalar (id, isletme_id, baslik, kategori, sehir, eski_fiyat, yeni_fiyat, bitis, kupon_bedeli)
     select 'bedava', isletme_id, 'Tanıtım', 'kafe', 'istanbul', 200, 100, current_date + 9, 0 from public.kampanyalar where id='burger';
   insert into public.kampanyalar (id, isletme_id, baslik, kategori, sehir, eski_fiyat, yeni_fiyat, bitis, kupon_bedeli)
     select 'sabit', isletme_id, 'Sabit bedel', 'kafe', 'istanbul', 2000, 1000, current_date + 9, 25 from public.kampanyalar where id='burger';
   insert into public.kampanyalar (id, isletme_id, baslik, kategori, sehir, eski_fiyat, yeni_fiyat, bitis)
     select 'orta', isletme_id, 'Orta', 'kafe', 'istanbul', 1500, 1000, current_date + 9 from public.kampanyalar where id='burger';""")
bekle("%1 kuralı: 1000 TL → 10 TL", float(bedel("orta")) == 10, bedel("orta"))
bekle("en az 5 TL: 300 TL → 5 TL", float(bedel("ucuz")) == 5, bedel("ucuz"))
bekle("en fazla 50 TL: 9000 TL → 50 TL", float(bedel("pahali")) == 50, bedel("pahali"))
bekle("kampanya bazında 0 = ücretsiz", float(bedel("bedava")) == 0)
bekle("kampanya bazında sabit bedel", float(bedel("sabit")) == 25)

M3 = str(uuid.uuid4())
q(f"insert into auth.users (id, email, raw_user_meta_data) values ('{M3}', 'm3@test.tr', '{{\"ad_soyad\":\"Can Öz\"}}')")
pk = j("select public.kupon_al('pahali', 2)", M3)
bekle("ücretli kupon 'ödeme bekliyor' durumunda ve kodsuz oluşur", pk["durum"] == "odeme_bekliyor" and pk["kod"] is None and pk["siparis_no"].startswith("YK"), pk)
bekle("kupon bedeli adet ile çarpılır (2 × 50)", float(pk["kupon_bedeli"]) == 100)
bekle("ödeme bekleyen kupon stoğu rezerve eder", j("select kalan from public.kampanya_liste where id='pahali'", "anon") == 0)
hata_bekle("rezervdeyken başkası alamaz", "select public.kupon_al('pahali', 1)", M1, "tükendi")
hata_bekle("müşteri ödemeyi kendisi onaylayamaz", f"select public.odeme_onayla('{pk['siparis_no']}', 100, 'sahte')", M3, "permission denied")
hata_bekle("ziyaretçi ödemeyi onaylayamaz", f"select public.odeme_onayla('{pk['siparis_no']}', 100, 'sahte')", "anon", "permission denied")
hz = j(f"select public.odeme_hazirla('{pk['siparis_no']}', '{M3}')", "servis")
bekle("sunucu ödeme bilgisini hazırlar (tutar, e-posta, ad)", float(hz["tutar"]) == 100 and hz["eposta"] == "m3@test.tr" and hz["ad_soyad"] == "Can Öz", hz)
hata_bekle("başkasının siparişi için ödeme hazırlanamaz", f"select public.odeme_hazirla('{pk['siparis_no']}', '{M1}')", "servis", "bulunamadı")
bekle("müşteri siparişini görebilir", j(f"select public.kupon_siparis('{pk['siparis_no']}')", M3)["durum"] == "odeme_bekliyor")
hata_bekle("başkası siparişi göremez", f"select public.kupon_siparis('{pk['siparis_no']}')", M1, "bulunamadı")
hata_bekle("eksik tutarla onay reddedilir", f"select public.odeme_onayla('{pk['siparis_no']}', 50, 'paytr')", "servis", "az")
ok1 = j(f"select public.odeme_onayla('{pk['siparis_no']}', 100, 'paytr', 'ref-1')", "servis")
bekle("ödeme onaylanınca kupon aktif olur ve kod üretilir", ok1["durum"] == "aktif" and ok1["kod"] and ok1["odeme_durumu"] == "odendi", ok1)
ok2 = j(f"select public.odeme_onayla('{pk['siparis_no']}', 100, 'paytr', 'ref-1')", "servis")
bekle("aynı bildirim tekrar gelirse kod değişmez", ok2["kod"] == ok1["kod"])
bekle("işletme ödenmiş kuponu sorgulayabilir", j(f"select public.kupon_sorgula('{ok1['kod']}')", ISL_A)["durum"] == "aktif")

ok3 = j("select public.kupon_al('orta', 1)", M3)
bekle("işletme listesinde ödenmemiş kupon görünmez",
      all(c["kod"] for c in j("select public.isletme_kuponlari()", ISL_A)["kuponlar"]))
j(f"select public.odeme_basarisiz('{ok3['siparis_no']}', 'paytr')", "servis")
bekle("başarısız ödeme kuponu iptal eder ve listeden düşer",
      all(c["id"] != ok3["id"] for c in j("select public.kuponlarim()", M3)))

zm = j("select public.kupon_al('orta', 1)", M3)
q(f"update public.kuponlar set olusturma = now() - interval '25 minutes' where id='{zm['id']}'")
bekle("ödeme süresi geçince 'zaman aşımı' görünür", j(f"select public.kupon_siparis('{zm['siparis_no']}')", M3)["durum"] == "odeme_zaman_asimi")
hata_bekle("süresi geçen sipariş için ödeme başlatılamaz", f"select public.odeme_hazirla('{zm['siparis_no']}', '{M3}')", "servis", "süresi doldu")
gec = j(f"select public.odeme_onayla('{zm['siparis_no']}', 10, 'paytr')", "servis")
bekle("süre dolduktan sonra gelen ödeme yine de kuponu aktif eder (para alınmıştır)", gec["durum"] == "aktif" and gec["kod"])

ip = j("select public.kupon_al('orta', 1)", M3)
ipt = j(f"select public.kupon_iptal('{ip['id']}')", M3)
bekle("müşteri ödeme bekleyen kuponu iptal edebilir", ipt["durum"] == "iptal")

hata_bekle("ödenmemiş kupona iade yapılamaz", f"select public.yonetim_kupon_iade('{ip['id']}', 'x')", ADMIN, "Yalnızca ödenmiş")
hata_bekle("işletme iade yapamaz", f"select public.yonetim_kupon_iade('{ok1['id']}', 'x')", ISL_A, "yönetici yetkisi")
iade = j(f"select public.yonetim_kupon_iade('{ok1['id']}', 'İşletme kapandı')", ADMIN)
bekle("yönetici iade kaydeder; aktif kupon iptal olur", iade["odeme_durumu"] == "iade" and iade["durum"] == "iptal")
hata_bekle("iade edilen kupon işletmede kullanılamaz", f"select public.kupon_kullan('{ok1['kod']}')", ISL_A, "iptal")
oz = j("select public.yonetim_ozet()", ADMIN)
bekle("özet: kupon geliri ve iade ayrı", float(oz["kupon_geliri"]) == 10 and float(oz["iade_toplam"]) == 100, oz)
bekle("ücretsiz kampanyada kupon anında aktif", j("select public.kupon_al('bedava', 1)", M3)["durum"] == "aktif")
j("select public.yonetim_ayar_kaydet('{\"odeme_aktif\":false}')", ADMIN)
bekle("ödeme kapatılınca bedel tekrar 0", float(bedel("orta")) == 0)

# --------------------------------------------------------------- YARDIMCILAR
print("\nYardımcılar")
bekle("kod normalleştirme", q("select public.kod_normallestir(' yk 7f3k-9q2m ')")[1] == "YK-7F3K-9Q2M")
bekle("kod normalleştirme (önek yok)", q("select public.kod_normallestir('7f3k9q2m')")[1] == "YK-7F3K-9Q2M")
kodlar = q("select count(distinct public.kupon_kodu_uret()) from generate_series(1, 20000)")[1]
bekle("20.000 üretimde çakışma yok", kodlar == "20000", kodlar)
alfabe = q("select bool_and(k ~ '^YK-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$') from (select public.kupon_kodu_uret() k from generate_series(1,2000)) t")[1]
bekle("kodlarda karıştırılabilir karakter (0, O, 1, I) yok", alfabe == "t")
dag = q("select count(distinct substr(k, 9, 1)) from (select public.kupon_kodu_uret() k from generate_series(1, 5000)) t")[1]
bekle("her karakter konumu 32 değerin tamamını alır (tam rastgelelik)", dag == "32", dag)

print(f"\nSonuç: {GECTI} geçti, {len(KALDI)} kaldı")
if KALDI:
    print("Kalanlar:", *KALDI, sep="\n - ")
    sys.exit(1)
