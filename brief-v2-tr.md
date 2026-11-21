# BRIEF v2 — 'RAF' (çalışma adı) — CrazyGames için baskı-bulmaca
Tek kaynak doküman. 21.11.2026. Uygulayıcı: omp director + işçiler.

## 0. Bu doküman nasıl kullanılır
- Tek doğru kaynak bu metindir. Sohbet geçmişi, önceki brief, ağızdan aktarım geçersiz.
- İşçiler boş başlar: her işçiye bu dokümanın ilgili bölümü + veri sözleşmesi (5.3) verilir. Dokümanda yazmayan bir kararı işçi kendi başına veremez; verirse 9.6'daki varsayılan kurala uyar ve karar günlüğüne yazar.
- Sayı içeren her yer üç etiketten birini taşır: ÖLÇÜLMÜŞ (bu hafta ürettiğimiz sayı), OLGU (kaynaklı platform gerçeği), VARSAYIM (sınanacak). VARSAYIM'lar bölüm 8 kapısıyla ve bölüm 10 tablosuyla sınanır.
- Dil: doküman Türkçe; oyun içi metin İNGİLİZCE (QA şartı). Kod tanımlayıcıları İngilizce, yorum Türkçe olabilir.

## 1. Ürün
Tek cümle: 8x8 rafa aynı renk sandıkları yerleştirip 4+ bağlayarak temizlediğin, her 4 yerleştirmede rafın dış halkasının çöktüğü, tek oturumda zincirlenen 2D bulmaca.
Kimlik çapası (QA notuna da yazılacak): 'temizlemek alanı geri verir, temizlememek alanı yer.' Mekanik farklılaştırıcı budur; görsel değil.
Çalışma adı: RAF. Nihai isim İngilizce olacak; karar sahibi Mahsun, son tarih gün 18. O güne kadar kodda 'raf' sabiti kullanılır, isim değişince yalnız config değişir.

## 2. Çekirdek döngü — spesifikasyon
### 2.1 Tahta ve parçalar
- Tek ekran, tek girdi: parçayı tepsideki 3 yuvadan birinden tahtaya sürükle-bırak. Döndürme YOK (v1).
- Aktif alan 8x8 başlar. Her hücrede 1 renk + 1 glif (▲ ● ■ ✦). 3 renkle başlar; 4. renk wave 4'te açılır.
- Parça: tek renkli 1-3 hücre (tekli, domino, L-tromino). Tepside 3 parça görünür; biri yerleşince kuyruktan yenilenir. Kuyruk tohumdan üretilir (deterministik).
- Yerleştirme: parça yalnız boş hücrelere ve aktif alan içinde kalacak şekilde bırakılır. Yerleşen hücreler kalıcıdır.
### 2.2 Temizleme
- Aynı renkte 4+ ortogonal komşu küme temizlenir. Puan = 10 x hücre. Zincir (temizleme sonrası yeni küme oluşursa) çarpanı 1.5 / 2 / 2.5.
- Her 5. temizleme bir halka geri açar (aktif alan +1, max 8x8); açılan halka boş olmalı.
### 2.3 Baskı (kapanma)
- Her 4 yerleştirmede aktif alan bir halka daralır: 8→7→6→5→4. Daralan halkadaki dolu hücreler yok olur ve 'zayi' sayacına yazılır (zayi x 50 puan ceza).
- Alt sınır 4x4. 4x4'te daralma durur; baskı artık yalnız 'sığmama' üzerinden gelir.
### 2.4 Run ve wave
- Run = tek tahta, tek oturum parçası. Wave = 8 yerleştirme. Wave sınırında zorluk adımı: wave 2'de tromino+L, wave 4'te 4. renk, wave 6'da 4 hücreli parça.
- v1'de run içinde mekanik açılmaz: her run wave 1'den başlar. (Gerekçe: tekrar oynanabilirlik; ilk 10 saniye her zaman aynı netlikte.)
- Kalıcı ilerleme Sprint 3'te: her 2 wave'de 1 özellik açılır (max 4), save'e yazılır.
### 2.5 Bitiş
- Run, tepsideki HİÇBİR parçanın aktif alana sığmamasıyla biter. Can, süre, hamle hakkı yok.
- Bitiş ekranı: skor, wave, süre, en iyi skor ve TEK 'PLAY AGAIN' butonu. Geri sayım, ödül vaadi, reklam zorlaması yok.
### 2.6 Günlük tahta ve streak
- Seed = fnv1a('raf-' + YYYY-MM-DD). Aynı gün, aynı ilk 10 parça. Sıralama yok.
- Streak yerel: gün tamamlanınca +1. Saat kuralı: geri alınan saat yok sayılır; 2+ gün ileri sıçrama sıfırlar; gün atlanırsa sıfırlar.
- Günlük tahta çekirdek değildir: ayrı buton; run akışı onsuz tam çalışır.
### 2.7 Ayar tablosu — TEK KAYNAK: src/config/tuning.js
| Anahtar | v1 değeri | Etiket |
|---|---|---|
| arena başlangıç | 8x8 | VARSAYIM A1 |
| daralma sıklığı | her 4 yerleştirme | VARSAYIM A1 |
| geri açma | her 5 temizleme | VARSAYIM A1 |
| küme eşiği | 4 | VARSAYIM |
| tepsi | 3 parça | VARSAYIM |
| wave uzunluğu | 8 yerleştirme | VARSAYIM |
| hedef run süresi (medyan) | 5-8 dk | VARSAYIM A1 |
| hedef oturum (medyan) | >=10 dk ve >=2 run | OLGU: Basic Launch KPI eşiği |
Kural: tuning.js dışında oyun sabiti yasak. CI'da lint kuralı; ihlal = kırmızı build.

