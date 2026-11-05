# ⚡ ANIME-STREAM

> **Neo-Brutalist Dark Anime Streaming Platform with Multi-Source Upstream & Express BFF**
> Nonton anime streaming & download subtitle Indonesia berbasis REST API dengan antarmuka Neo-Brutalist berkinerja tinggi.

---

## 📐 Arsitektur Sistem (3-Tier)

ANIME-STREAM menggunakan arsitektur monorepo 3-tier untuk memastikan frontend tidak pernah menembak upstream secara langsung:

```
┌─────────────────────────────────┐      ┌─────────────────────────────┐      ┌─────────────────────────────┐
│  Next.js 14 Frontend            │      │  Express BFF Proxy          │      │  Upstream Anime REST API    │
│  (apps/web)                     │ ───> │  (apps/api)                 │ ───> │  (wajik-anime-api)          │
│  http://localhost:3000          │      │  http://localhost:3002      │      │  http://localhost:3001      │
└─────────────────────────────────┘      └─────────────────────────────┘      └─────────────────────────────┘
```

1. **Upstream API (`wajik-anime-api`)**: Scraper REST API anime sub Indo dari sumber `otakudesu`, `kuramanime`, dan `oploverz`.
2. **Backend BFF (`apps/api`)**: Express proxy layer yang menormalisasi payload, mengekstrak direct MP4/HLS video stream, menangani server mirror switcher, in-memory caching, dan failover otomatis.
3. **Frontend (`apps/web`)**: Next.js 14 App Router dengan styling **Neo-Brutalist Dark** (Saweria-inspired: `#0B0E14`, `#FFE600`, offset drop shadows, Space Grotesk), custom HTML5/HLS video player, dan search/filter interaktif.

---

## 🛠️ Prasyarat Sistem

- **Node.js**: `v20.x` atau `>= v22.x` (disarankan)
- **npm**: `v9.x` atau lebih baru
- **Git**

---

## 🚀 Panduan Instalasi Lengkap (Fresh Clone)

Ikuti langkah-langkah di bawah ini untuk menjalankan seluruh ekosistem dari nol:

### Langkah 1: Clone & Jalankan Upstream API (`wajik-anime-api`)

Buka terminal pertama untuk meng-clone dan menjalankan upstream API:

```bash
# 1. Clone repository upstream wajik-anime-api
git clone https://github.com/wajik45/wajik-anime-api.git

# 2. Masuk ke direktori
cd wajik-anime-api

# 3. Install seluruh dependensi
npm install

# 4. Jalankan server upstream pada mode development
npm run dev
```

> **Verifikasi Upstream:**
> Buka browser di `http://localhost:3001/otakudesu/ongoing?page=1`. Jika JSON muncul dengan status 200, upstream telah aktif!
>
> 💡 *Catatan: Jika domain website anime berubah di kemudian hari, Anda dapat memperbarui URL di file `src/configs/{source}.config.ts` pada repo `wajik-anime-api`.*

---

### Langkah 2: Clone & Setup Repository `ANIME-STREAM`

Buka terminal kedua untuk setup repository utama:

```bash
# 1. Masuk ke direktori proyek ANIME-STREAM
cd ANIME-STREAM

# 2. Install semua dependensi monorepo (BFF + Frontend)
npm install
```

---

### Langkah 3: Konfigurasi Environment Variables

Salin file template `.env.example` untuk kedua aplikasi (`apps/api` dan `apps/web`):

#### A. Konfigurasi Backend BFF (`apps/api`)
```bash
# Windows (PowerShell)
Copy-Item apps/api/.env.example apps/api/.env

# Linux / macOS / Bash
cp apps/api/.env.example apps/api/.env
```

Isi default `apps/api/.env`:
```env
PORT=3002
UPSTREAM_API_BASE_URL=http://localhost:3001
UPSTREAM_TIMEOUT_MS=10000
FALLBACK_SOURCE_ON_FORBIDDEN=kuramanime
NODE_ENV=development
```

#### B. Konfigurasi Frontend Web (`apps/web`)
```bash
# Windows (PowerShell)
Copy-Item apps/web/.env.example apps/web/.env

# Linux / macOS / Bash
cp apps/web/.env.example apps/web/.env
```

Isi default `apps/web/.env`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002/api/v1
```

---

### Langkah 4: Menjalankan Aplikasi

Pastikan **Upstream API (`wajik-anime-api`)** pada port `3001` tetap berjalan di terminal pertama.

#### Opsi 1: Menjalankan Sekaligus (Rekomendasi)
Dari root direktori `ANIME-STREAM`, jalankan:
```bash
npm run dev
```
Perintah ini akan menjalankan **BFF (`http://localhost:3002`)** dan **Web Frontend (`http://localhost:3000`)** secara bersamaan menggunakan `concurrently`.

