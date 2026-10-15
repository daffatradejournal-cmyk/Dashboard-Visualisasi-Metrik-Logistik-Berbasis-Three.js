# Simulasi Bumi 3D Waktu Nyata (Real-Time 3D Earth)

> **Karya / Developed by: Muhammad Daffa.Dev**

Aplikasi visualisasi Bumi 3D interaktif fotorealistik berbasis Three.js dengan sinkronisasi waktu nyata (siklus siang & malam astronomis), model Bulan HD bertekstur kawah, posisi Matahari akurat di koordinat angkasa, lapisan awan 4K lembut, serta halo atmosfer khas Google Earth (*Rayleigh Scattering*).

## ✨ Fitur Utama
- **Pengembang**: Muhammad Daffa.Dev
- **Sinkronisasi Siang & Malam Waktu Nyata**: Menghitung posisi Matahari terhadap Bumi per detik berdasarkan UTC dan Waktu Indonesia Barat (WIB).
- **Lampu Kota di Sisi Malam**: Lampu-lampu kota menyala secara realistis pada belahan bumi yang mengalami malam hari.
- **Model Bulan HD 3D**: Mengorbit bumi dengan fase bulan fisik (sabit, perbani, purnama) yang otomatis akurat sesuai posisi matahari.
- **Citra Satelit 4K NASA Blue Marble**: Permukaan benua, masker air laut (*specular glint* natural), dan lapisan awan 4K 32-bit ARGB halus tanpa pixelasi.
- **Antarmuka Standar Observatorium**: Telemetri koordinat sub-solar, fokus kamera 1-klik (Bumi, Bulan, Matahari), dan kontrol simulasi siklus 24 jam berbahasa Indonesia.

## 🛠️ Tech Stack
- **Three.js** (WebGL 3D, Custom Shaders, OrbitControls)
- **React** & **Vite**
- **Tailwind CSS v4**
- **Lucide Icons**

## 💻 Cara Menjalankan Proyek

1. **Kloning repository:**
   ```bash
   git clone https://github.com/daffatradejournal-cmyk/Dashboard-Visualisasi-Metrik-Logistik-Berbasis-Three.js.git
   cd Dashboard-Visualisasi-Metrik-Logistik-Berbasis-Three.js
   ```

2. **Install dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan development server:**
   ```bash
   npm run dev
   ```

4. **Build untuk production:**
   ```bash
   npm run build
   ```