## 3. Kapsam dışı (v1)
| Dışarıda | Gerekçe |
|---|---|
| Multiplayer / backend | CrazyGames sunucu vermiyor; tek geliştirici |
| Yerel 2P hot-seat | Kanıt var (2P medyan 28,6 M) ama kapsam. Tetik: Basic Launch D1 <%10 ise v1.1 adayı |
| Merge/dekorasyon meta, idle, clicker | Doymuş stok (256 merge, 582 idle) + canlı operasyon yükü |
| .io, brainrot klonu | Backend + klon reddi |
| Leaderboard | Davetli, oyun başına tek, haftalık reset; sıfır bağımlılık |
| IAP | v1'de yok |
| Rewarded reklam | v1'de yok; bedeli 4.6'da sayıyla |
| Hikâye, seviye haritası, çoklu mod | Kapsam |
| İngilizce dışı dil | QA İngilizce istiyor |
| Döndürme, hold yuvası | Sprint 3'te hold değerlendirilir; döndürme yok |

## 4. Platform kuralları — ihlal edilemez
Kaynak: docs.crazygames.com, 21.11.2026 canlı okuma. Hepsi doğrulanmış olgu.
### 4.1 Teknik
- Toplam build <=250 MB, <=1500 dosya, ilk indirme <=50 MB; mobil ana sayfa için <=20 MB. Bizim hedef: <=5 MB.
- Tüm yollar RELATIVE (absolute path çalışmıyor). Vite base './'; CI'da src="/ ve href="/ grep testi.
- Chrome + Edge zorunlu; 4 GB Chromebook'ta akıcı olmalı, yoksa ChromiumOS'ta kapatılır.
- Yükleme <10 sn (hedefimiz <3 sn); oynanışa ulaşma <=20 sn.
- Masaüstünde landscape oynanabilir olmalı; portrait kabul (yanlarda bar).
- Cihaz tespiti platformun system info'suyla; ontouchstart KULLANILMAZ (dokunmatik laptoplular yüzünden).
### 4.2 Reklam (bunlar red sebebi)
- Midgame yalnız run bitişinde. Navigasyon butonlarında (menü, ayarlar, mağaza) midgame YASAK.
- Sıklığı SDK yönetir: en fazla 3 dakikada 1; erken istekler sessizce yok sayılır. Bizim tarafta ek frekans mantığı KURULMAZ; doğru anda istenir, gerisi SDK'ya bırakılır.
- Reklam sırasında oyun duraklar ve ses kısılır; adError durumunda oyun devam eder.
- Banner yok (v1). Rewarded yok (v1).
- Adblock kullanıcı oyunu tam oynayabilir; cezalandırma yasak.
### 4.3 Basic Launch provası
- SDK entegre ama reklamlar KAPALIYKEN oyun donmamalı, ölü buton göstermemeli. Bu QA red sebebi; config flag'iyle zorunlu test (AC4.4).
### 4.4 KPI (Basic Launch: 7 gün ve >=500 oynanma, ikisi birlikte)
- Ortalama oturum >=10 dk. D1 %10-15 (platform ortalaması %6,7). Conversion (>1 dk oynayan) >=%80. Yükleme <10 sn. Build <20 MB.
- 23.11.2026'dan sonra başlayan Basic Launch'larda 4. metrik CTR. Bizim yayınımız bu tarihten sonra: CTR kapı.
### 4.5 Özgünlük
- QA reddi: klon/asset flip, uygunsuz tema, PEGI-12 dışı içerik, İngilizce yok.
- Mekanik özgünlük gerekçesi (bölüm 1'deki kimlik çapası) QA notuna yazılır. Tüm asset kaynak+lisans bilgisi /docs/licenses.md'de tutulur; mevcut oyunlardan hiçbir asset/isim/ikon alınmaz.
### 4.6 Rewarded kararının bedeli (çıkarım)
- Puzzle kategorisi 8,9 gösterim/oynanma (4,2 rewarded + 4 midgame). Rewarded'sız üst sınır ~4,7.
- 1000 gösterim başına $4 varsayımıyla 100 bin oynanmada brüt ~$3.560 yerine ~$1.880; yani kabaca yarısı.
- Bu kayıp bilerek kabul ediliyor (kapsam). v1.1 adayı: run başına 1 kez, wave >=3 şartı, reklamsız alternatif yollu uyumlu rewarded.

## 5. Teknik kararlar
### 5.1 Engine: PixiJS 8 + Vite. Karar VERİLDİ, tartışılmaz.
Gerekçe: (a) 2D hücre/parçacık yükü tam Pixi'nin işi; sprite batch + ticker + basit tween ile 60 fps düşük risk. (b) Phaser'ın sahne/asset/fizik hattı bu oyunda gereksiz; fazla kavram boş başlayan işçileri yanıltır. (c) Saf Canvas'ta juice (tween, parçacık, metin) elle yazılır, Sprint 2'yi 3-5 gün yer. (d) Unity iOS'ta varsayılan kapalı + WebGL bellek riski; Godot web export boyut/perf riski; Construct'ta solver/CI kontrolü zayıf.
Geri dönüş protokolü (tek seferlik, gün 1 sonu): prod build gz <=700 KB; Chrome 4x CPU throttle'da 64 hücre + 60 parçacık >=55 fps; ilk kare <=1.5 sn. Biri tutmazsa gün 2'de 4 saatlik vanilla Canvas spike (aynı sahne) ve karşılaştırma. Sonuç /docs/decisions/002-engine.md: ölçüm tablosu + seçim. Mahsun'a sorulmaz; gün 2 18:00'de kapanır.
### 5.2 Kısıtlar
- Saf JS (ES modül). Framework yok, TypeScript yok (JSDoc yeterli — işçi hızı).
- 60 fps tanımı: 4x CPU throttle altında ortalama >=55, 1% low >=40.
- İlk kare <=3 sn (Fast 3G + 4x CPU). Build gz <=5 MB (hedef 2 MB).
- Tüm oyun metni İngilizce, tek strings dosyası.
### 5.3 Veri sözleşmesi — paralel çalışmanın şartı
state = { v:1, seed, mode:'run'|'daily', placements, wave, arena:{x0,y0,w,h}, cells:[{x,y,c,g}], tray:[id,id,id], queue:[...], score, clears, waste, status:'playing'|'over' }
step(state, action) -> { state, events:[] }   // saf fonksiyon
Kurallar:
- step() DOM veya Pixi import etmez.
- Rastgelelik yalnız mulberry32(seed) üzerinden.
- Aynı seed + aynı aksiyon dizisi = aynı state (hash testi zorunlu).
- Renderer state okur, state yazmaz. Generator yalnız kuyruk üretir.
Olay listesi (hem renderer hem telemetri tüketir): piece_placed, invalid_drop, cluster_cleared{cells,chain,mult}, ring_collapsed{n}, ring_restored, wave_up{n}, run_started, run_ended{reason,score,wave,ms}, daily_done, ui_click{id}.
### 5.4 Üretim ve doğrulama
- Bot: sabit heuristic (en çok komşu eşleşen yerleştirme; eşitlikte merkeze yakın), deterministik, kod /tools/bot.js.
- Core run kapısı (her PR): 200 seed x bot -> >=%90 seed wave 4'e ulaşır; hiçbir seed 12. yerleştirmeden önce ölmez. Süre <=120 sn.
- Günlük tahta kapısı (build CI): 365 gün x 1 koşu, bütçe 1 sn/board (~6 dk toplam). Kural: bot wave 3'e ulaşmalı. Ulaşmazsa seed'e '-r1', '-r2' eklenir (max 3 deneme); türetme kuralı yazılı olduğu için tarih-tohum sözü bozulmaz. Sonuç /reports/daily-365.json.
- Bu bot 'çözülebilirlik kanıtı' DEĞİLDİR (A4). Optimal çözüm iddiası yok; iddia yalnız 'sığmama ile 12. hamlede ölüm yok'.
### 5.5 Tek ayar kaynağı: src/config/tuning.js (2.7).
### 5.6 Kayıt: localStorage + CG Data module ikili yazım; şema {v, best, totalRuns, streak, dailyDone, lastDay, sound, unlocks}; çakışmada daha yüksek değer; sürüm artışında migrasyon fonksiyonu.
### 5.7 Sanat/ses: AI üretim + CC0 paket; her asset /docs/licenses.md'ye kaynak+lisans ile yazılır.

## 6. Telemetri ve KPI ölçümü
### 6.1 Yerel log
- 5.3 olayları bellek ring buffer'ında (max 5000), JSON export butonu (dev build'de gizli). Ağ çağrısı yok.
### 6.2 Kim ne ölçer
| Metrik | Kaynak | Not |
|---|---|---|
| Ortalama oturum | CG paneli (birincil) + yerel log (ikincil) | platform ölçer |
| D1 retention | CG paneli | yerelde ölçülemez |
| Conversion (>1 dk) | CG paneli | yerelde ölçülemez |
| CTR | CG paneli (kapak) | kapak kalitesine bağlı |
| Runs/session, run süresi, ilk temizleme süresi, 2. run oranı | yerel log / gözlem | 8. bölüm kapısı |
Kritik: D1 ve conversion yerelde ölçülemez (kullanıcı kimliği yok). Bu yüzden 3. gün kapısı platform metriklerine değil, kendi davranış metriklerimize bakar.

