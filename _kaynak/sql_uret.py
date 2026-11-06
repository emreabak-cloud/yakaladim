#!/usr/bin/env python3
"""
assets/data/kampanyalar.js (ve varsa kampanyalar-ek.js) dosyalarından
Supabase'e yüklenecek SQL üretir:
    supabase/02_ornek_veri.sql      ← kampanyalar.js
    supabase/03_ek_kampanyalar.sql  ← kampanyalar-ek.js (ör. Grupanya taslakları)
Kullanım:  python3 _kaynak/sql_uret.py
"""
import json
import subprocess
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NS = uuid.UUID("6f1d2c1e-5a1b-4c7e-9e1a-0c2b7d9a1f00")


def js_oku(dosya, degisken):
    kod = f"""
      global.window = {{}};
      require({json.dumps(str(dosya))});
      process.stdout.write(JSON.stringify(window.{degisken} || []));
    """
    return json.loads(subprocess.run(["node", "-e", kod], capture_output=True, text=True, check=True).stdout)


def lit(v):
    if v is None or v == "":
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        return "array[" + ", ".join(lit(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"


def isletme_id(ad):
    return str(uuid.uuid5(NS, ad.strip().lower()))


def uret(kampanyalar, baslik, varsayilan_izin):
    satirlar = [f"-- {baslik}", "-- Bu dosya _kaynak/sql_uret.py ile üretildi; elle düzenlemeyin.",
                "-- Tekrar çalıştırılabilir: var olan kayıtlar güncellenir.", "begin;", ""]
    goruldu = set()
    for k in kampanyalar:
        ad = k["isletme"]
        if ad in goruldu:
            continue
        goruldu.add(ad)
        izin = k.get("izinDurumu", varsayilan_izin)
        alanlar = {
            "id": isletme_id(ad), "ad": ad, "kategori": k.get("kategori"), "sehir": k.get("sehir"),
            "semt": k.get("semt"), "adres": k.get("adres"), "telefon": k.get("telefon"), "web": k.get("web"),
            "izin_durumu": izin, "kaynak": k.get("kaynak", "manuel"), "kaynak_url": k.get("kaynakUrl"),
            "notlar": k.get("not"),
        }
        satirlar.append(
            "insert into public.isletmeler (" + ", ".join(alanlar) + ") values (" + ", ".join(lit(v) for v in alanlar.values()) + ")\n"
            "  on conflict (id) do update set ad = excluded.ad, telefon = coalesce(excluded.telefon, public.isletmeler.telefon), "
            "adres = coalesce(excluded.adres, public.isletmeler.adres);")
    satirlar.append("")
    for k in kampanyalar:
        alanlar = {
            "id": k["id"], "isletme_id": isletme_id(k["isletme"]), "baslik": k["baslik"], "kategori": k["kategori"],
            "sehir": k["sehir"], "semt": k.get("semt"), "adres": k.get("adres") or None, "kisa": k.get("kisa"),
            "aciklama": k.get("aciklama"), "kosullar": k.get("kosullar") or [], "gorsel": k.get("gorsel") or None,
            "galeri": k.get("galeri") or [],
            "eski_fiyat": k.get("eskiFiyat"), "yeni_fiyat": k["yeniFiyat"], "bitis": k["bitis"],
            "stok": k.get("stok"), "kisi_basi_limit": k.get("kisiBasiLimit", 5),
            "rezervasyon_gerekli": bool(k.get("rezervasyonGerekli")), "link": k.get("link") or None,
            "one_cikan": bool(k.get("oneCikan")), "durum": k.get("durum", "yayinda"),
            "kaynak": k.get("kaynak", "manuel"), "kaynak_url": k.get("kaynakUrl"),
        }
        guncelle = ", ".join(f"{a} = excluded.{a}" for a in alanlar if a != "id")
        satirlar.append(
            "insert into public.kampanyalar (" + ", ".join(alanlar) + ") values (" + ", ".join(lit(v) for v in alanlar.values()) + ")\n"
            f"  on conflict (id) do update set {guncelle};")
    satirlar += ["", "commit;", ""]
    return "\n".join(satirlar)


if __name__ == "__main__":
    ana = js_oku(ROOT / "assets/data/kampanyalar.js", "KAMPANYALAR")
    (ROOT / "supabase/02_ornek_veri.sql").write_text(
        uret(ana, "ÖRNEK KAMPANYALAR (assets/data/kampanyalar.js). İsterseniz yüklemeyin; yüklerseniz yönetim panelinden düzenleyebilir/durdurabilirsiniz.", "onaylandi"),
        encoding="utf-8")
    print("yazıldı: supabase/02_ornek_veri.sql", len(ana), "kampanya")
    ek = ROOT / "assets/data/kampanyalar-ek.js"
    if ek.exists():
        ekler = js_oku(ek, "KAMPANYALAR_EK")
        (ROOT / "supabase/03_ek_kampanyalar.sql").write_text(
            uret(ekler, "EK KAMPANYALAR (assets/data/kampanyalar-ek.js) — işletmeler 'izin bekliyor' durumunda yüklenir; "
                        "izin aldıkça yönetim panelinden 'Onaylandı' yapın.", "bekliyor"),
            encoding="utf-8")
        print("yazıldı: supabase/03_ek_kampanyalar.sql", len(ekler), "kampanya")
