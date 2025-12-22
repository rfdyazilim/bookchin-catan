# 🏛️ Bookchin: Kent Ekolojisi

Murray Bookchin'in politik ekoloji felsefesinden esinlenen, Catan-tarzı çok oyunculu strateji oyunu.

## 🎯 Oyun Konsepti

**Oyuncu Sayısı:** 2-4  
**Kazanma Koşulu:** 10 köy kur (settlement)  
**Kolektif Kaybetme:** Yurttaşlık İndeksi 0'a düşerse herkes kaybeder

## 🌍 Harita

- **3-4-5-4-3 hex dizilimi** (19 altıgen)
- Her hex bir kaynak tipi: **CIVIC, ECO, CAPITAL, TECH**
- Köyler hex **köşelerine** (vertex) yerleşir
- Yollar hex **kenarlarına** (edge) yerleşir

## 🧑‍🤝‍🧑 Fraksiyonlar (Asimetrik)

### 1. Metropol Geliştiricileri 🏗️
- Üretim: Sadece **CAPITAL & TECH**
- Köy maliyeti: **2 Capital**
- Yurttaşlık: Düşürmeye yatkın

### 2. Rant Lordları 💰
- Üretim: Sadece **CAPITAL & TECH**
- Köy maliyeti: **1 Capital + 1 Tech**
- Yurttaşlık: Düşürmeye yatkın

### 3. Ekoloji Savunucuları 🌱
- Üretim: Sadece **ECO & CIVIC**
- Köy maliyeti: **2 Eco**
- Yurttaşlık: Yükseltmeye yatkın

### 4. Komünal Kentçiler ⚖️
- Üretim: Sadece **CIVIC & ECO**
- Köy maliyeti: **1 Civic + 1 Eco**
- Yurttaşlık: Yükseltmeye yatkın

## 🎮 Oyun Akışı

### Setup Fazı
1. Her oyuncu sırayla **2 köy + 2 yol** yerleştirir (ÜCRETSİZ)
2. Köyler arasında en az 1 kenar mesafe olmalı
3. Tüm oyuncular hazır olunca ana oyun başlar

### Ana Oyun Fazı

Her tur oyuncu **iki seçenekten birini** yapar:

#### A) Genişle (Expand)
- Yeni **köy** kur (kaynak harcar, fraksiyon maliyetine göre)
- Yeni **yol** kur (1 Tech + 1 Capital)
- Köy kurulunca komşu hex'lerden **anında** kaynak üretir (fraksiyon filtresine göre)
- Her köy +1 puan

**Kurallar:**
- Köy ancak kendi yol ağının ucuna kurulabilir
- İki köy arası min. 2 kenar mesafe

#### B) Örgütlen (Organize)
- **Hiç köy/yol kuramazsın**
- `organizeSlots = Math.floor(köySayısı / 2)` (min: 1)
- Bu kadar köy seç
- Her seçilen köy komşu hex'lerinden kaynak üretir (fraksiyon filtresine göre)
- Tur biter

**Örnekler:**
- 1, 2, 3 yerleşim → 1 slot
- 4, 5 yerleşim → 2 slot
- 6, 7 yerleşim → 3 slot
- 8, 9 yerleşim → 4 slot

### Kaynak Takası (4:1)
- Her zaman yapılabilir
- 4 aynı kaynak → 1 istediğin kaynak

### Tur Sonu
Her tur sonunda **Yurttaşlık İndeksi** hesaplanır:

```
O turda kurulan köylerin komşu hex'lerine bak:
- Eco/Civic > Capital/Tech → Index +1
- Capital/Tech > Eco/Civic → Index -1
- Eşitse → Değişmez
```

## 🏆 Kazanma & Kaybetme

### Kazanma
- İlk **10 köyü** kuran
- VE Yurttaşlık İndeksi **> 0** olan
- → Oyunu kazanır

### Kolektif Kaybetme
- Yurttaşlık İndeksi **= 0**
- → Herkes kaybeder
- → "Kentsiz kentleşme" kazanır

## 📦 Kurulum

### Gereksinimler
- Node.js v14+
- npm

### Adımlar

```bash
# Klasörü oluştur
mkdir bookchin-game
cd bookchin-game

# Dosyaları yerleştir
# package.json, server.js → ana dizin
# index.html, style.css, client.js → public/ klasörü

mkdir public

# Bağımlılıkları yükle
npm install

# Sunucuyu başlat
npm start
```

### Oyunu Aç
Tarayıcıda: **http://localhost:3000**

## 🎲 Oyun Stratejileri

### Metropol Geliştiricileri / Rant Lordları
- Hızlı genişleme (Capital/Tech bol)
- Yurttaşlık düşürür → Risk!
- Agresif build stratejisi

### Ekoloji Savunucuları / Komünal Kentçiler
- Yavaş ama sürdürülebilir genişleme
- Yurttaşlık artırır → Güvenli
- Savunmacı organize stratejisi

### Hibrit Taktik
- Erken capital köyleri (hızlı genişle)
- Sonra eco/civic köyleri (yurttaşlığı koru)
- Denge oyunu!

## 🛠️ Teknik Detaylar

### Backend
- Node.js + Express
- WebSocket (ws)
- Axial koordinat sistemi (hex grid)
- Vertex/edge graph yapısı

### Frontend
- Vanilla JS (framework yok)
- SVG rendering (hex map)
- Rustik tahta oyun teması
- Responsive layout

## 📚 Felsefe

Oyun Murray Bookchin'in şu eserlerinden esinlenmiştir:
- **"The Limits of the City"** (Kentsiz Kentleşme)
- **"Ecology of Freedom"**
- **"Communalism"**

Oyun mekaniklerinde:
- Kolektif çöküş → Toplumsal ekoloji dengesi
- Fraksiyon asimetrisi → Politik çoğulculuk
- Network building → Konfederalist organizasyon

## 🤝 Katkıda Bulunma

Bu bir açık kaynak proje değil ama önerileriniz değerlidir!

## 📜 Lisans

MIT License

---

**Keyifli Oyunlar! 🏛️🌱**