## 7. Takvim ve sprint kabul kriterleri
Toplam 35 gün (5 hafta) Basic Launch'a; Full Launch 6-8. hafta. Kanıtlı benzerler 1-3 ay; bu takvim ancak kapsam dar kalırsa tutar. Tarih sözü değil, kapı sözü.

### Gün 0 (yarım gün) — iskelet
- AC0.1 npm run build -> dist; tüm yollar relative (grep testi geçer); CI yeşil.
- AC0.2 CI: build + gz boyut raporu + determinizm testi + lint (tuning dışı sabit sayı yasağı).
- AC0.3 Playtest linki yayında; telefon ve masaüstünde açılıyor.
Kanıt: link, CI ekran görüntüsü, boyut raporu.

### Sprint 1 — gün 1-3 — çekirdek
- AC1.1 Tek run uçtan uca: başlat -> yerleştir -> temizle -> kapanma -> fail -> PLAY AGAIN. Fare tek başına yeterli.
- AC1.2 Determinizm: 10 seed x 100 rastgele aksiyon -> state hash %100 eşleşir.
- AC1.3 Baskı erişilebilir: 5 kör testten >=4'ü 8 dk içinde fail görür.
- AC1.4 Performans: gz <=5 MB; ilk kare <=3 sn (Fast 3G + 4x CPU); >=55 fps ortalama, 1% low >=40.
- AC1.5 Girdi gecikmesi: bırakma -> görsel yanıt <=100 ms (20 örnek medyanı, log kanıtlı).
- AC1.6 Geçersiz bırakma: görsel + ses geri bildirimi <=100 ms; parça tepsie döner.
- AC1.7 Telemetri: 5.3 olayları yazılıyor, JSON export çalışıyor.
- AC1.8 Renk körlüğü: 4 renk protanopia simülasyonunda ayırt edilebilir; her rengin ayrı glifi var.
Kanıt: 90 sn kayıt (tam run), CI çıktısı, perf raporu, 5 test notu.
Sonunda: DUR. Bölüm 8 kapısı.

