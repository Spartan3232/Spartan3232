const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const api = express.Router();

// ---------- Helpers ----------
function nowIso() {
  return new Date().toISOString();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStr() {
  return new Date().toISOString().slice(0, 7);
}

// ---------- HASTALAR ----------
api.get('/hastalar', (req, res) => {
  const rows = db.prepare('SELECT * FROM hastalar ORDER BY ad, soyad').all();
  res.json(rows);
});

api.get('/hastalar/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM hastalar WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Bulunamadı' });
  res.json(row);
});

api.post('/hastalar', (req, res) => {
  const id = randomUUID();
  const { ad, soyad, tel, dogumTarihi, kaynak, saglikNotu, notlar } = req.body;
  db.prepare(
    'INSERT INTO hastalar (id, ad, soyad, tel, dogumTarihi, kaynak, saglikNotu, notlar, olusturmaTarihi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, ad || '', soyad || '', tel || '', dogumTarihi || '', kaynak || '', saglikNotu || '', notlar || '', nowIso());
  res.json(db.prepare('SELECT * FROM hastalar WHERE id = ?').get(id));
});

api.put('/hastalar/:id', (req, res) => {
  const { ad, soyad, tel, dogumTarihi, kaynak, saglikNotu, notlar } = req.body;
  db.prepare(
    'UPDATE hastalar SET ad=?, soyad=?, tel=?, dogumTarihi=?, kaynak=?, saglikNotu=?, notlar=? WHERE id=?'
  ).run(ad, soyad, tel, dogumTarihi, kaynak, saglikNotu, notlar, req.params.id);
  res.json(db.prepare('SELECT * FROM hastalar WHERE id = ?').get(req.params.id));
});

api.delete('/hastalar/:id', (req, res) => {
  db.prepare('DELETE FROM hastalar WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- HIZMETLER ----------
api.get('/hizmetler', (req, res) => {
  res.json(db.prepare('SELECT * FROM hizmetler ORDER BY kategori, ad').all());
});

api.post('/hizmetler', (req, res) => {
  const id = randomUUID();
  const { ad, kategori, tekFiyat, paketFiyat, paketSeans, aktif } = req.body;
  db.prepare(
    'INSERT INTO hizmetler (id, ad, kategori, tekFiyat, paketFiyat, paketSeans, aktif) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, ad, kategori || 'Diğer', tekFiyat || 0, paketFiyat || null, paketSeans || null, aktif ? 1 : 1);
  res.json(db.prepare('SELECT * FROM hizmetler WHERE id = ?').get(id));
});

api.put('/hizmetler/:id', (req, res) => {
  const { ad, kategori, tekFiyat, paketFiyat, paketSeans, aktif } = req.body;
  db.prepare(
    'UPDATE hizmetler SET ad=?, kategori=?, tekFiyat=?, paketFiyat=?, paketSeans=?, aktif=? WHERE id=?'
  ).run(ad, kategori, tekFiyat, paketFiyat, paketSeans, aktif ? 1 : 0, req.params.id);
  res.json(db.prepare('SELECT * FROM hizmetler WHERE id = ?').get(req.params.id));
});

api.delete('/hizmetler/:id', (req, res) => {
  db.prepare('DELETE FROM hizmetler WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- RANDEVULAR ----------
api.get('/randevular', (req, res) => {
  if (req.query.tarih) {
    res.json(db.prepare('SELECT * FROM randevular WHERE tarih = ? ORDER BY saat').all(req.query.tarih));
  } else {
    res.json(db.prepare('SELECT * FROM randevular ORDER BY tarih DESC, saat').all());
  }
});

function syncRandevuIslem(randevuId) {
  const r = db.prepare('SELECT * FROM randevular WHERE id = ?').get(randevuId);
  if (!r) return;
  // Remove existing linked islem
  if (r.islemId) {
    db.prepare('DELETE FROM islemler WHERE id = ?').run(r.islemId);
    db.prepare('UPDATE randevular SET islemId = NULL WHERE id = ?').run(randevuId);
  }
  // If geldi + odendi, create islem
  if (r.durum === 'geldi' && r.odemeDurumu === 'odendi' && r.ucret > 0) {
    const islemId = randomUUID();
    db.prepare(
      'INSERT INTO islemler (id, tip, hastaId, tutar, yontem, kategori, aciklama, tarih) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(islemId, 'tahsilat', r.hastaId, r.ucret, r.odemeYontemi || 'nakit', 'Randevu', r.hizmetAdi || '', r.tarih);
    db.prepare('UPDATE randevular SET islemId = ? WHERE id = ?').run(islemId, randevuId);
  }
}

api.post('/randevular', (req, res) => {
  const id = randomUUID();
  const { hastaId, hizmetId, hizmetAdi, tarih, saat, durum, ucret, odemeDurumu, odemeYontemi, notlar, paketId } = req.body;
  db.prepare(
    'INSERT INTO randevular (id, hastaId, hizmetId, hizmetAdi, tarih, saat, durum, ucret, odemeDurumu, odemeYontemi, notlar, paketId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, hastaId, hizmetId || null, hizmetAdi || '', tarih, saat, durum || 'bekliyor', ucret || 0, odemeDurumu || 'bekliyor', odemeYontemi || '', notlar || '', paketId || null);
  // Decrement package if linked
  if (paketId) {
    const p = db.prepare('SELECT * FROM paketler WHERE id = ?').get(paketId);
    if (p && p.kalanSeans > 0) {
      const yeni = p.kalanSeans - 1;
      db.prepare('UPDATE paketler SET kalanSeans=?, durum=? WHERE id=?').run(yeni, yeni <= 0 ? 'tamamlandi' : 'aktif', paketId);
    }
  }
  syncRandevuIslem(id);
  res.json(db.prepare('SELECT * FROM randevular WHERE id = ?').get(id));
});

api.put('/randevular/:id', (req, res) => {
  const { hastaId, hizmetId, hizmetAdi, tarih, saat, durum, ucret, odemeDurumu, odemeYontemi, notlar, paketId } = req.body;
  db.prepare(
    'UPDATE randevular SET hastaId=?, hizmetId=?, hizmetAdi=?, tarih=?, saat=?, durum=?, ucret=?, odemeDurumu=?, odemeYontemi=?, notlar=?, paketId=? WHERE id=?'
  ).run(hastaId, hizmetId, hizmetAdi, tarih, saat, durum, ucret, odemeDurumu, odemeYontemi, notlar, paketId, req.params.id);
  syncRandevuIslem(req.params.id);
  res.json(db.prepare('SELECT * FROM randevular WHERE id = ?').get(req.params.id));
});

api.delete('/randevular/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM randevular WHERE id = ?').get(req.params.id);
  if (r && r.islemId) {
    db.prepare('DELETE FROM islemler WHERE id = ?').run(r.islemId);
  }
  db.prepare('DELETE FROM randevular WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- PAKETLER ----------
api.get('/paketler', (req, res) => {
  res.json(db.prepare('SELECT * FROM paketler ORDER BY satisTarihi DESC').all());
});

api.post('/paketler', (req, res) => {
  const id = randomUUID();
  const { hastaId, hizmetId, hizmetAdi, toplamSeans, paketFiyati, odenenTutar } = req.body;
  const odenen = odenenTutar || 0;
  const kalanBorc = (paketFiyati || 0) - odenen;
  db.prepare(
    'INSERT INTO paketler (id, hastaId, hizmetId, hizmetAdi, toplamSeans, kalanSeans, paketFiyati, odenenTutar, kalanBorc, satisTarihi, durum) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, hastaId, hizmetId, hizmetAdi, toplamSeans, toplamSeans, paketFiyati, odenen, kalanBorc, todayStr(), 'aktif');
  // Create an islem for the down-payment
  if (odenen > 0) {
    db.prepare(
      'INSERT INTO islemler (id, tip, hastaId, tutar, yontem, kategori, aciklama, tarih) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(randomUUID(), 'tahsilat', hastaId, odenen, req.body.yontem || 'nakit', 'Paket Satış', hizmetAdi || '', todayStr());
  }
  res.json(db.prepare('SELECT * FROM paketler WHERE id = ?').get(id));
});

api.put('/paketler/:id', (req, res) => {
  const { toplamSeans, kalanSeans, paketFiyati, odenenTutar, durum } = req.body;
  const kalanBorc = (paketFiyati || 0) - (odenenTutar || 0);
  db.prepare(
    'UPDATE paketler SET toplamSeans=?, kalanSeans=?, paketFiyati=?, odenenTutar=?, kalanBorc=?, durum=? WHERE id=?'
  ).run(toplamSeans, kalanSeans, paketFiyati, odenenTutar, kalanBorc, durum, req.params.id);
  res.json(db.prepare('SELECT * FROM paketler WHERE id = ?').get(req.params.id));
});

api.delete('/paketler/:id', (req, res) => {
  db.prepare('DELETE FROM paketler WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

api.post('/paketler/:id/seans-kullan', (req, res) => {
  const p = db.prepare('SELECT * FROM paketler WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Bulunamadı' });
  const yeni = Math.max(0, p.kalanSeans - 1);
  db.prepare('UPDATE paketler SET kalanSeans=?, durum=? WHERE id=?').run(yeni, yeni === 0 ? 'tamamlandi' : 'aktif', req.params.id);
  res.json(db.prepare('SELECT * FROM paketler WHERE id = ?').get(req.params.id));
});

api.post('/paketler/:id/tahsilat', (req, res) => {
  const p = db.prepare('SELECT * FROM paketler WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Bulunamadı' });
  const { tutar, yontem } = req.body;
  const t = Number(tutar) || 0;
  const yeniOdenen = (p.odenenTutar || 0) + t;
  const yeniBorc = (p.paketFiyati || 0) - yeniOdenen;
  db.prepare('UPDATE paketler SET odenenTutar=?, kalanBorc=? WHERE id=?').run(yeniOdenen, yeniBorc, req.params.id);
  db.prepare(
    'INSERT INTO islemler (id, tip, hastaId, tutar, yontem, kategori, aciklama, tarih) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(randomUUID(), 'tahsilat', p.hastaId, t, yontem || 'nakit', 'Paket Tahsilat', p.hizmetAdi || '', todayStr());
  res.json(db.prepare('SELECT * FROM paketler WHERE id = ?').get(req.params.id));
});

// ---------- ISLEMLER ----------
api.get('/islemler', (req, res) => {
  const conds = [];
  const params = [];
  if (req.query.tarih) { conds.push('tarih = ?'); params.push(req.query.tarih); }
  if (req.query.ay) { conds.push("substr(tarih, 1, 7) = ?"); params.push(req.query.ay); }
  if (req.query.tip) { conds.push('tip = ?'); params.push(req.query.tip); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  res.json(db.prepare(`SELECT * FROM islemler ${where} ORDER BY tarih DESC, id DESC`).all(...params));
});

api.post('/islemler', (req, res) => {
  const id = randomUUID();
  const { tip, hastaId, tutar, yontem, kategori, aciklama, tarih } = req.body;
  db.prepare(
    'INSERT INTO islemler (id, tip, hastaId, tutar, yontem, kategori, aciklama, tarih) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, tip, hastaId || null, tutar || 0, yontem || 'nakit', kategori || '', aciklama || '', tarih || todayStr());
  res.json(db.prepare('SELECT * FROM islemler WHERE id = ?').get(id));
});

api.delete('/islemler/:id', (req, res) => {
  db.prepare('DELETE FROM islemler WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- DASHBOARD ----------
api.get('/dashboard', (req, res) => {
  const today = todayStr();
  const ay = monthStr();
  const bugunRandevular = db.prepare('SELECT * FROM randevular WHERE tarih = ? ORDER BY saat').all(today);
  const bugunGelir = db.prepare("SELECT COALESCE(SUM(tutar),0) as s FROM islemler WHERE tarih = ? AND tip = 'tahsilat'").get(today).s;
  const bugunGider = db.prepare("SELECT COALESCE(SUM(tutar),0) as s FROM islemler WHERE tarih = ? AND tip = 'gider'").get(today).s;
  const buAyGelir = db.prepare("SELECT COALESCE(SUM(tutar),0) as s FROM islemler WHERE substr(tarih,1,7) = ? AND tip = 'tahsilat'").get(ay).s;
  const toplamAlacak = db.prepare("SELECT COALESCE(SUM(kalanBorc),0) as s FROM paketler WHERE durum = 'aktif'").get().s;
  const hastaSayisi = db.prepare('SELECT COUNT(*) as c FROM hastalar').get().c;
  res.json({
    bugunRandevular,
    bugunNetKasa: bugunGelir - bugunGider,
    bugunGelir,
    bugunGider,
    buAyGelir,
    toplamAlacak,
    hastaSayisi
  });
});

// ---------- RAPOR ----------
api.get('/rapor/aylik', (req, res) => {
  const result = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ay = d.toISOString().slice(0, 7);
    const gelir = db.prepare("SELECT COALESCE(SUM(tutar),0) as s FROM islemler WHERE substr(tarih,1,7) = ? AND tip = 'tahsilat'").get(ay).s;
    const gider = db.prepare("SELECT COALESCE(SUM(tutar),0) as s FROM islemler WHERE substr(tarih,1,7) = ? AND tip = 'gider'").get(ay).s;
    result.push({ ay, gelir, gider, net: gelir - gider });
  }
  res.json(result);
});

// ---------- YEDEK ----------
api.get('/yedek/export', (req, res) => {
  const data = {
    exportedAt: nowIso(),
    hastalar: db.prepare('SELECT * FROM hastalar').all(),
    hizmetler: db.prepare('SELECT * FROM hizmetler').all(),
    randevular: db.prepare('SELECT * FROM randevular').all(),
    paketler: db.prepare('SELECT * FROM paketler').all(),
    islemler: db.prepare('SELECT * FROM islemler').all()
  };
  res.setHeader('Content-Disposition', `attachment; filename=dbeauty-backup-${todayStr()}.json`);
  res.json(data);
});

api.post('/yedek/import', (req, res) => {
  const d = req.body;
  if (!d || typeof d !== 'object') return res.status(400).json({ error: 'Geçersiz veri' });
  const tx = db.transaction(() => {
    db.exec('DELETE FROM hastalar; DELETE FROM hizmetler; DELETE FROM randevular; DELETE FROM paketler; DELETE FROM islemler;');
    const cols = {
      hastalar: ['id','ad','soyad','tel','dogumTarihi','kaynak','saglikNotu','notlar','olusturmaTarihi'],
      hizmetler: ['id','ad','kategori','tekFiyat','paketFiyat','paketSeans','aktif'],
      randevular: ['id','hastaId','hizmetId','hizmetAdi','tarih','saat','durum','ucret','odemeDurumu','odemeYontemi','notlar','paketId','islemId'],
      paketler: ['id','hastaId','hizmetId','hizmetAdi','toplamSeans','kalanSeans','paketFiyati','odenenTutar','kalanBorc','satisTarihi','durum'],
      islemler: ['id','tip','hastaId','tutar','yontem','kategori','aciklama','tarih']
    };
    for (const table of Object.keys(cols)) {
      const rows = d[table] || [];
      if (!rows.length) continue;
      const c = cols[table];
      const stmt = db.prepare(`INSERT INTO ${table} (${c.join(',')}) VALUES (${c.map(() => '?').join(',')})`);
      for (const r of rows) stmt.run(...c.map(k => (r[k] !== undefined ? r[k] : null)));
    }
  });
  tx();
  res.json({ ok: true });
});

app.use('/api', api);
app.get('/', (req, res) => res.json({ service: "D'Beauty Center API", ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`D'Beauty backend listening on 0.0.0.0:${PORT}`);
});
