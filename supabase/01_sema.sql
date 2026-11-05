-- =====================================================================
--  YAKALADIM.COM — KUPON, REZERVASYON VE ÜYELİK ALTYAPISI
--  Supabase > SQL Editor'a bu dosyanın tamamını yapıştırıp "Run" deyin.
--  Dosya tekrar çalıştırılabilir (fonksiyonlar "create or replace").
--
--  Modeli:
--   * Müşteri üye olur, kampanyadan kupon alır (kod + QR).
--   * Kupon bedeli (ör. ürün fiyatının %1'i, en az 5 / en fazla 50 TL) online
--     ödenir; ödeme onaylanınca kupon kodu üretilir. Ürünün indirimli fiyatı
--     mekanda, kupon gösterilerek ödenir. Ödeme kapalıyken kuponlar ücretsizdir.
--   * İşletme kullanıcısı İşletme Paneli'nde kodu sorgular ve "kullanıldı" yapar.
--   * Yönetici (admin) kampanya, işletme, kullanıcı ve başvuruları yönetir.
--
--  Güvenlik: Tüm tablolarda RLS açık. Yazma işlemleri yalnızca aşağıdaki
--  "security definer" fonksiyonlar üzerinden yapılır; istemci tabloya
--  doğrudan yazamaz.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) TABLOLAR
-- ---------------------------------------------------------------------

create table if not exists public.isletmeler (
  id            uuid primary key default gen_random_uuid(),
  ad            text not null check (length(ad) between 2 and 120),
  kategori      text,
  sehir         text,
  semt          text,
  adres         text,
  telefon       text,
  eposta        text,
  web           text,
  yetkili       text,                                   -- iç not: görüşülen kişi
  izin_durumu   text not null default 'onaylandi'
                check (izin_durumu in ('bekliyor', 'gorusuldu', 'onaylandi', 'reddedildi')),
  kaynak        text,                                   -- 'grupanya', 'basvuru', 'manuel' ...
  kaynak_url    text,
  notlar        text,
  aktif         boolean not null default true,
  olusturma     timestamptz not null default now(),
  guncelleme    timestamptz not null default now()
);

create table if not exists public.kampanyalar (
  id                    text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  isletme_id            uuid references public.isletmeler(id) on delete restrict,
  baslik                text not null check (length(baslik) between 3 and 140),
  kategori              text not null,
  sehir                 text not null,
  semt                  text,
  adres                 text,
  kisa                  text,
  aciklama              text,
  kosullar              text[] not null default '{}',
  gorsel                text,
  eski_fiyat            numeric(10,2) check (eski_fiyat is null or eski_fiyat > 0),
  yeni_fiyat            numeric(10,2) not null check (yeni_fiyat >= 0),
  baslangic             date not null default current_date,
  bitis                 date not null,
  stok                  integer check (stok is null or stok >= 0),       -- null = sınırsız
  kisi_basi_limit       integer not null default 5 check (kisi_basi_limit between 1 and 50),
  rezervasyon_gerekli   boolean not null default false,
  kupon_gecerlilik_gun  integer not null default 30 check (kupon_gecerlilik_gun between 1 and 365),
  odeme_tipi            text not null default 'mekanda' check (odeme_tipi in ('mekanda', 'online')),
  link                  text,
  one_cikan             boolean not null default false,
  durum                 text not null default 'yayinda'
                        check (durum in ('taslak', 'yayinda', 'durduruldu')),
  kaynak                text,
  kaynak_url            text,
  olusturma             timestamptz not null default now(),
  guncelleme            timestamptz not null default now(),
  constraint fiyat_mantikli check (eski_fiyat is null or yeni_fiyat <= eski_fiyat),
  constraint tarih_mantikli check (bitis >= baslangic)
);
create index if not exists kampanyalar_durum_idx on public.kampanyalar (durum, bitis);
create index if not exists kampanyalar_isletme_idx on public.kampanyalar (isletme_id);

create table if not exists public.profiller (
  id              uuid primary key references auth.users(id) on delete cascade,
  eposta          text,
  ad_soyad        text,
  telefon         text,
  rol             text not null default 'musteri' check (rol in ('musteri', 'isletme', 'admin')),
  isletme_id      uuid references public.isletmeler(id) on delete restrict,
  kvkk_onay       timestamptz,
  pazarlama_izni  boolean not null default false,
  olusturma       timestamptz not null default now()
);
create index if not exists profiller_isletme_idx on public.profiller (isletme_id);
do $$ begin
  alter table public.profiller add constraint isletme_rolu_isletme_ister
    check (rol <> 'isletme' or isletme_id is not null);
exception when duplicate_object then null; end $$;

create table if not exists public.kuponlar (
  id                  uuid primary key default gen_random_uuid(),
  kod                 text unique,                       -- ödeme onaylanınca üretilir
  kampanya_id         text not null references public.kampanyalar(id) on delete restrict,
  kullanici_id        uuid not null references auth.users(id) on delete cascade,
  adet                integer not null default 1 check (adet between 1 and 50),
  birim_fiyat         numeric(10,2) not null,
  toplam              numeric(10,2) not null,
  durum               text not null default 'aktif'
                      check (durum in ('odeme_bekliyor', 'aktif', 'kullanildi', 'iptal')),
  rezervasyon_tarihi  date,
  rezervasyon_saati   time,
  kisi_sayisi         integer check (kisi_sayisi is null or kisi_sayisi between 1 and 50),
  musteri_notu        text check (musteri_notu is null or length(musteri_notu) <= 500),
  son_kullanma        timestamptz not null,
  olusturma           timestamptz not null default now(),
  kullanim_zamani     timestamptz,
  kullanan            uuid references auth.users(id) on delete set null,
  iptal_zamani        timestamptz,
  -- Kupon bedeli ve online ödeme
  kupon_bedeli        numeric(10,2) not null default 0,   -- tüm adetler için toplam
  odeme_durumu        text not null default 'yok'
                      check (odeme_durumu in ('yok', 'bekliyor', 'odendi', 'basarisiz', 'iade')),
  siparis_no          text unique,
  odeme_saglayici     text,
  odeme_ref           text,
  odeme_zamani        timestamptz,
  iade_zamani         timestamptz,
  iade_notu           text
);
create index if not exists kuponlar_kullanici_idx on public.kuponlar (kullanici_id, olusturma desc);
create index if not exists kuponlar_kampanya_idx on public.kuponlar (kampanya_id, durum);

-- Önceki sürümden yükseltme (tablo zaten varsa yeni sütun ve kuralları ekle)
alter table public.kuponlar alter column kod drop not null;
alter table public.kuponlar add column if not exists kupon_bedeli numeric(10,2) not null default 0;
alter table public.kuponlar add column if not exists odeme_durumu text not null default 'yok';
alter table public.kuponlar add column if not exists siparis_no text unique;
alter table public.kuponlar add column if not exists odeme_saglayici text;
alter table public.kuponlar add column if not exists odeme_ref text;
alter table public.kuponlar add column if not exists odeme_zamani timestamptz;
alter table public.kuponlar add column if not exists iade_zamani timestamptz;
alter table public.kuponlar add column if not exists iade_notu text;
alter table public.kuponlar drop constraint if exists kuponlar_durum_check;
alter table public.kuponlar add constraint kuponlar_durum_check
  check (durum in ('odeme_bekliyor', 'aktif', 'kullanildi', 'iptal'));
