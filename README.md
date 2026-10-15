# Dashboard-Visualisasi-Metrik-Logistik-Berbasis-Three.js

Aplikasi dashboard interaktif untuk memantau pergerakan armada pengiriman barang secara langsung (real-time). Menggantikan bagan statis dengan peta 3D interaktif yang ringan, lancar, dan mudah dipahami oleh tim operasional.

## 🚀 Sorotan Cara Kerja Sistem
Menggunakan teknologi grafika 3D Three.js yang mampu menampilkan ribuan titik armada logistik secara mulus tanpa membuat komputer atau ponsel pengguna menjadi lambat. Data posisi rute diperbarui secara langsung melalui koneksi internet berkecepatan tinggi.

- **Peran Utama**: Frontend & 3D Graphics Developer
- **Performa Sistem**: Sangat Ringan & Lancar (60 FPS Stabil)
- **Hasil Akhir**: Tampilan peta 3D interaktif hemat memori di layar komputer maupun ponsel

## 🛠️ Tech Stack
- **Three.js** & **@react-three/fiber** / **@react-three/drei**
- **WebGL 3D** (InstancedMesh untuk optimasi ribuan armada dalam 1 draw call)
- **React** & **Vite**
- **Tailwind CSS v4**
- **Framer Motion**
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