### Sprint 2 — gün 4-10 — hissiyat + mobil
- AC2.1 Geri bildirim matrisi: her olay için >=3 eşzamanlı kanal (görsel/ses/sayı-hareket); tablo dosyada.
- AC2.2 Temizleme: parçacık patlaması + hücre pulse 1.0→1.25→1.0 <=180 ms + shake <=6 px / <=120 ms + sayı pop + ses. 4 zincirli temizlemede >=50 fps.
- AC2.3 İlk temizlemeye süre: yeni oyuncuda medyan <=20 sn (5 kişi).
- AC2.4 Ses: 8 SFX + 1 döngü; mute kalıcı; reklam kancası sesi 0'a çeker.
- AC2.5 Mobil: 360x640'ta arena tam görünür; dokunma hedefi >=44 px; parmak ofseti +40 px; portrait ve landscape oynanabilir.
- AC2.6 Reklam yeri: yalnız run_ended anında 1 istek; run içinde istek yok (log kanıtı).
- AC2.7 Onboarding: 3 ipucu, bloklamayan, ilk run'da 1 kez, atlanabilir, İngilizce.
Kanıt: 3 dk kayıt (2 run), mobil kayıt, fps grafiği, geri bildirim matrisi.

### Sprint 3 — gün 11-17 — meta, günlük, kayıt
- AC3.1 Kayıt: best, totalRuns, streak, sound reload sonrası korunur; şema v + migrasyon var.
- AC3.2 Streak saat testi: 10 senaryo (geri saat, +2 gün sıçrama, gün atlama, ilk gün) hepsi geçer.
- AC3.3 Günlük: aynı gün iki cihazda aynı ilk 10 parça (test); buton ayrı; streak'e bağlı.
- AC3.4 Üretim kapıları: core 200 seed >=%90 wave 4 (<=120 sn); 365 günlük rapor <=10 dk ve tüm günler geçer.
- AC3.5 Kalıcı açılımlar: 4 özellik, her 2 wave'de 1, açılış bildirimi var, save'e yazılıyor.
Kanıt: CI süreleri, /reports/daily-365.json, test listesi, 60 sn kayıt (günlük akış).

