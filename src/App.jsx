import React, { useState } from 'react'
import CaseStudyCard from './components/CaseStudyCard'
import Logistic3DViewer from './components/Logistic3DViewer'
import SourceCodeModal from './components/SourceCodeModal'
import { LayoutDashboard, Sparkles, Layers, Eye } from 'lucide-react'

export default function App() {
  const [activeView, setActiveView] = useState('card') // 'card' | 'demo'
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F6F5F2] text-[#1A1A1A] flex flex-col justify-between p-4 sm:p-8 md:p-12 selection:bg-[#F15A24] selection:text-white">
      {/* Top Navigation Bar */}
      <header className="max-w-5xl mx-auto w-full mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E3DC] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#111111] text-white flex items-center justify-center font-mono-tech font-bold text-sm">
            3D
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base tracking-tight text-[#111111]">
              Logistics Metrik Studio
            </h1>
            <p className="text-[11px] font-mono-tech text-[#737373] uppercase tracking-wider">
              Three.js • WebGL 3D • React Vite
            </p>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center bg-[#ECE9E2] p-1 rounded-lg border border-[#DDD9D0]">
          <button
            onClick={() => setActiveView('card')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono-tech font-semibold transition cursor-pointer ${
              activeView === 'card'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Kartu Studi Kasus</span>
          </button>

          <button
            onClick={() => setActiveView('demo')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono-tech font-semibold transition cursor-pointer ${
              activeView === 'demo'
                ? 'bg-[#F15A24] text-white shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live 3D Demo</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-center">
        {activeView === 'card' ? (
          <div>
            <CaseStudyCard
              onOpenDemo={() => setActiveView('demo')}
              onOpenCode={() => setIsCodeModalOpen(true)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#111111]">
                  Simulasi 3D Armada Logistik Global
                </h2>
                <p className="text-xs font-mono-tech text-[#666666]">
                  Render 1.500+ unit armada simultan menggunakan Three.js InstancedMesh
                </p>
              </div>

              <button
                onClick={() => setActiveView('card')}
                className="px-3 py-1.5 text-xs font-mono-tech font-medium bg-white hover:bg-neutral-100 border border-neutral-300 rounded shadow-2xs transition cursor-pointer"
              >
                ← Kembali ke Studi Kasus
              </button>
            </div>

            <Logistic3DViewer onClose={() => setActiveView('card')} />
          </div>
        )}
      </main>

      {/* Source Code Modal */}
      <SourceCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />

      {/* Footer Info */}
      <footer className="max-w-5xl mx-auto w-full mt-10 pt-4 border-t border-[#E5E3DC] flex flex-wrap items-center justify-between text-xs font-mono-tech text-[#888888]">
        <span>STUDI KASUS 2 • THREE.JS 3D TELEMETRY</span>
        <span>60 FPS STABIL • ULTRA-LOW MEMORY</span>
      </footer>
    </div>
  )
}
