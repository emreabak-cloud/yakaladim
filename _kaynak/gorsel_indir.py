#!/usr/bin/env python3
"""
Taslak kampanya görsellerini indirip sitenin kendi klasörüne taşır.

assets/data/kampanyalar-ek.js içindeki her kampanyanın `gorsel` ve `galeri`
adreslerini indirir:
    assets/img/kampanya/<kampanya-id>/1.jpg, 2.jpg, ...
sonra dosyadaki adresleri bu yerel yollarla değiştirir ve
supabase/03_ek_kampanyalar.sql dosyasını yeniden üretir.

Canlıya çıkmadan önce bir kez çalıştırın (yalnızca Python 3 gerekir):
    python _kaynak/gorsel_indir.py
Tekrar çalıştırmak güvenlidir: inmiş dosyalar atlanır.
"""
import json
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERI = ROOT / "assets/data/kampanyalar-ek.js"
HEDEF = ROOT / "assets/img/kampanya"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


def kucult(yol, en=1200, kalite=80):
    """Pillow kuruluysa fotoğrafı web için küçültür (en uzun kenar 1200 px, JPEG %80)."""
    try:
        from PIL import Image
    except ImportError:
        return
    try:
        with Image.open(yol) as im:
            im = im.convert("RGB")
            im.thumbnail((en, en))
            im.save(yol, "JPEG", quality=kalite, optimize=True, progressive=True)
    except Exception as e:  # noqa: BLE001
        print("   ! küçültülemedi:", yol.name, "-", e)


def indir(url, yol):
    if yol.exists() and yol.stat().st_size > 1000:
        return True
    istek = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://www.grupanya.com/"})
    try:
        with urllib.request.urlopen(istek, timeout=30) as r:
            veri = r.read()
        if len(veri) < 1000 or not (veri[:3] == b"\xff\xd8\xff" or veri[:8] == b"\x89PNG\r\n\x1a\n" or veri[8:12] == b"WEBP"):
            print("   ! görsel değil:", url)
            return False
        yol.parent.mkdir(parents=True, exist_ok=True)
        yol.write_bytes(veri)
        kucult(yol)
        return True
    except Exception as e:  # noqa: BLE001
        print("   ! indirilemedi:", url, "-", e)
        return False


def main():
    metin = VERI.read_text(encoding="utf-8")
    m = re.search(r"window\.KAMPANYALAR_EK = (\[.*\]);", metin, flags=re.S)
    kampanyalar = json.loads(m.group(1))
    tamam = eksik = 0
    for k in kampanyalar:
        adresler = [a for a in [k.get("gorsel")] + list(k.get("galeri") or []) if a]
        if not adresler:
            continue
        yeni = []
        for i, url in enumerate(adresler, 1):
            if not url.startswith("http"):
                yeni.append(url)
                continue
            yol = HEDEF / k["id"] / f"{i}.jpg"
            if indir(url, yol):
                yeni.append(yol.relative_to(ROOT).as_posix())
                tamam += 1
            else:
                yeni.append(url)
                eksik += 1
            time.sleep(0.3)
        k["gorsel"], k["galeri"] = yeni[0], yeni[1:]
        print("✓", k["id"])
    VERI.write_text(metin[:m.start(1)] + json.dumps(kampanyalar, ensure_ascii=False, indent=2) + metin[m.end(1):], encoding="utf-8")
    print(f"\n{tamam} görsel indirildi, {eksik} görsel indirilemedi.")
    subprocess.run([sys.executable, str(ROOT / "_kaynak/sql_uret.py")], check=False)


if __name__ == "__main__":
    main()
