# Brief — "Raf Baskısı" (çalışma adı): CrazyGames için ilerlemeli baskı-bulmaca

## Ne yapıyoruz
Tek ekranlı, tek girdili (drag & drop; masaüstü fare + mobil dokunma) bir HTML5 bulmaca oyunu. CrazyGames'e yayınlanacak. Çekirdek fikir: **her hamle tahtayı daraltır** — oyuncu hamle yaptıkça oyun alanı kapanır, temizleme baskısı artar. Tetris'in temposu + eşleştirme rahatlığı.

## Çekirdek tasarım (rev onaylı, bu sıra önemli)
1. **OTURUM MOTORU ÇEKİRDEK:** Tek oturumda 12-20 tur zincirlenebilir. Her turda daralma baskısı artar (dolma hızı, kapanma deseni, hedef yükselir). Her 3-5 turda yeni bir mekanik/taş türü açılır (öğretici aşamalı: tek mekanik → kombo → engel taşlar → özel taşlar). "Bir tur daha" hissi = tasarımdaki en önemli metrik.
2. **GÜNLÜK TAHTA YAN RİTÜEL:** Tarihten tohumlanmış (deterministik seed) günlük tahta; yerel **streak sayacı** ("üst üste 12 gün"). Günlük tahta asla çekirdek oyun olamaz — yan etkinlik.
3. **SKOR SİSTEMİ LOKAL:** Kişisel en iyi, tur rekorları, streak. **CrazyGames Leaderboards'a HİÇBİR kritik işlev bağlama** (davetli, oyun başına tek, haftalık reset — bizim için yok). Davet gelirse bonus katman olur, oyun onsuz tam çalışır.
4. **ÖLÜM/DUR KOŞULU:** 3. gün sonunda oynanabilir prototip 10-20 kişiye verilir. **Kendiliğinden 2. tur başlatma oranı** ölçülür. Başlatmıyorlarsa proje durur ve rapor gelir — devam kararı Mahsun'undur.

## Platform kuralları (kanıtı doğrulanmış, ihlal etme)
- SDK: init, gameplayStart/gameplayStop, midgame video reklam **3 dakikada 1'den sık olamaz**, happytime, Data module ile kayıt (localStorage + CG SDK data). Rewarded şimdilik YOK (tüketilebilir/can sistemi yok; ileride boost eklersek açılır — v1 kapsamı dışı).
- Yapmayacaklar: brainrot/klon kimlik, .io/multiplayer, merge-meta, suika klonu, idle-tycoon, leaderboard bağımlılığı, cross-promotion. İsim/ikon/görsel tamamen özgün; mevcut oyunlarla karıştırılmamalı (TenTrix/blok-bulmaca soyundan görsel olarak ayrış).
- UI dili İngilizce (QA şartı). Solo mod ana vaat; hot-seat 2P yalnızca masaüstü bonus'u, v1'de YOK (sıra tabanlı hot-seat talep kanıtsız).

## Teknik hedefler
- Saf HTML5/JS (engine seçimini sen yap: vanilla Canvas / PixiJS / Phaser — gerekçeni yaz).
- Build < 5 MB, ilk kare < 3 sn (4 GB Chromebook'ta bile), 60 fps hedef.
- Tahta üretici: tarih-tohumlu günlük tahta + seviye üretimi; **yayından önce 365 günlük tohum + solver ile çözülebilirlik CI doğrulaması**.
- Masaüstü + mobil aynı girdi modeli; mobil ana sayfa eşiği 20 MB altında kal.

## Takvim (4-6 hafta, aşama kapıları var)
- Sprint 1 (İLK 3 GÜN, şimdi başla): oynanabilir çekirdek — tahta, yerleştirme/eşleşme kuralı, daralma baskısı, skor, game over, yeniden başlat. Görsel placeholder olabilir. **Bitince dur, test kapısı için rapor ver.**
- Sprint 2 (4-7. gün): juice — animasyon ritmi, patlama tatmini, ses, ekran sarsıntısı; 3. gün testi (10-20 kişi, Mahsun bulacak).
- Sprint 3 (2. hafta): ilerleme sistemi, streak, günlük tahta, Data module kayıt.
- Sprint 4 (3-4. hafta): özgün görsel kimlik, ikon/kapak A/B (1 alternatif), CG SDK tam entegrasyon, QA için teslim kalitesi.
- KPI hedefleri (Basic Launch): oturum 10+ dk, D1 %10-15, conversion %80+, build <5 MB.

## Çalışma şekli
- Vibe director: işi bağımsız workstream'lere böl (ör. motor/oyun mekaniği, board generator, juice/görsel). Her workstream kendi worker'ında.
- Her sprint sonunda: ne çalıştı, ne eksik, ölçülebilir kanıtla rapor. "Tamamlandı" = çalışan build + ekran kaydı/görüntü.
- Karar gerektiren yerde (engine seçimi, tema, isim) 2-3 seçenek + önerinle Mahsun'a sor.

## Başlangıç noktası
Sprint 1'i başlat: klasörü hazırla (git init'li, boş), engine kararını ver, oynanabilir çekirdeği 3 gün içinde çıkar. İlk hamle olarak bana (director'a) sprint 1'in workstream planını göster: hangi worker, hangi brief, hangi kabul kriterleri.
