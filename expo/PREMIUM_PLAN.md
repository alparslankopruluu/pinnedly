# Draft Free / Premium Planı

## Ürün modeli

Draft iki kullanıcı planına sahiptir: `free` ve `premium`. Aylık ve yıllık abonelik aynı RevenueCat `draft Pro` entitlement'ını açar; aralarındaki tek fark ödeme dönemidir. Abonelik sona erdiğinde mevcut veri silinmez veya okunamaz hâle getirilmez. Yalnızca yeni Premium işlemleri ve limit üstü yeni içerik oluşturma kapanır.

## Özellik matrisi

| Özellik | Free | Premium |
| --- | ---: | ---: |
| Yer imi | 30 | Sınırsız |
| Not | 10 | Sınırsız |
| Kişisel todo | 20 | Sınırsız |
| Proje | 2 | Sınırsız |
| Yer imi listesi | 1 | Sınırsız |
| Temel arama ve düzenleme | Açık | Açık |
| Proje görevleri | Mevcut görevleri yönetme | Sınırsız yeni görev |
| Kanban | Kilitli | Açık |
| Proje galerisi | Kilitli | Açık |
| Paylaşım başlatma ve üye yönetimi | Kilitli | Açık |
| Paylaşılan davete katılma | Açık | Açık |
| Hatırlatıcı | Tek hazır aralık | Çoklu aralık, özel tarihler ve digest |
| AI asistan | Toplam 3 başarılı mesaj | UTC takvim ayı başına 100 başarılı mesaj |
| Tam veri dışa aktarma | Kilitli | JSON |
| Light/dark/system tema | Açık | Açık |

Free davetli, Premium sahibin paylaştığı içerikte verilen görüntüleyici veya editör iznini kullanabilir. Sahibi Free'ye düşen mevcut paylaşımlar bozulmaz; sahip erişimi iptal edebilir ancak yeni davet başlatamaz.

## Yetkilendirme ilkeleri

- Firebase UID, RevenueCat App User ID'dir.
- RevenueCat durumu sunucuda REST API ile doğrulanır ve yalnızca Admin SDK'nin yazabildiği entitlement belgesine kaydedilir.
- İstemci kontrolleri hızlı UX içindir; içerik limitleri, görev oluşturma, paylaşım, Premium reminder alanları ve AI kotası sunucu tarafından zorunlu tutulur.
- Limit üstündeki eski veriler okunabilir, düzenlenebilir ve silinebilir. Kullanıcı limit altına inene veya Premium olana kadar yeni kayıt oluşturamaz.
- RevenueCat/ağ geçici olarak kullanılamadığında ücretli yeni mutasyonlar güvenli biçimde kapanır; mevcut içerik erişimi sürer.
- AI kotası yalnızca başarılı yanıtta tüketilir; başarısız model çağrısında ayrılan hak geri verilir.

## Paywall kapsamı

Paywall yalnızca uygulamada bulunan özellikleri anlatır: sınırsız içerik, AI, Kanban, proje galerisi, ekip paylaşımı, gelişmiş hatırlatıcılar, bookmark digest ve tam JSON export.

Voice notes, advanced analytics, custom themes, API access, priority support, AI-powered reminders ve desteklenmeyen export formatları vaat edilmez.

## Production kontrolü

1. RevenueCat anahtarları Firebase Secret Manager'da tutulur; uygulama paketinde yalnızca public SDK anahtarı bulunur.
2. Functions, kısıtlayıcı Firestore Rules'dan önce deploy edilir.
3. RevenueCat sandbox'ta monthly/yearly purchase, unlock, restore, expiration ve cihaz değişimi test edilir.
4. Rules Emulator, Functions testleri, typecheck, lint, Expo Doctor ve temiz iOS Release build doğrulanır.
5. Remote RevenueCat paywall metinleri de bu dosyadaki kapsamla eşleştirilip publish edilir.
