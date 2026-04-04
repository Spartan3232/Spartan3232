# D'Beauty Center

Mobile-first beauty salon management web app. Turkish UI, dark theme with gold + rose accents.

## Stack

- **Backend**: Node.js + Express + `better-sqlite3` (real SQLite file at `backend/data.db`)
- **Frontend**: React 19 + CRA/craco + Tailwind + shadcn/ui (kept from the pre-existing scaffold; the spec mentions Vite but we kept CRA for speed — no functional difference for this app)
- **Routing**: react-router-dom v7
- **UI extras**: lucide-react, sonner (toasts), date-fns (tr locale), axios

## Features

- Ana Sayfa (Dashboard): bugünün özeti, bugünün randevuları, hızlı aksiyonlar (Geldi / Gelmedi / Ödeme)
- Randevular: tarih bazlı liste, yeni randevu, düzenleme, WhatsApp hatırlatma
- Hastalar: arama, detay (Özet / Geçmiş / Paketler), paket sat, borç tahsil et
- Kasa: Bugün / Bu Ay / Aylık Rapor (son 12 ay bar grafik), gelir + gider, ödeme yöntemi dağılımı
- Paketler: aktif / tamamlanan filtreleri, seans düşme, kısmi tahsilat, ilerleme çubuğu
- Hizmet yönetimi (⚙ ikonu): tam fiyat listesi seed'lenir, ekle/düzenle/sil
- Yedekleme (💾 ikonu): JSON dışa/içe aktarım
- Otomatik işlem kaydı: randevu "geldi + ödendi" olduğunda `islemler`'e otomatik tahsilat satırı eklenir/güncellenir

## Run locally

### 1) Backend (port 4000)

```bash
cd backend
npm install
npm start
```

Backend listens on `0.0.0.0:4000`. SQLite DB is created automatically at `backend/data.db` and seeded with the full Lazer Epilasyon / Cilt Bakımı / Diğer price list on first run.

### 2) Frontend (port 3000)

```bash
cd frontend
yarn install
REACT_APP_BACKEND_URL=http://localhost:4000 yarn start
```

If you don't set `REACT_APP_BACKEND_URL`, the frontend defaults to `http://localhost:4000`.

### 3) Telefondan erişim (aynı Wi-Fi üzerinden)

1. Bilgisayarınızın yerel IP'sini bulun:
   - macOS/Linux: `ifconfig | grep inet` veya `ip addr`
   - Windows: `ipconfig`
   - Örn: `192.168.1.25`
2. Backend zaten `0.0.0.0`'a bağlanır — olduğu gibi çalıştırın.
3. Frontend'i telefonun ulaşabilmesi için, frontend'i başlatırken backend URL'yi LAN IP'si ile verin:
   ```bash
   REACT_APP_BACKEND_URL=http://192.168.1.25:4000 HOST=0.0.0.0 yarn start
   ```
4. Telefondan: `http://192.168.1.25:3000` adresine gidin.
5. Firewall: 3000 ve 4000 portlarını açmanız gerekebilir.

## API

Tüm endpoint'ler `/api` altında:

- `GET/POST/PUT/DELETE /hastalar` (+ `/:id`)
- `GET/POST/PUT/DELETE /hizmetler`
- `GET/POST/PUT/DELETE /randevular` (GET `?tarih=YYYY-MM-DD`)
- `GET/POST/PUT/DELETE /paketler` (+ `POST /:id/seans-kullan`, `POST /:id/tahsilat`)
- `GET/POST/DELETE /islemler` (GET `?tarih=`, `?ay=`, `?tip=`)
- `GET /dashboard`
- `GET /rapor/aylik`
- `GET /yedek/export`, `POST /yedek/import`

## Notlar

- Spec'te Vite geçiyor ama mevcut CRA+craco+tailwind+shadcn kurulumunu koruduk. Geliştirme deneyimi aynı.
- ID'ler `crypto.randomUUID()`, tüm tarihler `YYYY-MM-DD`, saat `HH:MM`.
- `data.db` ve `node_modules` git'e dahil değil.
