const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema
db.exec(`
CREATE TABLE IF NOT EXISTS hastalar (
  id TEXT PRIMARY KEY,
  ad TEXT,
  soyad TEXT,
  tel TEXT,
  dogumTarihi TEXT,
  kaynak TEXT,
  saglikNotu TEXT,
  notlar TEXT,
  olusturmaTarihi TEXT
);

CREATE TABLE IF NOT EXISTS hizmetler (
  id TEXT PRIMARY KEY,
  ad TEXT,
  kategori TEXT,
  tekFiyat REAL,
  paketFiyat REAL,
  paketSeans INTEGER,
  aktif INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS randevular (
  id TEXT PRIMARY KEY,
  hastaId TEXT,
  hizmetId TEXT,
  hizmetAdi TEXT,
  tarih TEXT,
  saat TEXT,
  durum TEXT,
  ucret REAL,
  odemeDurumu TEXT,
  odemeYontemi TEXT,
  notlar TEXT,
  paketId TEXT,
  islemId TEXT
);

CREATE TABLE IF NOT EXISTS paketler (
  id TEXT PRIMARY KEY,
  hastaId TEXT,
  hizmetId TEXT,
  hizmetAdi TEXT,
  toplamSeans INTEGER,
  kalanSeans INTEGER,
  paketFiyati REAL,
  odenenTutar REAL,
  kalanBorc REAL,
  satisTarihi TEXT,
  durum TEXT
);

CREATE TABLE IF NOT EXISTS islemler (
  id TEXT PRIMARY KEY,
  tip TEXT,
  hastaId TEXT,
  tutar REAL,
  yontem TEXT,
  kategori TEXT,
  aciklama TEXT,
  tarih TEXT
);
`);

// Seed services if empty
const hizmetCount = db.prepare('SELECT COUNT(*) as c FROM hizmetler').get().c;
if (hizmetCount === 0) {
  const seedLazer = [
    ['Tam Bacak', 1000], ['Kol Altı', 600], ['Özel Bölge', 900], ['Tam Kol', 800],
    ['Yarım Bacak', 750], ['Yarım Kol', 600], ['Göbek Çizgisi', 500], ['Bel Çukuru', 500],
    ['Komple Sırt', 1000], ['Meme Ucu', 400], ['Göğüs Erkek', 1200], ['Erkek Tam Kol', 1300],
    ['Erkek Ense', 600], ['Erkek Yanak', 500], ['Erkek Sırt', 1300], ['Yüz', 700],
    ['Dudak Üstü', 300], ['Çene', 400], ['Boyun Altı', 500], ['Favori', 500],
    ['Popo', 750], ['Komple Kemerüstü', 4500]
  ];
  const seedCilt = [
    ['Cilt Bakımı Klasik', 1000, 3500], ['Cilt Bakımı Medikal', 1700, 6000],
    ['Cam Cilt', 2000, 7500], ['Yosun Peeling', 2000, 7500],
    ['Dermapen', 2000, 7500], ['Karbon Peeling', 2500, 9000]
  ];
  const seedDiger = [
    ['Dövme Silme', 0], ['Microblading', 3500], ['Rötuş', 650]
  ];
  const ins = db.prepare(
    'INSERT INTO hizmetler (id, ad, kategori, tekFiyat, paketFiyat, paketSeans, aktif) VALUES (?, ?, ?, ?, ?, ?, 1)'
  );
  seedLazer.forEach(([ad, fiyat]) => ins.run(randomUUID(), ad, 'Lazer Epilasyon', fiyat, null, null));
  seedCilt.forEach(([ad, tek, pak]) => ins.run(randomUUID(), ad, 'Cilt Bakımı', tek, pak, 4));
  seedDiger.forEach(([ad, fiyat]) => ins.run(randomUUID(), ad, 'Diğer', fiyat, null, null));
}

module.exports = db;