### Sprint 4 — gün 18-28 — kimlik, kapak, SDK, QA
- AC4.1 Görsel kimlik: çökme/raf metaforu tüm ekranlarda; palet 3+1; font lisansı dosyada; licenses.md tam.
- AC4.2 Kapak/ikon: 3 varyant CG ölçülerinde. 12 kişiyle 10 sn anlaşılırlık testi ('ne yapıyorsun?' -> doğru fiil >=%70) ile kazanan seçilir. A/B YOK: yeni oyun trafiği (binler) iki varyantı ayırmaz.
- AC4.3 SDK: init; gameplayStart/Stop her run sınırında; happytime run sonunda; midgame yalnız run_ended; adError'da devam; adblock'ta tam oynanır; reklamda pause + mute.
- AC4.4 Basic Launch provası: reklamlar config ile KAPALI; oyun donmuyor; ölü buton yok (ekran kaydı).
- AC4.5 İngilizce: tüm UI stringleri harici dosyada; build'de Türkçe metin yok (grep).
- AC4.6 QA matrisi: Chrome / Edge / 4 GB Chromebook / landscape / portrait / relative path / dosya sayısı / boyut — her satır GEÇTİ.
Kanıt: test matrisi, kapak testi notları, dist raporu, 2 dk kayıt.

### Sprint 5 — gün 29-35 — yayın
- AC5.1 QA gönderimi gün 29. Red gelirse düzeltme turu <=5 gün.
- AC5.2 Basic Launch başlar; 7 gün ve >=500 oynanma penceresi kapanınca KPI tablosu doldurulur.
- AC5.3 Karar: oturum >=10 dk ve D1 >=%10 -> Full Launch hazırlığı. Altındaysa 1 iterasyon (kapak + ilk 30 sn) ve tekrar ölçüm; yine altındaysa dur + rapor.