alter table public.kuponlar drop constraint if exists kuponlar_odeme_durumu_check;
alter table public.kuponlar add constraint kuponlar_odeme_durumu_check
  check (odeme_durumu in ('yok', 'bekliyor', 'odendi', 'basarisiz', 'iade'));
alter table public.kuponlar drop constraint if exists kullanilabilir_kuponun_kodu_var;
alter table public.kuponlar add constraint kullanilabilir_kuponun_kodu_var
  check (durum not in ('aktif', 'kullanildi') or kod is not null);
-- Kampanya bazında kupon bedeli: boş = genel kural, 0 = ücretsiz, sayı = sabit bedel (TL / adet)
alter table public.kampanyalar add column if not exists kupon_bedeli numeric(10,2)
  check (kupon_bedeli is null or kupon_bedeli >= 0);

-- Genel ayarlar (tek satır). Yönetim panelinden değiştirilir.
create table if not exists public.ayarlar (
  id              integer primary key default 1 check (id = 1),
  odeme_aktif     boolean not null default false,          -- false iken tüm kuponlar ücretsiz
  bedel_oran      numeric(6,4) not null default 0.01 check (bedel_oran between 0 and 1),
  bedel_min       numeric(10,2) not null default 5 check (bedel_min >= 0),
  bedel_max       numeric(10,2) not null default 50 check (bedel_max >= 0),
  odeme_suresi_dk integer not null default 20 check (odeme_suresi_dk between 5 and 120),
  guncelleme      timestamptz not null default now()
);
insert into public.ayarlar (id) values (1) on conflict (id) do nothing;

create table if not exists public.basvurular (
  id          uuid primary key default gen_random_uuid(),
  tip         text not null check (tip in ('genel', 'isletme', 'bulten')),
  veri        jsonb not null,
  durum       text not null default 'yeni' check (durum in ('yeni', 'okundu', 'tamamlandi')),
  kullanici_id uuid references auth.users(id) on delete set null,
  olusturma   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2) YARDIMCI FONKSİYONLAR
-- ---------------------------------------------------------------------

-- Türkiye saatine göre bugünün tarihi (Supabase sunucusu UTC çalışır)
create or replace function public.bugun() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/Istanbul')::date
$$;

-- Verilen günün Türkiye saatiyle bitiş anı (23:59:59 → ertesi gün 00:00)
create or replace function public.gun_sonu(p date) returns timestamptz
language sql immutable set search_path = '' as $$
  select ((p + 1)::timestamp at time zone 'Europe/Istanbul')
$$;

create or replace function public.benim_rolum() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select rol from public.profiller where id = auth.uid()), 'misafir')
$$;

create or replace function public.yonetici_mi() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiller where id = auth.uid() and rol = 'admin')
$$;

create or replace function public.benim_isletmem() returns uuid
language sql stable security definer set search_path = '' as $$
  select isletme_id from public.profiller where id = auth.uid() and rol in ('isletme', 'admin')
$$;

-- Okunması kolay, tahmin edilmesi zor kupon kodu: YK-XXXX-XXXX
-- 32 karakterlik alfabe (0/O, 1/I yok) → 40 bit rastgelelik, gen_random_uuid() kaynaklı.
create or replace function public.kupon_kodu_uret() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alfabe constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea := uuid_send(gen_random_uuid());
  -- UUIDv4'te 6. ve 8. baytlar sürüm/varyant bitleri taşır; yalnızca tamamen rastgele baytları kullan
  sira constant int[] := array[0, 1, 2, 3, 4, 5, 7, 9];
  s text := '';
  i int;
begin
  for i in 1..8 loop
    s := s || substr(alfabe, (get_byte(b, sira[i]) % 32) + 1, 1);
  end loop;
  return 'YK-' || substr(s, 1, 4) || '-' || substr(s, 5, 4);
end $$;

-- Kullanıcının yazdığı kodu standart biçime getirir ("yk 7f3k9q2m" → "YK-7F3K-9Q2M")
create or replace function public.kod_normallestir(p text) returns text
language sql immutable set search_path = '' as $$
  select case
    when length(x) = 10 and left(x, 2) = 'YK' then 'YK-' || substr(x, 3, 4) || '-' || substr(x, 7, 4)
    when length(x) = 8 then 'YK-' || substr(x, 1, 4) || '-' || substr(x, 5, 4)
    else coalesce(p, '')
  end
  from (select regexp_replace(upper(coalesce(p, '')), '[^A-Z0-9]', '', 'g') as x) t
$$;

-- Ödeme için ayrılan süre (ayarlar.odeme_suresi_dk)
create or replace function public.odeme_suresi() returns interval
language sql stable security definer set search_path = '' as $$
  select make_interval(mins => coalesce((select odeme_suresi_dk from public.ayarlar where id = 1), 20))
$$;

-- Kupon stoktan ve kişi başı limitten düşer mi?
create or replace function public.stok_tutuyor(c public.kuponlar) returns boolean
language sql stable security definer set search_path = '' as $$
  select c.durum in ('aktif', 'kullanildi')
      or (c.durum = 'odeme_bekliyor' and c.olusturma > now() - public.odeme_suresi())
$$;

-- Kampanyada satılmış (aktif + kullanılmış) ve ödemesi beklenen kupon adedi
create or replace function public.satilan_adet(p_kampanya text) returns integer
language sql stable security definer set search_path = '' as $$
  -- Aktif + kullanılmış kuponlar ve ödeme süresi dolmamış "ödeme bekliyor" rezervleri
  select coalesce(sum(c.adet), 0)::int from public.kuponlar c
  where c.kampanya_id = p_kampanya and public.stok_tutuyor(c)
$$;

-- Kampanyanın adet başına kupon bedeli. Ödeme kapalıysa 0.
create or replace function public.kupon_bedeli_hesapla(p_fiyat numeric, p_ozel numeric) returns numeric
language sql stable security definer set search_path = '' as $$
  select case
    when not a.odeme_aktif then 0
    when p_ozel is not null then p_ozel
    else least(a.bedel_max, greatest(a.bedel_min, round(p_fiyat * a.bedel_oran)))
  end
  from public.ayarlar a where a.id = 1
$$;

-- Kuponun kullanıcıya görünen durumu
create or replace function public.kupon_gorunen_durum(k public.kuponlar) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when k.durum = 'odeme_bekliyor' and k.olusturma < now() - public.odeme_suresi() then 'odeme_zaman_asimi'
    when k.durum = 'aktif' and k.son_kullanma < now() then 'suresi_doldu'
    else k.durum end
