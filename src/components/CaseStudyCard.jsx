import React from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowRight } from 'lucide-react'

export default function CaseStudyCard({ onOpenDemo, onOpenCode }) {
  const tags = [
    'Three.js',
    'WebGL 3D',
    'JavaScript Modern',
    'Real-Time Data',
    'Vite'
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-5xl mx-auto bg-white border border-[#E5E5E5] rounded-lg shadow-sm overflow-hidden"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 sm:px-8 py-3.5 bg-[#FAF9F6] border-b border-[#EBEAE6] text-xs font-mono-tech font-bold text-[#3E3E3E] tracking-wider uppercase select-none">
        <span>STUDI KASUS</span>
        <span>VISUALISASI DATA 3D INTERAKTIF</span>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#ECEAE5]">
        
        {/* Left Column (Main Information) */}
        <div className="lg:col-span-8 p-6 sm:p-9 flex flex-col justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141414] tracking-tight leading-tight mb-4">
              Dashboard Visualisasi Metrik Logistik Berbasis Three.js
            </h1>

            <p className="text-[#4A4A4A] text-sm sm:text-base leading-relaxed mb-6 font-normal">
              Aplikasi dashboard interaktif untuk memantau pergerakan armada pengiriman barang secara langsung (real-time). Menggantikan bagan statis dengan peta 3D interaktif yang ringan, lancar, dan mudah dipahami oleh tim operasional.
            </p>

            {/* Callout Box */}
            <div className="bg-[#FAF7F2] border-l-4 border-[#F15A24] p-4 sm:p-5 rounded-r-md mb-6">
              <h3 className="text-[#F15A24] font-mono-tech font-bold text-xs tracking-wider uppercase mb-2">
                SOROTAN CARA KERJA SISTEM:
              </h3>
              <p className="text-[#333333] text-xs sm:text-sm leading-relaxed">
                Menggunakan teknologi grafika 3D Three.js yang mampu menampilkan ribuan titik armada logistik secara mulus tanpa membuat komputer atau ponsel pengguna menjadi lambat. Data posisi rute diperbarui secara langsung melalui koneksi internet berkecepatan tinggi.
              </p>
            </div>

            {/* Tech Badges */}
            <div className="flex flex-wrap gap-2 mb-8">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-[#ECE9E2] text-[#2C2C2C] text-xs font-mono-tech font-medium px-3 py-1.5 rounded-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onOpenCode}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F15A24] hover:bg-[#E04D18] text-white text-sm font-bold border-2 border-black rounded shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer"
            >
              <span>Kode Sumber</span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={onOpenDemo}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-50 text-black text-sm font-bold border-2 border-black rounded shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer"
            >
              <span>Demo Langsung</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Right Column (Specifications & Meta) */}
        <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col justify-start space-y-7 bg-[#FCFBFA]">
          <div>
            <p className="text-xs font-mono-tech text-[#7A7A7A] tracking-wider uppercase mb-1">
              PERAN UTAMA
            </p>
            <p className="text-sm sm:text-base font-bold text-[#141414] leading-snug">
              Frontend & 3D Graphics Developer
            </p>
          </div>

          <div>
            <p className="text-xs font-mono-tech text-[#7A7A7A] tracking-wider uppercase mb-1">
              PERFORMA SISTEM
            </p>
            <p className="text-sm sm:text-base font-bold text-[#141414] leading-snug">
              Sangat Ringan & Lancar (60 FPS Stabil)
            </p>
          </div>

          <div>
            <p className="text-xs font-mono-tech text-[#7A7A7A] tracking-wider uppercase mb-1">
              HASIL AKHIR
            </p>
            <p className="text-sm sm:text-base font-bold text-[#141414] leading-relaxed">
              Tampilan peta 3D interaktif hemat memori di layar komputer maupun ponsel
            </p>
          </div>
        </div>

      </div>
    </motion.div>
  )
}
