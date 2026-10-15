import React from 'react'
import { X, Copy, Check } from 'lucide-react'

export default function SourceCodeModal({ isOpen, onClose }) {
  const [copied, setCopied] = React.useState(false)

  if (!isOpen) return null

  const sampleSnippet = `// Three.js InstancedMesh Optimization (60 FPS Multi-Fleet Rendering)
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function FleetInstancedDots({ count = 1500 }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    for (let i = 0; i < count; i++) {
      // Calculate continuous trajectory positions along 3D Bézier curves
      const pos = particles[i].curve.getPointAt(particles[i].progress)
      dummy.position.copy(pos)
      dummy.scale.setScalar(0.032)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#FF7A3D" />
    </instancedMesh>
  )
}`

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleSnippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-[#0F141C] text-neutral-200 rounded-xl border border-neutral-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-[#161D29]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
            <span className="text-xs font-mono-tech text-neutral-400 ml-2">src/components/Logistic3DViewer.jsx</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono-tech bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded transition border border-neutral-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin' : 'Salin Kode'}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-auto font-mono-tech text-xs sm:text-sm bg-[#090C12] text-neutral-300 leading-relaxed">
          <pre className="whitespace-pre-wrap">{sampleSnippet}</pre>
        </div>
      </div>
    </div>
  )
}