$$;

-- guncelleme alanını otomatik doldur
create or replace function public.guncelleme_damgasi() returns trigger
language plpgsql set search_path = '' as $$
begin new.guncelleme := now(); return new; end $$;

drop trigger if exists kampanyalar_guncelleme on public.kampanyalar;
create trigger kampanyalar_guncelleme before update on public.kampanyalar
  for each row execute function public.guncelleme_damgasi();
drop trigger if exists isletmeler_guncelleme on public.isletmeler;
create trigger isletmeler_guncelleme before update on public.isletmeler
  for each row execute function public.guncelleme_damgasi();

-- Yeni üyelikte profil oluştur (üye olurken gönderilen ad, telefon, izinler)
create or replace function public.yeni_uye_profili() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiller (id, eposta, ad_soyad, telefon, kvkk_onay, pazarlama_izni)
  values (
    new.id,
    new.email,
    left(nullif(trim(m ->> 'ad_soyad'), ''), 120),
    left(nullif(trim(m ->> 'telefon'), ''), 30),
    case when (m ->> 'kvkk')::boolean is true then now() end,
    coalesce((m ->> 'pazarlama_izni')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists yeni_uye_profili on auth.users;
create trigger yeni_uye_profili after insert on auth.users
  for each row execute function public.yeni_uye_profili();

-- ---------------------------------------------------------------------
-- 3) GÖRÜNÜM: HERKESE AÇIK KAMPANYA LİSTESİ
--    Sadece yayında olan kampanyaları ve herkese açık alanları gösterir.
--    Kalan stok tüm kuponlardan hesaplandığı için görünüm sahibinin
--    yetkisiyle çalışır (RLS'yi aşar ama yalnızca güvenli alanları verir).
-- ---------------------------------------------------------------------
create or replace view public.kampanya_liste as
select
  k.id, k.baslik, k.kategori, k.sehir, k.semt,
  coalesce(k.adres, i.adres) as adres,
  i.ad        as isletme,
  i.telefon   as isletme_telefon,
  k.kisa, k.aciklama, k.kosullar, k.gorsel,
  k.eski_fiyat, k.yeni_fiyat, k.baslangic, k.bitis,
  k.stok,
  case when k.stok is null then null
       else greatest(k.stok - (select coalesce(sum(c.adet), 0)::int from public.kuponlar c
                               where c.kampanya_id = k.id
                                 and (c.durum in ('aktif', 'kullanildi')
                                      or (c.durum = 'odeme_bekliyor'
                                          and c.olusturma > now() - make_interval(mins => a.odeme_suresi_dk)))), 0)
  end as kalan,
  k.kisi_basi_limit, k.rezervasyon_gerekli, k.kupon_gecerlilik_gun,
  k.odeme_tipi, k.link, k.one_cikan,
  -- Adet başına kupon bedeli (fonksiyon yerine satır içi: görünüm ziyaretçi yetkisiyle fonksiyon çağıramaz)
  case when not a.odeme_aktif then 0
       when k.kupon_bedeli is not null then k.kupon_bedeli
       else least(a.bedel_max, greatest(a.bedel_min, round(k.yeni_fiyat * a.bedel_oran))) end as kupon_bedeli
from public.kampanyalar k
cross join public.ayarlar a
join public.isletmeler i on i.id = k.isletme_id
where a.id = 1 and k.durum = 'yayinda'
  and i.aktif and i.izin_durumu = 'onaylandi'
  and k.bitis >= public.bugun()
  and k.baslangic <= public.bugun();

-- ---------------------------------------------------------------------
-- 4) SATIR DÜZEYİ GÜVENLİK (RLS)
-- ---------------------------------------------------------------------
alter table public.isletmeler  enable row level security;
alter table public.kampanyalar enable row level security;
alter table public.profiller   enable row level security;
alter table public.kuponlar    enable row level security;
alter table public.basvurular  enable row level security;

-- Politikası olmayan RLS = istemciye tamamen kapalı. Tüm okumalar ve yazmalar
-- aşağıdaki görünüm ve "security definer" fonksiyonlar üzerinden yapılır.
drop policy if exists "isletme: yonetici veya kendi" on public.isletmeler;
drop policy if exists "kampanya: yayindakiler herkese" on public.kampanyalar;
drop policy if exists "profil: kendi veya yonetici" on public.profiller;
drop policy if exists "kupon: sahibi, isletmesi veya yonetici" on public.kuponlar;
drop policy if exists "basvuru: yonetici" on public.basvurular;

alter table public.ayarlar enable row level security;
revoke all on public.isletmeler, public.kampanyalar, public.profiller, public.kuponlar, public.basvurular,
  public.ayarlar from anon, authenticated;
revoke all on public.kampanya_liste from anon, authenticated;
grant select on public.kampanya_liste to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5) MÜŞTERİ FONKSİYONLARI
-- ---------------------------------------------------------------------

-- Kuponu JSON olarak kampanya ve işletme bilgisiyle birlikte döndürür
create or replace function public.kupon_json(p_kupon_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id, 'kod', c.kod, 'durum', public.kupon_gorunen_durum(c),
    'adet', c.adet, 'birim_fiyat', c.birim_fiyat, 'toplam', c.toplam,
    'rezervasyon_tarihi', c.rezervasyon_tarihi,
    'rezervasyon_saati', to_char(c.rezervasyon_saati, 'HH24:MI'),
    'kisi_sayisi', c.kisi_sayisi, 'musteri_notu', c.musteri_notu,
    'son_kullanma', c.son_kullanma, 'olusturma', c.olusturma,
    'kullanim_zamani', c.kullanim_zamani, 'iptal_zamani', c.iptal_zamani,
    'kupon_bedeli', c.kupon_bedeli, 'odeme_durumu', c.odeme_durumu, 'siparis_no', c.siparis_no,
    'odeme_zamani', c.odeme_zamani, 'iade_zamani', c.iade_zamani,
    'odeme_son', case when c.durum = 'odeme_bekliyor' then c.olusturma + public.odeme_suresi() end,
    'kampanya', jsonb_build_object(
      'id', k.id, 'baslik', k.baslik, 'kategori', k.kategori, 'sehir', k.sehir, 'semt', k.semt,
      'gorsel', k.gorsel, 'eski_fiyat', k.eski_fiyat, 'yeni_fiyat', k.yeni_fiyat,
      'kosullar', k.kosullar, 'odeme_tipi', k.odeme_tipi, 'rezervasyon_gerekli', k.rezervasyon_gerekli,
      'adres', coalesce(k.adres, i.adres), 'isletme', i.ad, 'isletme_telefon', i.telefon
    )
  )
  from public.kuponlar c
  join public.kampanyalar k on k.id = c.kampanya_id
  left join public.isletmeler i on i.id = k.isletme_id
  where c.id = p_kupon_id
$$;
revoke execute on function public.kupon_json(uuid) from public, anon, authenticated;

