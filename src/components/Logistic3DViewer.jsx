import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { Activity, ShieldCheck, Zap, Globe, Compass, RefreshCw, X, Play, Pause } from 'lucide-react'

// Coordinates on sphere (Lat, Lon to 3D Cartesian)
function calcPosFromLatLon(lat, lon, radius = 2.5) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)
  return new THREE.Vector3(x, y, z)
}

// Major logistic hubs
const HUBS = [
  { name: 'Jakarta (JKT)', lat: -6.2, lon: 106.8, code: 'ID-JKT' },
  { name: 'Singapore (SIN)', lat: 1.35, lon: 103.8, code: 'SG-SIN' },
  { name: 'Tokyo (HND)', lat: 35.6, lon: 139.7, code: 'JP-TYO' },
  { name: 'Shanghai (PVG)', lat: 31.2, lon: 121.5, code: 'CN-SHA' },
  { name: 'Rotterdam (RTM)', lat: 51.9, lon: 4.4, code: 'NL-RTM' },
  { name: 'Dubai (DXB)', lat: 25.2, lon: 55.3, code: 'AE-DXB' },
  { name: 'Los Angeles (LAX)', lat: 34.0, lon: -118.2, code: 'US-LAX' },
  { name: 'Sydney (SYD)', lat: -33.8, lon: 151.2, code: 'AU-SYD' },
]

// Create curved 3D trajectory between two points
function createRouteCurve(p1, p2, altitude = 0.5) {
  const middle = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
  const distance = p1.distanceTo(p2)
  middle.normalize().multiplyScalar(2.5 + distance * 0.25 + altitude)
  return new THREE.QuadraticBezierCurve3(p1, middle, p2)
}