## 8. 3. gün ölüm kapısı
Amaç: çekirdeğin kendi kendine ikinci run'ı başlatıp başlatmadığını ölçmek. Bu kapı geçilmeden içerik işi (meta, günlük tahta) başlamaz; yalnız hata düzeltme ve hissiyat devam eder.
Kim: Mahsun 12-20 kişi bulur (min 12). En az 4'ü blok/puzzle oynamamış, en az 4'ü mobil.
Ne zaman: Sprint 1 tesliminden sonraki 24 saat içinde.
Protokol (değiştirilemez):
1. Kişi tek başına, sessiz ortam. Tek cümle: 'İstediğin kadar oyna.' Başka açıklama, ipucu, süre baskısı yok.
2. Gözlemci notu: ilk yerleştirme sn, ilk temizleme sn, ilk fail sn, fail sonrası 30 sn içinde kendiliğinden yeni run (E/H), toplam run, toplam süre.
3. 10 dk üst sınır; kişi bırakırsa bırakır.
4. Sonunda tek soru: 'Ne yapmaya çalışıyordun?' Doğru cevap: aynı renkleri 4+ bağlayıp temizlemek.
Birincil metrik: kendiliğinden 2. run oranı (tanım: fail sonrası 30 sn içinde, yönlendirme olmadan yeni run).
Eşikler (testten ÖNCE kayıtlı):
- GEÇ: oran >=%50 ve medyan oturum >=8 dk -> Sprint 2 tam hız.
- TEKRAR (1 hak): oran %30-49; veya oran <%50 ama katılımcıların >=%60'ı kuralı yanlış anlatıyor -> 3 gün odak düzeltme (ilk 10 sn netliği + fail/restart anı), 12 yeni kişiyle aynı protokol.
- DUR: oran <%30 ve anlama iyi; VEYA medyan oturum <5 dk; VEYA tekrar turunda hâlâ eşik altı -> rapor + dur.
Karar: Mahsun. 48 saat içinde karar gelmezse varsayılan TEKRAR (1 kez); o da eşik altıysa DUR.
Dürüstlük notu: n=12-20 yön gösterir, istatistiksel test değil. Gerçek oran %30 iken 12 kişide 6/12 görme şansı ~%12; bu yüzden tekrar hakkı var. Takvim baskısı eşiği değiştirmez.
Kapı raporu (1 sayfa): n, oran, medyan oturum, run dağılımı, anlama oranı, 3 alıntı, karar önerisi.

## 9. Çalışma protokolü
### 9.1 Workstream'ler (paralel; sözleşme 5.3)
| W | İş | Katman | İlk teslim |
|---|---|---|---|
| W1 | Sim: state, step(), kurallar, determinizm testleri | good | gün 1 sonu |
| W2 | Renderer + juice + mobil girdi | fast | gün 2 sonu |
| W3 | Generator + bot + CI kapıları | fast | gün 2 sonu |
| W4 | UI kabuğu, i18n strings, telemetri, SDK | fast | gün 3 sonu |
Kural: W1 ve W2 birbirini import etmez; iletişim yalnız state + events. W1 testleri geçmeden W2 yeni olaya bağımlı görsel iş merge etmez.
### 9.2 Her sprint raporu (zorunlu şablon)
(1) build linki + commit hash. (2) AC tablosu satır satır GEÇTİ/KALDI + kanıt linki. (3) KALDI maddeleri + neden + tahmini süre. (4) Sonraki sprintin en büyük riski. (5) Karar günlüğüne eklenenler.
'Tamamlandı' kelimesi kanıtsız kullanılamaz. Ölçüm yoksa madde KALDI'dır.
### 9.3 Kanıt tanımı
Ekran kaydı (belirtilen süre ve içerik), perf raporu (sayı), test notu (kim, kaç kişi, ne oldu), CI logu. Tek ekran görüntüsü kanıt değildir.
### 9.4 Karar günlüğü
/docs/decisions/NNN-baslik.md: karar, seçenekler, gerekçe, sayı, tarih, durum (KABUL / BEKLEMEDE-MAHSUN).
### 9.5 Mahsun'a soru iş durdurmaz
Soru + varsayılan dal + son bekleme tarihi yazılır; director varsayılan dalla devam eder.
### 9.6 Varsayılan dal kuralı
Dokümanda yazmayan durumda en küçük kapsamlı, geri alınabilir seçenek uygulanır ve karar günlüğüne yazılır.
### 9.7 Bloklanma
2 saatten fazla blok varsa iş atlanmaz; varsayılan dalla ilerlenir, blok rapora yazılır.
### 9.8 Commit
Küçük, tek konu, mesaj İngilizce. Her PR'da 5.4 kapıları yeşil olmalı.

