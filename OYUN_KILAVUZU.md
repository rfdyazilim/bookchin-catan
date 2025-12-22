# 🎮 Bookchin: Kent Ekolojisi - Oyun Kılavuzu

Murray Bookchin'in politik ekoloji felsefesinden esinlenen çok oyunculu strateji oyununa hoş geldiniz!

---

## 📋 İçindekiler
1. [Oyuna Giriş](#oyuna-giriş)
2. [Oyun Kurulumu](#oyun-kurulumu)
3. [Fraksiyonlar](#fraksiyonlar)
4. [Oyun Akışı](#oyun-akışı)
5. [Kaynaklar](#kaynaklar)
6. [Eylemler](#eylemler)
7. [Yurttaşlık İndeksi](#yurttaşlık-i̇ndeksi)
8. [Kazanma ve Kaybetme](#kazanma-ve-kaybetme)
9. [Stratejiler ve İpuçları](#stratejiler-ve-i̇puçları)
10. [Teknik Destek](#teknik-destek)

---

## 🎯 Oyuna Giriş

### Oyuncu Sayısı
- **Minimum:** 2 oyuncu
- **Maksimum:** 4 oyuncu

### Kazanma Koşulu
- İlk **10 puan** toplayan oyuncu kazanır!
- Puanlar: Yerleşimler (1 puan) + En Uzun Yol Bonusu (1 puan)

### Kolektif Kaybetme
- **Yurttaşlık İndeksi 0'a düşerse herkes kaybeder!**
- Bu oyunun özel mekaniğidir - toplumsal dengeyi korumalısınız!

---

## 🏗️ Oyun Kurulumu

### 1. Bağlanma
```
1. Oyun linkini açın
2. 4 haneli bir ODA KODU girin (örn: 1234)
3. İsminizi yazın
4. "Katıl" butonuna basın
```

💡 **Not:** Aynı oda kodunu giren tüm oyuncular aynı oyunda olur!

### 2. Lobide Bekleme
- Lobide diğer oyuncuları göreceksiniz
- Minimum 2 oyuncu olduktan sonra "Oyunu Başlat" butonu aktif olur
- Herhangi bir oyuncu oyunu başlatabilir

### 3. Fraksiyon Ataması
- Oyun başladığında herkes **otomatik olarak** bir fraksiyon alır
- Fraksiyonlar rastgele dağıtılır

---

## 🧑‍🤝‍🧑 Fraksiyonlar

Oyunda 4 farklı fraksiyon vardır. Her birinin kendine özgü maliyetleri ve özellikleri vardır:

### 1. Metropol Geliştiricileri 🏗️
- **Renk:** Turuncu
- **Yerleşim Maliyeti:** 2 Capital
- **Yol Maliyeti:** 1 Capital + 1 Tech
- **Özellik:** Hızlı genişleme, sermaye odaklı

### 2. Rant Lordları 💰
- **Renk:** Pembe
- **Yerleşim Maliyeti:** 1 Capital + 1 Tech
- **Yol Maliyeti:** 1 Capital + 1 Tech
- **Özellik:** Dengeli maliyet, spekülatif büyüme

### 3. Ekoloji Savunucuları 🌱
- **Renk:** Yeşil
- **Yerleşim Maliyeti:** 2 Eco
- **Yol Maliyeti:** 1 Civic + 1 Eco
- **Özellik:** Sürdürülebilir gelişim, ekoloji odaklı

### 4. Komünal Kentçiler ⚖️
- **Renk:** Mavi
- **Yerleşim Maliyeti:** 1 Civic + 1 Eco
- **Yol Maliyeti:** 1 Civic + 1 Eco
- **Özellik:** Dengeli toplumsal kalkınma

---

## 🎲 Oyun Akışı

### Setup Fazı (Kurulum)

**Amaç:** Her oyuncu sırayla 2 yerleşim ve 2 yol kurar (ÜCRETSİZ)

**Kurallar:**
1. Sırayla yapılır (her oyuncunun sırası gelir)
2. Önce **1 yerleşim** seçin (mavi nokta)
3. Sarı renkte gösterilen yerleşime tekrar tıklayarak onaylayın
4. "✓ Yerleştir" butonuna basın
5. Sonra **1 yol** seçin (turuncu çizgi)
6. Sarı renkte gösterilen yolu onaylayın
7. "✓ Yerleştir" butonuna basın
8. Bu işlemi 2 kez tekrarlayın
9. "Kurulumu Bitir" butonuna basın

**Yerleşim Kuralları:**
- İki yerleşim arası **minimum 2 kenar** uzaklıkta olmalı
- Komşu köşelere yerleştirilemez

### Ana Oyun Fazı

Her turda **BİR** eylem yaparsınız:

#### Seçenek A: Genişle (Expand)
Yeni yapılar inşa edin:

**1. Yerleşim Kur:**
- Fraksiyonunuzun maliyetini ödeyin
- Mevcut yol ağınızın ucuna kurulmalı
- +1 puan kazanırsınız
- Hemen kurulduğu yerdeki hex'lerden kaynak üretir

**2. Yol Kur:**
- Fraksiyonunuzun yol maliyetini ödeyin
- Mevcut yol ağınıza bağlı olmalı
- 5+ yol kurarsanız "En Uzun Yol" bonusu alabilirsiniz (+1 puan)

#### Seçenek B: Örgütlen (Organize)
Mevcut yerleşimlerinizden kaynak toplayın:

**Kaç Yerleşimden Harvest Edebilirsiniz?**
```
Organize Slotları = Math.floor(Toplam Yerleşim / 2)
Minimum: 1 slot
```

**Örnekler:**
- 2 yerleşim → 1 slottan harvest
- 4 yerleşim → 2 slottan harvest
- 6 yerleşim → 3 slottan harvest
- 9 yerleşim → 4 slottan harvest

**🔄 Döngü Mekaniği (ÖNEMLİ!):**
- Bir yerleşimden harvest yaptıktan sonra, **tüm diğer yerleşimlerden harvest yapana kadar** o yerleşimden tekrar harvest edemezsiniz
- Örnek: 6 yerleşiminiz var
  - Tur 1: A, B, C yerleşimlerinden harvest → D, E, F kullanılmadı
  - Tur 2: D, E, F yerleşimlerinden harvest → A, B, C deaktif
  - Tur 3: A, B, C tekrar aktif → Döngü yeniden başlar

**Kaynak Üretimi:**
- Her yerleşim komşu olduğu 2-3 hex'ten kaynak üretir

---

## 🎴 Kaynaklar

Oyunda 4 tür kaynak vardır:

### 1. Civic (Sivil) 🏛️
- **Renk:** Mavi
- **Kullanım:** Yerleşim, yol (ekoloji fraksiyonları için)

### 2. Eco (Ekoloji) 🌿
- **Renk:** Yeşil
- **Kullanım:** Yerleşim, yol (ekoloji fraksiyonları için)

### 3. Capital (Sermaye) 💰
- **Renk:** Pembe
- **Kullanım:** Yerleşim, yol (sermaye fraksiyonları için)

### 4. Tech (Teknoloji) ⚙️
- **Renk:** Turuncu
- **Kullanım:** Yerleşim, yol (sermaye fraksiyonları için)

---

## ⚡ Eylemler

### Takas (4:1 Kasa)
- **4 aynı kaynak** vererek **1 istediğiniz kaynak** alabilirsiniz
- "Takas (4:1 Kasa)" butonuna tıklayın
- Vermek istediğiniz kaynağı seçin (sadece 4+ olanlar aktif)
- Almak istediğiniz kaynağı seçin
- **Not:** 4:1 oranı pahalı - dikkatli kullanın!

### Oyuncu ile Takas (1:1) 🤝
**Yeni özellik!** Diğer oyuncularla 1:1 takas yapabilirsiniz:

**Teklif Etmek:**
1. Sıranız geldiğinde "Oyuncu ile Takas" butonuna basın
2. Takas yapmak istediğiniz oyuncuyu seçin
3. Ne vermek istediğinizi seçin (1 kaynak)
4. Ne almak istediğinizi seçin (1 kaynak)
5. Teklif gönderilir!

**Teklif Almak:**
- Size takas teklifi geldiğinde ekranınızda popup açılır
- Teklifi görebilirsiniz: "Sen veriyorsun X, Sen alıyorsun Y"
- **✓ Kabul Et** veya **✗ Reddet** butonlarından birini seçin
- Kabul ederseniz takas otomatik gerçekleşir

**Kurallar:**
- İkisi de seçilen kaynağa sahip olmalı
- Anlık takas - müzakere yok
- Reddedilen teklifler kaybolur

💡 **Strateji İpucu:** Oyuncu takası çok değerli! Kasa ile 4:1 yerine oyuncularla 1:1 takas yapmak çok daha verimli.

### En Uzun Yol Bonusu 🛣️
- **5 veya daha fazla** art arda yol kurarsanız bonus alırsınız
- **+2 puan** kazanırsınız (güncellenmiş!)
- Başka biri daha uzun yol kurarsa bonus ona geçer
- Bu bonus kazanmayı hızlandırır - stratejik kurun!

---

## 📊 Yurttaşlık İndeksi

**Başlangıç Değeri:** 5/10

### Nasıl Değişir?

Her tur sonunda hesaplanır:

**Kullanılan Kaynaklar:**
- O turda harcanan kaynaklar sayılır (yerleşim ve yol için)
- **Capital + Tech > Civic + Eco** → Index **-1** düşer
- **Civic + Eco > Capital + Tech** → Index **+1** artar
- Eşitse → Değişmez

### Kolektif Kaybetme
- Index **0'a düşerse** → **HERKES KAYBEDER!**
- "Kentsiz kentleşme" kazanır
- Oyun biter

💡 **Stratejik Not:** Oyuncular arasında bir denge kurulmalı. Sadece sermaye odaklı büyüme tehlikelidir!

---

## 🏆 Kazanma ve Kaybetme

### Kazanma Koşulu
```
10 Puan = Yerleşimler (1 puan/yerleşim) + En Uzun Yol Bonusu (+2 puan)
```

**Örnek:**
- 8 yerleşim + En Uzun Yol = 10 puan → **KAZANDINIZ!**
- 10 yerleşim = 10 puan → **KAZANDINIZ!**

- İlk 10 puana ulaşan oyuncu **kazanır**
- Altın renkli kazanma ekranı gösterilir
- Oyun sona erer

### Kaybetme Koşulu (Kolektif)
- Yurttaşlık İndeksi = 0
- **Tüm oyuncular kaybeder**
- Oyun sona erer

---

## 🧠 Stratejiler ve İpuçları

### Başlangıç Stratejileri

**1. Kaynak Çeşitliliği:**
- İlk yerleşimlerinizi farklı kaynak tiplerinin kesiştiği yerlere kurun
- 3 farklı hex tipinin buluştuğu köşeler idealdir

**2. Genişleme Planı:**
- Yol ağınızı stratejik noktalara doğru genişletin
- İyi konumları erken kapmaya çalışın

**3. Fraksiyon Avantajları:**
- Kendi fraksiyonunuzun maliyet yapısını öğrenin
- Buna göre kaynak toplamayı planlayın

### Orta Oyun Taktikleri

**1. Harvest Döngüsü Yönetimi:**
- Hangi yerleşimleri kullandığınızı takip edin
- Döngüyü optimize edin (en verimli yerleşimlerle başlayın)
- Tüm yerleşimleri kullanana kadar aynısından harvest etmeyin

**2. Yurttaşlık Dengesi:**
- Index'i takip edin (sağ panel)
- Düşerse: Civic/Eco kaynakları kullanın
- Yüksekse: Capital/Tech ile agresif genişleyin

**3. En Uzun Yol:**
- 5+ yol kurarak +1 bonus alabilirsiniz
- Başkası daha uzun kurarsa bonus ona geçer
- Yol ağınızı stratejik kurun

### İleri Seviye İpuçları

**1. Kaynak Yönetimi:**
- Takas yapmadan önce maliyetleri hesaplayın
- 4:1 oranı pahalı - iyi düşünün
- Harvest önceliği: En değerli kaynaklardan başlayın

**2. Rakip Analizi:**
- Diğer oyuncuların puanlarını takip edin
- 8-9 puana yaklaşanları engelleyin
- Stratejik yerlere yerleşim kurarak rakipleri sınırlayın

**3. Zamanlaması:**
- 7-8 puana geldiğinizde son hamleyi planlayın
- 10 puana ulaşmak için kaynakları biriktirin
- Organize mi yoksa genişleme mi daha mantıklı?

**4. Kolektif Oyun:**
- Yurttaşlık çok düşükse HERKES dikkat etmeli
- Bazen bir oyuncunun kazanmasına izin vermek, herkesin kaybetmesinden iyidir
- Grup sohbeti yapın.

---

## ⚠️ Sık Yapılan Hatalar

1. **Aynı yerleşimden sürekli harvest etmeye çalışmak**
   - ❌ Sistem izin vermez
   - ✅ Döngüyü takip edin

2. **Yurttaşlık İndeksini görmezden gelmek**
   - ❌ Index 0 olursa herkes kaybeder
   - ✅ Sürekli kontrol edin ve dengeyi koruyun

3. **Yerleşim mesafesi kuralını unutmak**
   - ❌ Minimum 2 kenar uzaklık gerekli
   - ✅ Haritayı iyi planlayın

**4. Takas oranını unutmak**
   - ❌ Kasa ile 4:1 çok pahalı
   - ✅ Önce oyuncularla 1:1 takas deneyin
   - ✅ Kasa takası son çare olmalı

5. **Setup fazında maliyetsiz olduğunu unutmak**
   - ✅ Setup'ta yerleşim ve yol ÜCRETSİZ
   - ✅ En iyi yerleri setup'ta kapın

---

## 🔧 Teknik Destek

### Bağlantı Sorunları

**"Reconnecting..." mesajı görüyorsanız:**
1. F12 tuşuna basın
2. Console'a `localStorage.clear()` yazın
3. Sayfayı yenileyin (F5)

**Oyun dondu mu?**
- Tarayıcıyı tamamen kapatın
- Yeniden açın ve aynı oda kodunu girin

### Mobil Cihazlarda

**Zoom sorunu:**
- Input'lara tıklarken zoom yapıyorsa normal
- Font boyutu iOS için optimize edilmiş

**Touch sorunu:**
- Hex'lere dokunup kaynak seçimi yapın
- Sarıya dönen elemana tekrar dokunun (onay)
- "✓ Yerleştir" butonuna basın

### Genel Sorunlar

**Lobiye gelmiyor:**
- localStorage'ı temizleyin
- Sunucu restart olmuş olabilir
- Yeni oda kodu ile deneyin

**Sıra bende ama oynayamıyorum:**
- Sayfayı yenileyin
- Reconnect olacaksınız

**Kaynak üretilmiyor:**
- Yerleşiminiz hex'lere değiyor mu kontrol edin

---

## 📚 Felsefe Notu

Bu oyun Murray Bookchin'in şu fikirlerinden esinlenmiştir:

- **"The Limits of the City"** → Kentsiz kentleşmenin tehlikeleri
- **"Ecology of Freedom"** → Ekolojik ve toplumsal özgürlük
- **"Communalism"** → Yerel demokrasi ve toplumsal organizasyon

Oyun mekaniği bu felsefeyi yansıtır:
- **Kolektif çöküş:** Toplumsal ekoloji dengesi
- **Fraksiyon çeşitliliği:** Politik çoğulculuk
- **Yol ağı:** Konfederalist organizasyon
- **Yurttaşlık İndeksi:** Toplumsal sürdürülebilirlik

---

## 🤝 Geri Bildirim

Bu oyun açık kaynak değildir, ancak önerileriniz değerlidir!

**Geri bildirim için:**
- Oyun sırasında karşılaştığınız sorunları not alın.
- İyileştirme önerilerinizi paylaşın.
- Yeni özellik fikirlerinizi söyleyin.

---

## 📜 Telif Hakkı ve Kullanım

© 2025 Bookchin: Kent Ekolojisi
- Bu oyun açık kaynak değildir.
- Ticari kullanım yasaktır.
- Kişisel ve eğitim amaçlı kullanım serbesttir.

---

**İyi Oyunlar! 🏛️🌱**

*"Başka bir dünya mümkün - ve o dünya şimdi burada."*
