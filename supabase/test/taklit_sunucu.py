#!/usr/bin/env python3
"""
SADECE TEST: Supabase'in GoTrue (/auth/v1) ve PostgREST (/rest/v1) uç
noktalarının sitenin kullandığı alt kümesini yerel PostgreSQL üzerinde taklit
eder ve siteyi aynı adresten sunar. Böylece assets/js/yk-api.js içindeki
Supabase istemcisi gerçek şema ve RLS kurallarıyla uçtan uca test edilir.

Kullanım: python3 supabase/test/taklit_sunucu.py 8790 ykmock
"""
import json
import re
import secrets
import subprocess
import sys
import time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8790
DB = sys.argv[2] if len(sys.argv) > 2 else "ykmock"
SITE = Path(__file__).resolve().parents[2]
PSQL = ["psql", "-h", "/var/tmp/ykpg", "-p", "5433", "-U", "postgres", "-d", DB, "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1"]
ANON_KEY = "eyJ.taklit.anon"

SIFRELER = {}      # e-posta -> (kullanıcı id, şifre)
ERISIM = {}        # access token -> kullanıcı id
YENILEME = {}      # refresh token -> kullanıcı id


def sql(sorgu, kullanici=None, anon=False, servis=False):
    on = ""
    if servis:
        on = "set role service_role;\n"
    elif kullanici:
        on = ("set role authenticated; select set_config('request.jwt.claims', '"
              + json.dumps({"sub": kullanici, "role": "authenticated"}) + "', false) \\g /dev/null\n")
    elif anon:
        on = "set role anon;\n"
    r = subprocess.run(PSQL, input=on + sorgu, capture_output=True, text=True)
    if r.returncode != 0:
        mesaj = r.stderr.strip().split("ERROR:")[-1].strip().split("\n")[0]
        raise PermissionError(mesaj) if "permission denied" in mesaj else ValueError(mesaj)
    return r.stdout.strip()


def lit(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (dict, list)):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def oturum(uid, eposta):
    a, y = secrets.token_hex(16), secrets.token_hex(16)
    ERISIM[a] = uid
    YENILEME[y] = uid
    return {"access_token": a, "refresh_token": y, "token_type": "bearer", "expires_in": 3600,
            "expires_at": int(time.time()) + 3600, "user": {"id": uid, "email": eposta}}


def kullanici_olustur(eposta, sifre, meta, rol=None, isletme=None):
    uid = sql(f"insert into auth.users (email, raw_user_meta_data) values ({lit(eposta)}, {lit(meta)}) returning id")
    SIFRELER[eposta] = (uid, sifre)
    if rol:
        isl = f"(select id from public.isletmeler where ad = {lit(isletme)})" if isletme else "null"
        sql(f"update public.profiller set rol = {lit(rol)}, isletme_id = {isl} where id = '{uid}'")
    return uid