## 10. Varsayımlar ve yanlışlanma koşulları
| # | Varsayım | Yanlışlayan ölçüm | O zaman |
|---|---|---|---|
| A1 | 8x8 + her 4 yerleştirmede daralma 5-8 dk run üretir | G1 medyan run <3 dk veya >12 dk | tuning: daralma sıklığı / arena boyu |
| A2 | Baskı eğlenceli, ikinci run isteği doğar | G1 2. run <%50 | tekrar turu; hâlâ düşükse DUR |
| A3 | Mobil drag kullanılabilir | mobil testte yanlış bırakma >%15 | hedef/ofset yeniden; gerekirse 'dokun-sonra-dokun' modu |
| A4 | Bot eşiği (wave 4) gerçek zorluğu temsil eder | G1'de oyuncular botun yarısına ulaşamıyor | eşik ve zorluk eğrisi yeniden |
| A5 | Günlük tahta + streak D1'i yükseltir | Basic Launch D1 <%10 | günlük tahta bakımı düşürülür; kapak + ilk 30 sn'ye yatırım |
| A6 | 10 sn kapak testi CTR'yi temsil eder | canlı CTR düşük | kapak değiştirilir, test protokolü revize |
| A7 | $4/1000 gösterim ve 8,9 gösterim/oynanma bu oyun için geçerli | ilk gerçek ödeme | gelir modeli yeniden |
| A8 | 4-6 hafta yeter | Sprint 3 sonunda AC'lerin <%80'i geçmiş | kapsam kesintisi |
Kapsam kesintisi sırası (yazılı, tartışmasız): önce günlük tahta, sonra kalıcı açılımlar, en son hissiyat.

## 11. Mahsun'a açık sorular (iş durdurmaz)
1. Nihai İngilizce isim: 3 aday, karar gün 18'e kadar. (varsayılan: RAF çalışma adı kalır)
2. Sanat: AI üretim serbest mi, bütçe var mı? (varsayılan: AI + CC0, bütçe 0)
3. 12-20 tester iki tur için bulunabilir mi? (varsayılan: bulunur; bulunamazsa kapı 8 kişiyle yapılır ve raporda belirtilir)
4. Developer portal: ana sözleşmedeki gelir payı teyit edilecek (kanıt paketinde %60 yalnız jam şartında yazılı).
5. Full Launch tarihi sabit mi, KPI'ya mı bağlı? (varsayılan: KPI'ya bağlı)

## 12. İlk 24 saat (sırayla)
1. /docs/decisions/001-kapsam.md: bu brief'in kabulü + A listesi.
2. Repo iskeleti: Vite + Pixi, base './', tuning.js, strings.js.
3. W1: state şeması + step() iskeleti + 3 birim test (yerleştirme, temizleme, daralma).
4. W3: mulberry32 + kuyruk üretici + bot iskeleti + 200 seed koşusu (kurallar bitmeden yer tutucu eşik).
5. W4: telemetri olay listesi + JSON export + CI (boyut, relative path, determinizm).
6. W2: Pixi sahnesi, 8x8 grid, sürükle-bırak, geçersiz bırakma geri bildirimi.
7. Gün 1 18:00: 5.1 ölçüm tablosu -> engine kararı kapanır.
8. Gün 3 18:00: AC1.1-AC1.8 tablosu + 90 sn kayıt + kapı raporu taslağı.

Bu doküman dışında hiçbir bağlam yok.