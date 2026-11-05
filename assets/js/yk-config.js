/* =====================================================================
   YAKALADIM — BAĞLANTI AYARLARI
   Supabase projenizi kurduktan sonra aşağıdaki iki değeri doldurun:
     Supabase > Project Settings > API (veya "Connect") bölümünden
       supabaseUrl      → Project URL      (https://xxxx.supabase.co)
       supabaseAnonKey  → anon / publishable key
   Bu anahtar herkese açık olacak şekilde tasarlanmıştır; güvenliği
   veritabanındaki kurallar (RLS) sağlar. "service_role" / "secret"
   anahtarını ASLA buraya yazmayın.

   İki değer de boşsa site DEMO MODUNDA çalışır: üyelik ve kuponlar
   yalnızca ziyaretçinin kendi tarayıcısında saklanır.
   ===================================================================== */
window.YK_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',

  // E-posta doğrulama / şifre sıfırlama bağlantılarının döneceği adres
  siteUrl: 'https://www.yakaladim.com'
};