class Isleyici(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(SITE), **k)

    def log_message(self, *a):
        pass

    def yanit(self, kod, govde):
        veri = json.dumps(govde, ensure_ascii=False).encode()
        self.send_response(kod)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(veri)))
        self.end_headers()
        self.wfile.write(veri)

    def govde(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}") if n else {}

    def kim(self):
        h = self.headers.get("Authorization", "")
        if self.headers.get("apikey") != ANON_KEY:
            return "gecersiz-anahtar"
        if h.startswith("Bearer "):
            t = h[7:]
            if t == ANON_KEY:
                return None
            if t in ERISIM:
                return ERISIM[t]
            return "gecersiz-token"
        return None

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/assets/js/yk-config.js":
            js = ("window.YK_CONFIG = { supabaseUrl: 'http://localhost:%d', supabaseAnonKey: '%s', siteUrl: 'http://localhost:%d' };"
                  % (PORT, ANON_KEY, PORT)).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript")
            self.send_header("Content-Length", str(len(js)))
            self.end_headers()
            self.wfile.write(js)
            return
        if u.path.startswith("/auth/v1/user"):
            uid = self.kim()
            if not uid or uid.startswith("gecersiz"):
                return self.yanit(401, {"msg": "invalid JWT"})
            return self.yanit(200, {"id": uid})
        if u.path.startswith("/rest/v1/"):
            return self.rest_get(u)
        if u.path == "/__test_odeme.html":
            # PayTR iframe'inin yerine geçen sahte ödeme ekranı
            q = parse_qs(u.query)
            sip = q.get("siparis", [""])[0]
            html = f"""<!doctype html><meta charset="utf-8"><title>Test ödeme</title>
<body style="font-family:sans-serif;padding:20px"><h3>TEST ÖDEME EKRANI</h3><p>Sipariş: {sip} · Tutar: {q.get('tutar',[''])[0]} TL</p>
<button id="test-ode" onclick="gonder('success')">Öde</button> <button id="test-red" onclick="gonder('failed')">Reddet</button>
<script>function gonder(d){{fetch('/__test_bildirim',{{method:'POST',body:JSON.stringify({{siparis:'{sip}',status:d}})}})
.then(()=>{{location.href='/odeme.html?siparis={sip}&sonuc='+(d==='success'?'basarili':'basarisiz');}});}}</script></body>"""
            veri = html.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(veri)))
            self.end_headers()
            self.wfile.write(veri)
            return
        return super().do_GET()

    def rest_get(self, u):
        uid = self.kim()
        if uid and uid.startswith("gecersiz"):
            return self.yanit(401, {"message": "JWT expired", "code": "PGRST301"})
        tablo = u.path.split("/rest/v1/")[1]
        if not re.fullmatch(r"[a-z_]+", tablo):
            return self.yanit(404, {"message": "bulunamadı"})
        q = parse_qs(u.query)
        sira = ""
        if "order" in q:
            parca = []
            for o in q["order"][0].split(","):
                ad, _, yon = o.partition(".")
                parca.append(f"{ad} {'desc' if yon == 'desc' else 'asc'}")
            sira = " order by " + ", ".join(parca)
        try:
            out = sql(f"select coalesce(json_agg(t), '[]') from (select * from public.{tablo}{sira}) t", uid, anon=not uid)
            return self.yanit(200, json.loads(out))
        except PermissionError as e:
            return self.yanit(403, {"code": "42501", "message": str(e)})
        except ValueError as e:
            return self.yanit(400, {"code": "P0001", "message": str(e)})

    def do_PUT(self):
        u = urlparse(self.path)
        if u.path == "/auth/v1/user":
            uid = self.kim()
            if not uid or uid.startswith("gecersiz"):
                return self.yanit(401, {"msg": "invalid JWT"})
            b = self.govde()
            if len(b.get("password", "")) < 8:
                return self.yanit(422, {"code": "weak_password", "msg": "Password should be at least 8 characters."})
            for e, (i, _) in list(SIFRELER.items()):
                if i == uid:
                    SIFRELER[e] = (i, b["password"])
            return self.yanit(200, {"id": uid})
        return self.yanit(404, {})

    def do_POST(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        b = self.govde()
        if self.headers.get("apikey") != ANON_KEY and u.path != "/__test_bildirim":
            return self.yanit(401, {"message": "Invalid API key"})
        if u.path == "/auth/v1/signup":
            e = b.get("email", "").lower()
            if e in SIFRELER:
                return self.yanit(422, {"code": "user_already_exists", "msg": "User already registered"})
            if len(b.get("password", "")) < 8:
                return self.yanit(422, {"code": "weak_password", "msg": "Password should be at least 8 characters."})
            uid = kullanici_olustur(e, b["password"], b.get("data") or {})
            return self.yanit(200, oturum(uid, e))
        if u.path == "/auth/v1/token":
            if q.get("grant_type") == ["password"]:
                e = b.get("email", "").lower()
                if e not in SIFRELER or SIFRELER[e][1] != b.get("password"):
                    return self.yanit(400, {"error": "invalid_grant", "error_description": "Invalid login credentials"})
                return self.yanit(200, oturum(SIFRELER[e][0], e))
            if q.get("grant_type") == ["refresh_token"]:
                uid = YENILEME.pop(b.get("refresh_token"), None)
                if not uid:
                    return self.yanit(400, {"error": "invalid_grant", "error_description": "Invalid Refresh Token"})
                return self.yanit(200, oturum(uid, ""))
        if u.path == "/auth/v1/logout":
            t = self.headers.get("Authorization", "")[7:]
            ERISIM.pop(t, None)
            self.send_response(204)
            self.end_headers()
            return
        if u.path == "/auth/v1/recover":
            return self.yanit(200, {})
        if u.path == "/functions/v1/odeme-baslat":
            uid = self.kim()
            if not uid or uid.startswith("gecersiz"):
                return self.yanit(401, {"message": "Ödeme için giriş yapmalısınız."})
            try:
                s_ = json.loads(sql(f"select public.odeme_hazirla({lit(b.get('siparis_no'))}, '{uid}')", servis=True))
            except (ValueError, PermissionError) as e:
                return self.yanit(400, {"message": str(e)})
            return self.yanit(200, {"tip": "iframe", "url": f"/__test_odeme.html?siparis={s_['siparis_no']}&tutar={s_['tutar']}"})
        if u.path == "/__test_bildirim":
            # PayTR'nin sunucuya bildirimi (odeme-bildirim fonksiyonunun yaptığı veritabanı çağrısı)
            sip = lit(b.get("siparis"))
            if b.get("status") == "success":
                tutar = sql(f"select kupon_bedeli from public.kuponlar where siparis_no = {sip}")
                sql(f"select public.odeme_onayla({sip}, {tutar}, 'test')", servis=True)
            else:
                sql(f"select public.odeme_basarisiz({sip}, 'test')", servis=True)
            return self.yanit(200, {"ok": True})
        if u.path.startswith("/rest/v1/rpc/"):
            ad = u.path.split("/rpc/")[1]
            if not re.fullmatch(r"[a-z_]+", ad):
                return self.yanit(404, {"message": "bulunamadı"})
            uid = self.kim()
            if uid and uid.startswith("gecersiz"):
                return self.yanit(401, {"message": "JWT expired", "code": "PGRST301"})
            arg = ", ".join(f"{k} => {lit(v)}" for k, v in b.items() if re.fullmatch(r"[a-z_]+", k))
            try:
                out = sql(f"select to_jsonb(public.{ad}({arg}))", uid, anon=not uid)
                return self.yanit(200, json.loads(out) if out else None)
            except PermissionError as e:
                return self.yanit(401 if not uid else 403, {"code": "42501", "message": str(e)})
            except ValueError as e:
                return self.yanit(400, {"code": "P0001", "message": str(e)})
        return self.yanit(404, {"message": "bulunamadı"})


if __name__ == "__main__":
    # Demo hesaplarıyla aynı e-postalar: e2e testi iki modda da aynı akışı çalıştırır
    kullanici_olustur("yonetici@demo.yakaladim.com", "demo1234", {"ad_soyad": "Demo Yönetici"}, "admin")
    kullanici_olustur("isletme@demo.yakaladim.com", "demo1234", {"ad_soyad": "Demo Kasiyer"}, "isletme", "Moda Burger Lab")
    print(f"Taklit Supabase http://localhost:{PORT} (veritabanı: {DB})", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Isleyici).serve_forever()