create or replace function public.kupon_al(
  p_kampanya_id        text,
  p_adet               integer default 1,
  p_rezervasyon_tarihi date    default null,
  p_rezervasyon_saati  time    default null,
  p_kisi_sayisi        integer default null,
  p_not                text    default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  k         public.kampanyalar;
  v_satilan int;
  v_benim   int;
  v_kod     text;
  v_id      uuid;
  v_son     timestamptz;
  v_deneme  int := 0;
  v_bedel   numeric(10,2);
begin
  if v_uid is null then
    raise exception 'Kupon almak için giriş yapmalısınız.' using errcode = '28000';
  end if;
  -- Anonim / doğrulanmamış hesaplar kupon alamaz (sahte hesapla stok tüketmeyi zorlaştırır)
  if not exists (select 1 from auth.users u where u.id = v_uid and u.email_confirmed_at is not null) then
    raise exception 'Kupon almak için önce e-posta adresinizi doğrulamalısınız.' using errcode = '28000';
  end if;
  if (select count(*) from public.kuponlar
       where kullanici_id = v_uid and olusturma > now() - interval '1 hour') >= 10 then
    raise exception 'Kısa sürede çok fazla kupon aldınız. Lütfen bir süre sonra tekrar deneyin.';
  end if;
  if (select count(*) from public.kuponlar
       where kullanici_id = v_uid and durum = 'aktif' and son_kullanma > now()) >= 20 then
    raise exception 'Aynı anda en fazla 20 kullanılmamış kuponunuz olabilir.';
  end if;

  -- Aynı anda gelen taleplerde stok tutarlılığı için kampanya satırını kilitle
  select * into k from public.kampanyalar where id = p_kampanya_id for update;
  if not found or k.durum <> 'yayinda' or not exists (
       select 1 from public.isletmeler i
        where i.id = k.isletme_id and i.aktif and i.izin_durumu = 'onaylandi') then
    raise exception 'Kampanya bulunamadı veya yayında değil.';
  end if;
  if public.bugun() > k.bitis then
    raise exception 'Bu kampanyanın süresi doldu.';
  end if;
  if public.bugun() < k.baslangic then
    raise exception 'Bu kampanya henüz başlamadı.';
  end if;
  if k.odeme_tipi = 'online' then
    raise exception 'Bu kampanya online ödeme gerektiriyor; ödeme altyapısı yakında aktif olacak.';
  end if;

  p_adet := coalesce(p_adet, 1);
  if p_adet < 1 or p_adet > k.kisi_basi_limit then
    raise exception 'Adet 1 ile % arasında olmalıdır.', k.kisi_basi_limit;
  end if;

  select coalesce(sum(c.adet), 0) into v_benim from public.kuponlar c
   where c.kampanya_id = k.id and c.kullanici_id = v_uid and public.stok_tutuyor(c);
  if v_benim + p_adet > k.kisi_basi_limit then
    raise exception 'Bu kampanyadan kişi başı en fazla % kupon alınabilir (şu ana kadar %).',
      k.kisi_basi_limit, v_benim;
  end if;

  if k.stok is not null then
    v_satilan := public.satilan_adet(k.id);
    if v_satilan + p_adet > k.stok then
      if k.stok - v_satilan <= 0 then
        raise exception 'Bu kampanyanın kuponları tükendi.';
      end if;
      raise exception 'Bu kampanyada yalnızca % kupon kaldı.', k.stok - v_satilan;
    end if;
  end if;

  if k.rezervasyon_gerekli then
    if p_rezervasyon_tarihi is null or p_rezervasyon_saati is null then
      raise exception 'Bu kampanya için rezervasyon tarihi ve saati seçmelisiniz.';
    end if;
    if p_rezervasyon_tarihi < public.bugun() or p_rezervasyon_tarihi > k.bitis then
      raise exception 'Rezervasyon tarihi bugün ile kampanya bitişi (%) arasında olmalıdır.',
        to_char(k.bitis, 'DD.MM.YYYY');
    end if;
    if p_rezervasyon_tarihi = public.bugun()
       and p_rezervasyon_saati < (now() at time zone 'Europe/Istanbul')::time then
      raise exception 'Geçmiş bir saat için rezervasyon yapılamaz.';
    end if;
    p_kisi_sayisi := coalesce(p_kisi_sayisi, 1);
    if p_kisi_sayisi < 1 or p_kisi_sayisi > 50 then
      raise exception 'Kişi sayısı 1 ile 50 arasında olmalıdır.';
    end if;
  else
    p_rezervasyon_tarihi := null; p_rezervasyon_saati := null; p_kisi_sayisi := null;
  end if;

  v_son := least(public.gun_sonu(k.bitis), now() + make_interval(days => k.kupon_gecerlilik_gun));
  if k.rezervasyon_gerekli then
    -- Rezervasyonlu kupon, rezervasyon gününün sonuna kadar geçerlidir
    v_son := least(v_son, public.gun_sonu(p_rezervasyon_tarihi));
  end if;

  v_bedel := public.kupon_bedeli_hesapla(k.yeni_fiyat, k.kupon_bedeli) * p_adet;

  if v_bedel > 0 then
    -- Ücretli kupon: kod ödeme onaylanınca üretilir; o zamana kadar stok rezerve edilir
    insert into public.kuponlar (kod, kampanya_id, kullanici_id, adet, birim_fiyat, toplam,
                                 rezervasyon_tarihi, rezervasyon_saati, kisi_sayisi,
                                 musteri_notu, son_kullanma, durum, kupon_bedeli, odeme_durumu, siparis_no)
    values (null, k.id, v_uid, p_adet, k.yeni_fiyat, k.yeni_fiyat * p_adet,
            p_rezervasyon_tarihi, p_rezervasyon_saati, p_kisi_sayisi,
            nullif(left(trim(coalesce(p_not, '')), 500), ''), v_son,
            'odeme_bekliyor', v_bedel, 'bekliyor',
            'YK' || upper(replace(gen_random_uuid()::text, '-', '')))
    returning id into v_id;
    return public.kupon_json(v_id);
  end if;

  loop
    v_kod := public.kupon_kodu_uret();
    begin
      insert into public.kuponlar (kod, kampanya_id, kullanici_id, adet, birim_fiyat, toplam,
                                   rezervasyon_tarihi, rezervasyon_saati, kisi_sayisi,
                                   musteri_notu, son_kullanma)
      values (v_kod, k.id, v_uid, p_adet, k.yeni_fiyat, k.yeni_fiyat * p_adet,
              p_rezervasyon_tarihi, p_rezervasyon_saati, p_kisi_sayisi,
              nullif(left(trim(coalesce(p_not, '')), 500), ''), v_son)
      returning id into v_id;
      exit;
    exception when unique_violation then
      v_deneme := v_deneme + 1;
      if v_deneme > 5 then raise; end if;
    end;
  end loop;

  return public.kupon_json(v_id);
end $$;

create or replace function public.kuponlarim() returns jsonb
language sql stable security definer set search_path = '' as $$
  -- Süresi geçmiş ödeme denemeleri ve başarısız ödemeler listelenmez
  select coalesce(jsonb_agg(public.kupon_json(c.id) order by c.olusturma desc), '[]'::jsonb)
  from public.kuponlar c
  where c.kullanici_id = auth.uid()
    and not (c.durum = 'odeme_bekliyor' and c.olusturma < now() - public.odeme_suresi())
    and not (c.durum = 'iptal' and c.odeme_durumu = 'basarisiz')
$$;

-- Ödeme sayfası için: siparişe ait kupon (yalnızca sahibine)
create or replace function public.kupon_siparis(p_siparis_no text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.kuponlar where siparis_no = p_siparis_no and kullanici_id = auth.uid();
  if v_id is null then raise exception 'Sipariş bulunamadı.'; end if;
  return public.kupon_json(v_id);
end $$;

create or replace function public.kupon_getir(p_kod text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.kuponlar
   where kod = public.kod_normallestir(p_kod) and kullanici_id = auth.uid();
  if v_id is null then raise exception 'Kupon bulunamadı.'; end if;
  return public.kupon_json(v_id);
end $$;

create or replace function public.kupon_iptal(p_kupon_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.kuponlar;
begin
  select * into c from public.kuponlar
   where id = p_kupon_id and kullanici_id = auth.uid() for update;
  if not found then raise exception 'Kupon bulunamadı.'; end if;
  if c.durum not in ('aktif', 'odeme_bekliyor') then
    raise exception 'Yalnızca kullanılmamış kuponlar iptal edilebilir.';
  end if;
  -- Ödenmiş kupon bedeli müşteri iptalinde iade edilmez (kullanım koşulları)
  update public.kuponlar set durum = 'iptal', iptal_zamani = now(),
    odeme_durumu = case when odeme_durumu = 'bekliyor' then 'basarisiz' else odeme_durumu end
  where id = c.id;
  return public.kupon_json(c.id);
end $$;

create or replace function public.profilim() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'eposta', p.eposta, 'ad_soyad', p.ad_soyad, 'telefon', p.telefon,
    'rol', p.rol, 'isletme_id', p.isletme_id, 'isletme', i.ad,
    'pazarlama_izni', p.pazarlama_izni, 'olusturma', p.olusturma
  )
  from public.profiller p left join public.isletmeler i on i.id = p.isletme_id
  where p.id = auth.uid()
$$;

create or replace function public.profil_guncelle(
  p_ad_soyad text, p_telefon text, p_pazarlama_izni boolean
) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısınız.' using errcode = '28000'; end if;
  update public.profiller set
    ad_soyad = left(nullif(trim(p_ad_soyad), ''), 120),
    telefon = left(nullif(trim(p_telefon), ''), 30),
    pazarlama_izni = coalesce(p_pazarlama_izni, false)
  where id = auth.uid();
  return public.profilim();
end $$;

-- Herkese açık form: iletişim, işletme başvurusu, bülten
create or replace function public.basvuru_gonder(p_tip text, p_veri jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_tip not in ('genel', 'isletme', 'bulten') then raise exception 'Geçersiz form.'; end if;
  if p_veri is null or jsonb_typeof(p_veri) <> 'object' or length(p_veri::text) > 4000 then
    raise exception 'Form verisi geçersiz veya çok uzun.';
  end if;
  -- Kaba spam koruması: saatte en fazla 100 form (gerekirse Supabase'de captcha eklenir)
  if (select count(*) from public.basvurular where olusturma > now() - interval '1 hour') >= 100 then
    raise exception 'Şu anda çok fazla form gönderiliyor. Lütfen biraz sonra tekrar deneyin.';
  end if;
  insert into public.basvurular (tip, veri, kullanici_id) values (p_tip, p_veri, auth.uid());
  return true;
end $$;

-- ---------------------------------------------------------------------
-- 6) İŞLETME PANELİ FONKSİYONLARI
-- ---------------------------------------------------------------------

-- Çağıranın bu kuponu görme / kullanma yetkisi var mı?
create or replace function public.isletme_kupon_bul(p_kod text) returns public.kuponlar
language plpgsql stable security definer set search_path = '' as $$
declare c public.kuponlar; v_isletme uuid;
begin
  if public.benim_rolum() not in ('isletme', 'admin') then
    raise exception 'Bu işlem için işletme hesabı gerekir.' using errcode = '42501';
  end if;
  select c2.* into c from public.kuponlar c2 where c2.kod = public.kod_normallestir(p_kod);
  if not found then raise exception 'Kupon bulunamadı.'; end if;
  select isletme_id into v_isletme from public.kampanyalar where id = c.kampanya_id;
  if not public.yonetici_mi()
     and (v_isletme is null or public.benim_isletmem() is null or v_isletme <> public.benim_isletmem()) then
    -- Başka işletmenin kuponu: varlığını da açık etme
    raise exception 'Kupon bulunamadı.';
  end if;
  return c;
end $$;
revoke execute on function public.isletme_kupon_bul(text) from public, anon, authenticated;

create or replace function public.isletme_kupon_json(c public.kuponlar) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.kupon_json(c.id) || jsonb_build_object(
    'musteri', jsonb_build_object(
      'ad_soyad', coalesce(p.ad_soyad, 'Yakaladım üyesi'),
      -- Telefon yalnızca rezervasyonlu kuponlarda işletmeyle paylaşılır
      'telefon', case when c.rezervasyon_tarihi is not null then p.telefon end
    )
  )
  from public.profiller p where p.id = c.kullanici_id
$$;
revoke execute on function public.isletme_kupon_json(public.kuponlar) from public, anon, authenticated;

create or replace function public.kupon_sorgula(p_kod text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return public.isletme_kupon_json(public.isletme_kupon_bul(p_kod));
end $$;

create or replace function public.kupon_kullan(p_kod text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.kuponlar;
begin
  c := public.isletme_kupon_bul(p_kod);
  select * into c from public.kuponlar where id = c.id for update;
  if c.durum = 'kullanildi' then
    raise exception 'Bu kupon % tarihinde zaten kullanılmış.',
      to_char(c.kullanim_zamani at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI');
  end if;
  if c.durum = 'iptal' then raise exception 'Bu kupon müşteri tarafından iptal edilmiş.'; end if;
  if c.son_kullanma < now() then raise exception 'Bu kuponun süresi dolmuş.'; end if;
  update public.kuponlar set durum = 'kullanildi', kullanim_zamani = now(), kullanan = auth.uid()
   where id = c.id returning * into c;
  return public.isletme_kupon_json(c);
end $$;

create or replace function public.isletme_kuponlari(p_limit integer default 200) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_isletme uuid := public.benim_isletmem(); v_admin boolean := public.yonetici_mi();
begin
  if public.benim_rolum() not in ('isletme', 'admin') then
    raise exception 'Bu işlem için işletme hesabı gerekir.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'isletme', (select ad from public.isletmeler where id = v_isletme),
    'ozet', (
      select jsonb_build_object(
        'aktif', count(*) filter (where c.durum = 'aktif' and c.son_kullanma >= now()),
        'kullanildi', count(*) filter (where c.durum = 'kullanildi'),
        'bugun_rezervasyon', count(*) filter (where c.durum = 'aktif' and c.rezervasyon_tarihi = public.bugun()),
        'tahsil_edilen', coalesce(sum(c.toplam) filter (where c.durum = 'kullanildi'), 0)
      )
      from public.kuponlar c join public.kampanyalar k on k.id = c.kampanya_id
      where (v_admin and v_isletme is null) or k.isletme_id = v_isletme
    ),
    'kuponlar', coalesce((
      select jsonb_agg(public.isletme_kupon_json(c) order by c.olusturma desc)
      from (select c.* from public.kuponlar c join public.kampanyalar k on k.id = c.kampanya_id
            where ((v_admin and v_isletme is null) or k.isletme_id = v_isletme) and c.kod is not null
            order by c.olusturma desc limit least(greatest(p_limit, 1), 1000)) c
    ), '[]'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------------
-- 7) YÖNETİM (ADMIN) FONKSİYONLARI
-- ---------------------------------------------------------------------
create or replace function public.yonetici_kontrol() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.yonetici_mi() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.' using errcode = '42501';
  end if;
end $$;

create or replace function public.yonetim_ozet() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.yonetici_kontrol();
  return jsonb_build_object(
    'kampanya_yayinda', (select count(*) from public.kampanyalar where durum = 'yayinda' and bitis >= public.bugun()),
    'kampanya_taslak',  (select count(*) from public.kampanyalar where durum = 'taslak'),
    'isletme',          (select count(*) from public.isletmeler),
    'izin_bekleyen',    (select count(*) from public.isletmeler where izin_durumu in ('bekliyor', 'gorusuldu')),
    'uye',              (select count(*) from public.profiller),
    'kupon_toplam',     (select count(*) from public.kuponlar),
    'kupon_kullanildi', (select count(*) from public.kuponlar where durum = 'kullanildi'),
    'ciro_kullanilan',  (select coalesce(sum(toplam), 0) from public.kuponlar where durum = 'kullanildi'),
    'basvuru_yeni',     (select count(*) from public.basvurular where durum = 'yeni'),
    'kupon_geliri',     (select coalesce(sum(kupon_bedeli), 0) from public.kuponlar where odeme_durumu = 'odendi'),
    'iade_toplam',      (select coalesce(sum(kupon_bedeli), 0) from public.kuponlar where odeme_durumu = 'iade'),
    'odeme_bekleyen',   (select count(*) from public.kuponlar
                         where durum = 'odeme_bekliyor' and olusturma > now() - public.odeme_suresi()),
    'odeme_aktif',      (select odeme_aktif from public.ayarlar where id = 1)
  );
end $$;

create or replace function public.yonetim_kampanyalar() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.yonetici_kontrol();
  return coalesce((
    select jsonb_agg(to_jsonb(k) || jsonb_build_object(
             'isletme', i.ad, 'izin_durumu', i.izin_durumu,
             'hesaplanan_bedel', public.kupon_bedeli_hesapla(k.yeni_fiyat, k.kupon_bedeli),
             'kupon_geliri', (select coalesce(sum(c.kupon_bedeli), 0) from public.kuponlar c
                              where c.kampanya_id = k.id and c.odeme_durumu = 'odendi'),
             'satilan', public.satilan_adet(k.id),
             'kullanilan', (select count(*) from public.kuponlar c where c.kampanya_id = k.id and c.durum = 'kullanildi'))
           order by k.guncelleme desc)
    from public.kampanyalar k left join public.isletmeler i on i.id = k.isletme_id
  ), '[]'::jsonb);
end $$;

create or replace function public.yonetim_kampanya_kaydet(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id text := lower(trim(p ->> 'id'));
begin
  perform public.yonetici_kontrol();
  if v_id is null or v_id = '' then raise exception 'Kampanya kimliği (id) zorunludur.'; end if;
  insert into public.kampanyalar as k (
    id, isletme_id, baslik, kategori, sehir, semt, adres, kisa, aciklama, kosullar, gorsel,
    eski_fiyat, yeni_fiyat, baslangic, bitis, stok, kisi_basi_limit, rezervasyon_gerekli,
    kupon_gecerlilik_gun, odeme_tipi, link, one_cikan, durum, kaynak, kaynak_url, kupon_bedeli)
  values (
    v_id,
    nullif(p ->> 'isletme_id', '')::uuid,
    p ->> 'baslik', p ->> 'kategori', p ->> 'sehir', p ->> 'semt', p ->> 'adres',
    p ->> 'kisa', p ->> 'aciklama',
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p -> 'kosullar', '[]'::jsonb)) x
              where trim(x) <> ''), '{}'),
    p ->> 'gorsel',
    nullif(p ->> 'eski_fiyat', '')::numeric, (p ->> 'yeni_fiyat')::numeric,
    coalesce(nullif(p ->> 'baslangic', '')::date, public.bugun()), (p ->> 'bitis')::date,
    nullif(p ->> 'stok', '')::int,
    coalesce(nullif(p ->> 'kisi_basi_limit', '')::int, 5),
    coalesce((p ->> 'rezervasyon_gerekli')::boolean, false),
    coalesce(nullif(p ->> 'kupon_gecerlilik_gun', '')::int, 30),
    coalesce(nullif(p ->> 'odeme_tipi', ''), 'mekanda'),
    nullif(p ->> 'link', ''),
    coalesce((p ->> 'one_cikan')::boolean, false),
    coalesce(nullif(p ->> 'durum', ''), 'taslak'),
    nullif(p ->> 'kaynak', ''), nullif(p ->> 'kaynak_url', ''),
    nullif(p ->> 'kupon_bedeli', '')::numeric)
  on conflict (id) do update set
    isletme_id = excluded.isletme_id, baslik = excluded.baslik, kategori = excluded.kategori,
    sehir = excluded.sehir, semt = excluded.semt, adres = excluded.adres, kisa = excluded.kisa,
    aciklama = excluded.aciklama, kosullar = excluded.kosullar, gorsel = excluded.gorsel,
    eski_fiyat = excluded.eski_fiyat, yeni_fiyat = excluded.yeni_fiyat,
    baslangic = excluded.baslangic, bitis = excluded.bitis, stok = excluded.stok,
    kisi_basi_limit = excluded.kisi_basi_limit, rezervasyon_gerekli = excluded.rezervasyon_gerekli,
    kupon_gecerlilik_gun = excluded.kupon_gecerlilik_gun, odeme_tipi = excluded.odeme_tipi,
    link = excluded.link, one_cikan = excluded.one_cikan, durum = excluded.durum,
    kupon_bedeli = excluded.kupon_bedeli,
    kaynak = coalesce(excluded.kaynak, k.kaynak), kaynak_url = coalesce(excluded.kaynak_url, k.kaynak_url);
  return (select to_jsonb(k) from public.kampanyalar k where id = v_id);
end $$;

create or replace function public.yonetim_kampanya_durum(p_id text, p_durum text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.yonetici_kontrol();
  update public.kampanyalar set durum = p_durum where id = p_id;
  if not found then raise exception 'Kampanya bulunamadı.'; end if;
  return (select to_jsonb(k) from public.kampanyalar k where id = p_id);
end $$;

create or replace function public.yonetim_isletmeler() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.yonetici_kontrol();
  return coalesce((
    select jsonb_agg(to_jsonb(i) || jsonb_build_object(
             'kampanya_sayisi', (select count(*) from public.kampanyalar k where k.isletme_id = i.id),
             'kullanici_sayisi', (select count(*) from public.profiller p where p.isletme_id = i.id))
           order by i.ad)
    from public.isletmeler i
  ), '[]'::jsonb);
end $$;

create or replace function public.yonetim_isletme_kaydet(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  perform public.yonetici_kontrol();
  if v_id is null then
    insert into public.isletmeler (ad, kategori, sehir, semt, adres, telefon, eposta, web, yetkili,
                                   izin_durumu, kaynak, kaynak_url, notlar, aktif)
    values (p ->> 'ad', p ->> 'kategori', p ->> 'sehir', p ->> 'semt', p ->> 'adres', p ->> 'telefon',
            p ->> 'eposta', p ->> 'web', p ->> 'yetkili', coalesce(nullif(p ->> 'izin_durumu', ''), 'onaylandi'),
            coalesce(nullif(p ->> 'kaynak', ''), 'manuel'), p ->> 'kaynak_url', p ->> 'notlar',
            coalesce((p ->> 'aktif')::boolean, true))
    returning id into v_id;
  else
    update public.isletmeler set
      ad = p ->> 'ad', kategori = p ->> 'kategori', sehir = p ->> 'sehir', semt = p ->> 'semt',
      adres = p ->> 'adres', telefon = p ->> 'telefon', eposta = p ->> 'eposta', web = p ->> 'web',
      yetkili = p ->> 'yetkili', izin_durumu = coalesce(nullif(p ->> 'izin_durumu', ''), izin_durumu),
      notlar = p ->> 'notlar', aktif = coalesce((p ->> 'aktif')::boolean, aktif)
    where id = v_id;
    if not found then raise exception 'İşletme bulunamadı.'; end if;
  end if;
  return (select to_jsonb(i) from public.isletmeler i where id = v_id);
end $$;

create or replace function public.yonetim_kuponlar(p_limit integer default 300) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.yonetici_kontrol();
  return coalesce((
    select jsonb_agg(public.isletme_kupon_json(c) || jsonb_build_object('musteri_eposta', p.eposta)
                     order by c.olusturma desc)
    from (select * from public.kuponlar order by olusturma desc
          limit least(greatest(p_limit, 1), 2000)) c
    left join public.profiller p on p.id = c.kullanici_id
  ), '[]'::jsonb);
end $$;

create or replace function public.yonetim_kullanicilar(p_arama text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.yonetici_kontrol();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', p.id, 'eposta', p.eposta, 'ad_soyad', p.ad_soyad, 'telefon', p.telefon,
             'rol', p.rol, 'isletme_id', p.isletme_id, 'isletme', i.ad, 'olusturma', p.olusturma,
             'kupon_sayisi', (select count(*) from public.kuponlar c where c.kullanici_id = p.id))
           order by p.olusturma desc)
    from (select * from public.profiller
          where p_arama is null or p_arama = ''
             or eposta ilike '%' || p_arama || '%' or ad_soyad ilike '%' || p_arama || '%'
          order by olusturma desc limit 200) p
    left join public.isletmeler i on i.id = p.isletme_id
  ), '[]'::jsonb);
end $$;

create or replace function public.yonetim_kullanici_rol(
  p_kullanici uuid, p_rol text, p_isletme uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.yonetici_kontrol();
  if p_rol not in ('musteri', 'isletme', 'admin') then raise exception 'Geçersiz rol.'; end if;
  if p_rol = 'isletme' and p_isletme is null then
    raise exception 'İşletme kullanıcısı için bir işletme seçmelisiniz.';
  end if;
  if p_kullanici = auth.uid() and p_rol <> 'admin' then
    raise exception 'Kendi yönetici yetkinizi kaldıramazsınız.';
  end if;
  update public.profiller set rol = p_rol,
    isletme_id = case when p_rol = 'musteri' then null else p_isletme end
  where id = p_kullanici;
  if not found then raise exception 'Kullanıcı bulunamadı.'; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.yonetim_basvurular() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.yonetici_kontrol();
  return coalesce((select jsonb_agg(to_jsonb(b) order by b.olusturma desc)
                   from (select * from public.basvurular order by olusturma desc limit 300) b), '[]'::jsonb);
end $$;

create or replace function public.yonetim_basvuru_durum(p_id uuid, p_durum text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.yonetici_kontrol();
  update public.basvurular set durum = p_durum where id = p_id;
  return found;
end $$;

-- ---------------------------------------------------------------------
-- 7b) ÖDEME (yalnızca sunucu tarafı: Supabase Edge Function, service_role)
-- ---------------------------------------------------------------------

-- Ödeme sayfası açılırken: siparişin tutarı ve müşteri bilgisi
create or replace function public.odeme_hazirla(p_siparis_no text, p_kullanici uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c public.kuponlar;
begin
  select * into c from public.kuponlar where siparis_no = p_siparis_no and kullanici_id = p_kullanici;
  if not found then raise exception 'Sipariş bulunamadı.'; end if;
  if c.durum <> 'odeme_bekliyor' then raise exception 'Bu sipariş için ödeme beklenmiyor.'; end if;
  if c.olusturma < now() - public.odeme_suresi() then
    raise exception 'Ödeme süresi doldu. Lütfen kuponu yeniden alın.';
  end if;
  return (select jsonb_build_object(
    'siparis_no', c.siparis_no, 'tutar', c.kupon_bedeli, 'adet', c.adet,
    'baslik', k.baslik, 'eposta', p.eposta, 'ad_soyad', coalesce(p.ad_soyad, 'Yakaladım üyesi'),
    'telefon', coalesce(p.telefon, ''),
    'kalan_dakika', greatest(1, ceil(extract(epoch from (c.olusturma + public.odeme_suresi() - now())) / 60))::int)
    from public.kampanyalar k, public.profiller p
    where k.id = c.kampanya_id and p.id = c.kullanici_id);
end $$;

-- Ödeme sağlayıcısının başarılı bildirimi. Tekrar gelirse aynı sonucu döner.
create or replace function public.odeme_onayla(
  p_siparis_no text, p_tutar numeric, p_saglayici text, p_ref text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.kuponlar; v_kod text; v_deneme int := 0;
begin
  select * into c from public.kuponlar where siparis_no = p_siparis_no for update;
  if not found then raise exception 'Sipariş bulunamadı: %', p_siparis_no; end if;
  if c.odeme_durumu in ('odendi', 'iade') then return public.kupon_json(c.id); end if;
  if p_tutar < c.kupon_bedeli then
    raise exception 'Ödenen tutar (%) kupon bedelinden (%) az.', p_tutar, c.kupon_bedeli;
  end if;
  -- Süre dolduktan veya iptalden sonra gelen ödeme de kabul edilir: müşteri parayı ödemiştir.
  loop
    v_kod := public.kupon_kodu_uret();
    begin
      update public.kuponlar set kod = v_kod, durum = 'aktif', odeme_durumu = 'odendi',
        odeme_saglayici = p_saglayici, odeme_ref = p_ref, odeme_zamani = now(), iptal_zamani = null
      where id = c.id;
      exit;
    exception when unique_violation then
      v_deneme := v_deneme + 1;
      if v_deneme > 5 then raise; end if;
    end;
  end loop;
  return public.kupon_json(c.id);
end $$;

-- Ödeme sağlayıcısının başarısız bildirimi
create or replace function public.odeme_basarisiz(p_siparis_no text, p_saglayici text, p_ref text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.kuponlar;
begin
  select * into c from public.kuponlar where siparis_no = p_siparis_no for update;
  if not found then raise exception 'Sipariş bulunamadı: %', p_siparis_no; end if;
  if c.durum = 'odeme_bekliyor' then
    update public.kuponlar set durum = 'iptal', odeme_durumu = 'basarisiz', iptal_zamani = now(),
      odeme_saglayici = p_saglayici, odeme_ref = p_ref
    where id = c.id;
  end if;
  return public.kupon_json(c.id);
end $$;

-- Yönetici: ayarlar
create or replace function public.yonetim_ayarlar() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.yonetici_kontrol();
  return (select to_jsonb(a) from public.ayarlar a where id = 1);
end $$;

create or replace function public.yonetim_ayar_kaydet(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.yonetici_kontrol();
  update public.ayarlar set
    odeme_aktif     = coalesce((p ->> 'odeme_aktif')::boolean, odeme_aktif),
    bedel_oran      = coalesce(nullif(p ->> 'bedel_oran', '')::numeric, bedel_oran),
    bedel_min       = coalesce(nullif(p ->> 'bedel_min', '')::numeric, bedel_min),
    bedel_max       = coalesce(nullif(p ->> 'bedel_max', '')::numeric, bedel_max),
    odeme_suresi_dk = coalesce(nullif(p ->> 'odeme_suresi_dk', '')::int, odeme_suresi_dk),
    guncelleme      = now()
  where id = 1;
  return public.yonetim_ayarlar();
end $$;

-- Yönetici: kupon bedeli iadesini kaydeder (para, ödeme sağlayıcısının panelinden iade edilir)
create or replace function public.yonetim_kupon_iade(p_kupon_id uuid, p_not text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.kuponlar;
begin
  perform public.yonetici_kontrol();
  select * into c from public.kuponlar where id = p_kupon_id for update;
  if not found then raise exception 'Kupon bulunamadı.'; end if;
  if c.odeme_durumu <> 'odendi' then raise exception 'Yalnızca ödenmiş kupon bedeli iade edilebilir.'; end if;
  update public.kuponlar set odeme_durumu = 'iade', iade_zamani = now(),
    iade_notu = left(nullif(trim(p_not), ''), 500),
    durum = case when durum = 'aktif' then 'iptal' else durum end,
    iptal_zamani = case when durum = 'aktif' then now() else iptal_zamani end
  where id = c.id;
  return public.kupon_json(c.id);
end $$;

-- ---------------------------------------------------------------------
-- 8) FONKSİYON YETKİLERİ
--    Varsayılan olarak herkes çalıştırabilir; giriş gerektirenleri anon'dan al.
-- ---------------------------------------------------------------------
revoke execute on function
  public.kupon_al(text, integer, date, time, integer, text),
  public.kuponlarim(), public.kupon_getir(text), public.kupon_iptal(uuid),
  public.profilim(), public.profil_guncelle(text, text, boolean),
  public.kupon_sorgula(text), public.kupon_kullan(text), public.isletme_kuponlari(integer),
  public.yonetici_kontrol(), public.yonetim_ozet(), public.yonetim_kampanyalar(),
  public.yonetim_kampanya_kaydet(jsonb), public.yonetim_kampanya_durum(text, text),
  public.yonetim_isletmeler(), public.yonetim_isletme_kaydet(jsonb), public.yonetim_kuponlar(integer),
  public.yonetim_kullanicilar(text), public.yonetim_kullanici_rol(uuid, text, uuid),
  public.yonetim_basvurular(), public.yonetim_basvuru_durum(uuid, text),
  public.kupon_siparis(text), public.yonetim_ayarlar(), public.yonetim_ayar_kaydet(jsonb),
  public.yonetim_kupon_iade(uuid, text)
from public, anon;

grant execute on function
  public.kupon_al(text, integer, date, time, integer, text),
  public.kuponlarim(), public.kupon_getir(text), public.kupon_iptal(uuid),
  public.profilim(), public.profil_guncelle(text, text, boolean),
  public.kupon_sorgula(text), public.kupon_kullan(text), public.isletme_kuponlari(integer),
  public.yonetim_ozet(), public.yonetim_kampanyalar(),
  public.yonetim_kampanya_kaydet(jsonb), public.yonetim_kampanya_durum(text, text),
  public.yonetim_isletmeler(), public.yonetim_isletme_kaydet(jsonb), public.yonetim_kuponlar(integer),
  public.yonetim_kullanicilar(text), public.yonetim_kullanici_rol(uuid, text, uuid),
  public.yonetim_basvurular(), public.yonetim_basvuru_durum(uuid, text),
  public.kupon_siparis(text), public.yonetim_ayarlar(), public.yonetim_ayar_kaydet(jsonb),
  public.yonetim_kupon_iade(uuid, text)
to authenticated;

-- Ödeme fonksiyonları yalnızca sunucu (service_role) tarafından çağrılabilir
revoke execute on function public.odeme_hazirla(text, uuid), public.odeme_onayla(text, numeric, text, text),
  public.odeme_basarisiz(text, text, text) from public, anon, authenticated;
grant execute on function public.odeme_hazirla(text, uuid), public.odeme_onayla(text, numeric, text, text),
  public.odeme_basarisiz(text, text, text) to service_role;

grant execute on function public.basvuru_gonder(text, jsonb) to anon, authenticated;

-- İç yardımcıların dışarıdan çağrılmasına gerek yok
revoke execute on function public.odeme_suresi(), public.stok_tutuyor(public.kuponlar),
  public.kupon_bedeli_hesapla(numeric, numeric) from public, anon, authenticated;
revoke execute on function public.kupon_kodu_uret(), public.satilan_adet(text),
  public.yeni_uye_profili(), public.guncelleme_damgasi()
from public, anon, authenticated;