#### Opsi 2: Menjalankan Secara Terpisah
Jika ingin memantau log masing-masing aplikasi secara detail:

- **Terminal 2 (BFF API):**
  ```bash
  npm run dev --workspace apps/api
  ```
- **Terminal 3 (Web Frontend):**
  ```bash
  npm run dev --workspace apps/web
  ```

> **⚠️ Penting:** `npm run dev` pada root **hanya menjalankan BFF + Frontend**. Upstream API (`wajik-anime-api`) **TIDAK** ikut ter-start dan harus berjalan terpisah di terminal pertama (Langkah 1). Dari root `ANIME-STREAM` juga tersedia shortcut:
> ```bash
> npm run dev:upstream
> ```
> yang menjalankan upstream API dari folder sibling `../wajik-anime-api` pada port `3001`.

---

## 🌐 Akses Aplikasi

Buka browser Anda dan akses:
- **Web App (Frontend):** [http://localhost:3000](http://localhost:3000)
- **BFF API Base:** [http://localhost:3002/api/v1](http://localhost:3002/api/v1)
- **Upstream API Base:** [http://localhost:3001](http://localhost:3001)

---

## 📦 Build untuk Production

Untuk melakukan build production pada seluruh monorepo:

```bash
# Build kedua workspace (TypeScript & Next.js production bundle)
npm run build

# Menjalankan frontend hasil build
npm run start --workspace apps/web
```

---

## 📋 Daftar Endpoint BFF (`apps/api`)

Semua endpoint dapat diakses dengan prefix `/api/v1/:source` di mana `:source` adalah `otakudesu`, `kuramanime`, atau `oploverz`:

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/v1/health` | Healthcheck BFF & konektivitas upstream |
| `GET` | `/api/v1/:source/ongoing?page=1` | Daftar anime update ongoing terbaru |
| `GET` | `/api/v1/:source/search?q=naruto&page=1` | Pencarian judul anime |
| `GET` | `/api/v1/:source/anime/:animeId` | Detail lengkap anime, metadata, dan daftar episode |
| `GET` | `/api/v1/:source/episode/:episodeId` | Streaming direct URL, embed fallback, & link download |
| `GET` | `/api/v1/:source/server/:serverId` | Resolusi streaming link mirror server pilihan |
| `GET` | `/api/v1/:source/diagnose` | Diagnosa status upstream dan rekomendasi header |

---

## ✨ Fitur Unggulan

- **Neo-Brutalist Dark Theme**: Desain high-contrast terinspirasi Saweria (`#0B0E14`, `#FFE600`, `#00F0FF`, border tebal hitam, dan bayangan offset).
- **Direct Video Player**: Pemutar video mandiri berbasis HTML5 & HLS (`hls.js`) dengan fitur auto direct link extraction dari `desustream` (`cdn.odcloud.net/anime/...mp4`).
- **Server Mirror Switching**: Ganti server mirror video langsung dari player tanpa reload halaman.
- **Dukungan Keyboard Shortcuts**:
  - `Spasi` / `K`: Play / Pause
  - `Panah Kiri` / `Panah Kanan`: Mundur / Maju 5 detik
  - `Panah Atas` / `Panah Bawah`: Naikkan / Turunkan volume 10%
  - `M`: Mute / Unmute
  - `F`: Fullscreen mode
- **Download Mirrors**: Tautan unduhan terorganisir per resolusi (360p, 480p, 720p, 1080p) lengkap dengan estimasi ukuran file.
- **Failover & Multi-source**: Beralih fleksibel antara Otakudesu, Kuramanime, dan Oploverz dengan banner notifikasi otomatis jika sumber utama terhambat.

---

## 🔧 Troubleshooting

### 1. Port Sudah Terpakai (Port 3000, 3001, atau 3002)
Jika port mengalami konflik atau tersisa proses lama, matikan proses yang menggunakan port tersebut:

**Windows (PowerShell):**
```powershell
Get-NetTCPConnection -LocalPort 3000, 3001, 3002 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**Linux / macOS:**
```bash
npx kill-port 3000 3001 3002
```

### 2. Error Upstream 403 / Cloudflare Block
Jika salah satu provider (misalnya Otakudesu) mengembalikan status 403:
1. Pastikan upstream API di port 3001 berjalan normal: `http://localhost:3001/otakudesu/ongoing`.
2. Gunakan switcher provider di UI untuk beralih ke sumber **Kuramanime** atau **Oploverz**.
3. BFF secara otomatis melakukan fallback jika `FALLBACK_SOURCE_ON_FORBIDDEN=kuramanime` aktif di `apps/api/.env`.

---

## 📄 Lisensi
Proyek ini dibuat untuk keperluan portofolio dan eksperimen antarmuka web streaming. Data anime berasal dari upstream publik pihak ketiga.