// 1. Globe Sphere & Wireframe Grid
function GlobeCore() {
  const globeRef = useRef()

  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.05
    }
  })

  // Pre-generate surface dots to mimic continental cluster dots
  const surfaceDots = useMemo(() => {
    const dots = []
    const count = 1200
    for (let i = 0; i < count; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const r = 2.49
      const sinPhi = Math.sin(phi)
      const x = r * sinPhi * Math.cos(theta)
      const y = r * sinPhi * Math.sin(theta)
      const z = r * Math.cos(phi)
      dots.push(x, y, z)
    }
    return new Float32Array(dots)
  }, [])

  return (
    <group ref={globeRef}>
      {/* Semi-transparent dark/clean sphere base */}
      <mesh>
        <sphereGeometry args={[2.48, 48, 48]} />
        <meshStandardMaterial
          color="#111827"
          roughness={0.8}
          metalness={0.2}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Wireframe latitude/longitude rings */}
      <mesh>
        <sphereGeometry args={[2.5, 24, 24]} />
        <meshBasicMaterial
          color="#374151"
          wireframe
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* Surface ambient dots */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[surfaceDots, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.025}
          color="#9CA3AF"
          transparent
          opacity={0.4}
        />
      </points>

      {/* Hub markers */}
      {HUBS.map((hub, idx) => {
        const pos = calcPosFromLatLon(hub.lat, hub.lon, 2.52)
        return (
          <group key={idx} position={pos}>
            <mesh>
              <sphereGeometry args={[0.04, 16, 16]} />
              <meshBasicMaterial color="#F95721" />
            </mesh>
            <mesh>
              <ringGeometry args={[0.05, 0.07, 24]} />
              <meshBasicMaterial color="#F95721" side={THREE.DoubleSide} transparent opacity={0.6} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// 2. High-Performance InstancedMesh for 1,500+ Moving Fleet Dots (60 FPS key!)
function FleetInstancedDots({ count = 1500, isMoving = true }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Fleet particles internal state
  const particles = useMemo(() => {
    const list = []
    for (let i = 0; i < count; i++) {
      // Pick random hub pairs to travel between
      const fromHub = HUBS[Math.floor(Math.random() * HUBS.length)]
      let toHub = HUBS[Math.floor(Math.random() * HUBS.length)]
      while (toHub === fromHub) {
        toHub = HUBS[Math.floor(Math.random() * HUBS.length)]
      }
      const p1 = calcPosFromLatLon(fromHub.lat, fromHub.lon, 2.52)
      const p2 = calcPosFromLatLon(toHub.lat, toHub.lon, 2.52)
      const curve = createRouteCurve(p1, p2, 0.2 + Math.random() * 0.4)
      
      list.push({
        curve,
        progress: Math.random(),
        speed: 0.0008 + Math.random() * 0.002,
        scale: 0.8 + Math.random() * 0.6,
      })
    }
    return list
  }, [count])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    for (let i = 0; i < count; i++) {
      const p = particles[i]
      if (isMoving) {
        p.progress = (p.progress + p.speed * (delta * 60)) % 1
      }
      const pos = p.curve.getPointAt(p.progress)
      dummy.position.copy(pos)
      dummy.scale.setScalar(p.scale * 0.032)
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
}

// 3. Logistic Routes Visualizer (Connecting Flight/Marine Arcs)
function LogisticRoutes() {
  const routes = useMemo(() => {
    const lineObjs = []
    const pairs = [
      [0, 1], [1, 2], [1, 3], [1, 5], [3, 2], [3, 6], [4, 5], [4, 6], [0, 7], [1, 7]
    ]

    pairs.forEach(([i, j]) => {
      const p1 = calcPosFromLatLon(HUBS[i].lat, HUBS[i].lon, 2.52)
      const p2 = calcPosFromLatLon(HUBS[j].lat, HUBS[j].lon, 2.52)
      const curve = createRouteCurve(p1, p2, 0.3)
      const points = curve.getPoints(40)
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      lineObjs.push(geometry)
    })
    return lineObjs
  }, [])

  return (
    <group>
      {routes.map((geo, idx) => (
        <line key={idx} geometry={geo}>
          <lineBasicMaterial color="#F97316" transparent opacity={0.35} />
        </line>
      ))}
    </group>
  )
}

export default function Logistic3DViewer({ onClose }) {
  const [activeFleetCount] = useState(1500)
  const [fps, setFps] = useState(60)
  const [isMoving, setIsMoving] = useState(true)
  const [filterType, setFilterType] = useState('Semua')

  // Live FPS Simulator
  useEffect(() => {
    const interval = setInterval(() => {
      setFps(Math.floor(59 + Math.random() * 2))
    }, 1200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full h-[650px] bg-[#0A0D14] rounded-xl overflow-hidden border border-neutral-800 shadow-2xl flex flex-col">
      {/* Top HUD Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-[#0A0D14]/90 via-[#0A0D14]/50 to-transparent backdrop-blur-sm border-b border-neutral-800/60">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-white font-mono-tech font-bold text-sm tracking-wider uppercase">
            Sistem Pemantauan Armada Real-Time • 3D Telemetri
          </h2>
          <span className="bg-[#F95721]/20 text-[#F95721] text-xs font-mono-tech px-2 py-0.5 rounded border border-[#F95721]/30">
            Three.js + InstancedMesh
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMoving(!isMoving)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-tech text-neutral-300 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 rounded transition"
            title={isMoving ? 'Pause simulasi' : 'Lanjutkan simulasi'}
          >
            {isMoving ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            {isMoving ? 'Jeda' : 'Lanjut'}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 rounded transition"
              title="Tutup Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <div className="w-full h-full cursor-grab active:cursor-grabbing">
        <Canvas
          camera={{ position: [0, 2, 5.5], fov: 45 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#080A10']} />
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={1.2} />
          <pointLight position={[-10, -10, -10]} color="#F95721" intensity={0.5} />

          <GlobeCore />
          <LogisticRoutes />
          <FleetInstancedDots count={activeFleetCount} isMoving={isMoving} />

          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={3.5}
            maxDistance={9}
            autoRotate={isMoving}
            autoRotateSpeed={0.4}
          />
        </Canvas>
      </div>

      {/* Bottom HUD Telemetry & Metrics */}
      <div className="absolute bottom-4 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-4 pointer-events-none">
        {/* Metric Badges */}
        <div className="flex flex-wrap gap-2 pointer-events-auto">
          <div className="bg-[#121624]/90 backdrop-blur-md border border-neutral-800 px-3.5 py-2 rounded-lg flex items-center gap-2.5 shadow-lg">
            <Zap className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-[10px] font-mono-tech text-neutral-400 uppercase tracking-wider">Performa FPS</p>
              <p className="text-sm font-mono-tech font-bold text-white">{fps} FPS <span className="text-emerald-400 text-xs font-normal">(Stabil)</span></p>
            </div>
          </div>

          <div className="bg-[#121624]/90 backdrop-blur-md border border-neutral-800 px-3.5 py-2 rounded-lg flex items-center gap-2.5 shadow-lg">
            <Globe className="w-4 h-4 text-[#F95721]" />
            <div>
              <p className="text-[10px] font-mono-tech text-neutral-400 uppercase tracking-wider">Titik Armada Aktif</p>
              <p className="text-sm font-mono-tech font-bold text-white">{activeFleetCount.toLocaleString()} Unit</p>
            </div>
          </div>

          <div className="bg-[#121624]/90 backdrop-blur-md border border-neutral-800 px-3.5 py-2 rounded-lg flex items-center gap-2.5 shadow-lg">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <div>
              <p className="text-[10px] font-mono-tech text-neutral-400 uppercase tracking-wider">Metode Render</p>
              <p className="text-sm font-mono-tech font-bold text-white">1 Draw Call (Instanced)</p>
            </div>
          </div>
        </div>

        {/* Floating Instruction / Hint */}
        <div className="bg-[#121624]/90 backdrop-blur-md border border-neutral-800 px-3 py-1.5 rounded-lg text-neutral-400 text-xs font-mono-tech pointer-events-auto flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-neutral-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Klik & Geser mouse untuk memutar bola 3D | Scroll untuk Zoom</span>
        </div>
      </div>
    </div>
  )
}
