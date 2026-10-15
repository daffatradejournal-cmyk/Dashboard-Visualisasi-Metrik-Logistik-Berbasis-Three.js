import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RotateCw, Sun, Cloud, ZoomIn, Eye, Sparkles } from 'lucide-react'

/**
 * Earth3D Component
 * 
 * Implements a high-fidelity, realistic 3D Earth model using Three.js with:
 * - High-resolution surface textures, normal/bump topography, and specular reflectance
 * - Dual-layer dynamic cloud sphere with independent rotational velocity
 * - Atmospheric rim glow simulation
 * - Physically-tuned daylight direction & ambient cosmic illumination
 * - Inertial OrbitControls (Rotate, Pan, Zoom)
 * - Deep-space starfield environment
 * - Full window responsive resize handling & memory cleanup
 */
export default function Earth3D() {
  const mountRef = useRef(null)
  
  // Interactive UI state
  const [autoRotate, setAutoRotate] = useState(true)
  const [showClouds, setShowClouds] = useState(true)
  const [rotationSpeed, setRotationSpeed] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  // Mutable references for animate loop access
  const sceneRefs = useRef({
    earthMesh: null,
    cloudsMesh: null,
    controls: null,
    sunLight: null,
    autoRotate: true,
    rotationSpeed: 1,
  })

  // Keep ref synchronized with state without re-creating scene
  useEffect(() => {
    sceneRefs.current.autoRotate = autoRotate
    sceneRefs.current.rotationSpeed = rotationSpeed
    if (sceneRefs.current.cloudsMesh) {
      sceneRefs.current.cloudsMesh.visible = showClouds
    }
  }, [autoRotate, rotationSpeed, showClouds])

  useEffect(() => {
    const currentMount = mountRef.current
    if (!currentMount) return

    // ==========================================
    // 1. SETUP THREE.JS ENVIRONMENT
    // ==========================================
    const width = currentMount.clientWidth
    const height = currentMount.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020408)

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 1.2, 5.5)

    // WebGL Renderer with High-DPI optimization
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    currentMount.appendChild(renderer.domElement)

    // ==========================================
    // 2. ORBIT CONTROLS
    // ==========================================
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 2.6
    controls.maxDistance = 14
    controls.enablePan = true
    controls.rotateSpeed = 0.8
    controls.zoomSpeed = 1.0
    sceneRefs.current.controls = controls

    // ==========================================
    // 3. TEXTURE LOADER & MATERIALS
    // ==========================================
    const textureLoader = new THREE.TextureLoader()

    const dayTexture = textureLoader.load('/textures/earth_daymap.jpg', () => {
      setIsLoading(false)
    })
    dayTexture.colorSpace = THREE.SRGBColorSpace

    const normalTexture = textureLoader.load('/textures/earth_normal.jpg')
    const specularTexture = textureLoader.load('/textures/earth_specular.jpg')
    const cloudsTexture = textureLoader.load('/textures/earth_clouds.png')

    // ==========================================
    // 4. EARTH BODY (SphereGeometry + Bump/Roughness)
    // ==========================================
    const earthRadius = 1.8
    const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64)
    
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: dayTexture,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: specularTexture,
      roughness: 0.65,
      metalness: 0.1,
    })

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial)
    // Earth's axial tilt (approx 23.4 degrees)
    earthMesh.rotation.z = (23.4 * Math.PI) / 180
    scene.add(earthMesh)
    sceneRefs.current.earthMesh = earthMesh

    // ==========================================
    // 5. CLOUDS LAYER (Independent Parallax)
    // ==========================================
    const cloudsGeometry = new THREE.SphereGeometry(earthRadius * 1.012, 64, 64)
    const cloudsMaterial = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial)
    cloudsMesh.rotation.z = (23.4 * Math.PI) / 180
    scene.add(cloudsMesh)
    sceneRefs.current.cloudsMesh = cloudsMesh

    // ==========================================
    // 6. ATMOSPHERE GLOW EFFECT
    // ==========================================
    const atmosphereVertexShader = `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `
    const atmosphereFragmentShader = `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.5);
        gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
      }
    `
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    })
    const atmosphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius * 1.15, 64, 64),
      atmosphereMaterial
    )
    scene.add(atmosphereMesh)

    // ==========================================
    // 7. LIGHTING SETUP (Daylight Simulation)
    // ==========================================
    // Sun light (Directional)
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5)
    sunLight.position.set(6, 2, 4)
    scene.add(sunLight)
    sceneRefs.current.sunLight = sunLight

    // Cosmic night-side fill (Ambient)
    const ambientLight = new THREE.AmbientLight(0x0e1726, 0.35)
    scene.add(ambientLight)

    // Subtle rim light from opposite angle
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.4)
    rimLight.position.set(-6, -2, -4)
    scene.add(rimLight)

    // ==========================================
    // 8. DEEP SPACE STARFIELD
    // ==========================================
    const starCount = 3500
    const starGeometry = new THREE.BufferGeometry()
    const starPositions = new Float32Array(starCount * 3)

    for (let i = 0; i < starCount * 3; i += 3) {
      // Distribute stars randomly on a large outer sphere
      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const r = 50 + Math.random() * 40
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPositions[i + 2] = r * Math.cos(phi)
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.65,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })
    const starField = new THREE.Points(starGeometry, starMaterial)
    scene.add(starField)

    // ==========================================
    // 9. ANIMATION LOOP & 60 FPS OPTIMIZATION
    // ==========================================
    let animationFrameId
    const clock = new THREE.Clock()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      const delta = clock.getDelta()
      const { autoRotate, rotationSpeed, earthMesh, cloudsMesh, controls } = sceneRefs.current

      // Continuous axial spin
      if (earthMesh && autoRotate) {
        earthMesh.rotation.y += delta * 0.08 * rotationSpeed
      }

      // Clouds rotate slightly faster for dynamic atmosphere
      if (cloudsMesh && autoRotate) {
        cloudsMesh.rotation.y += delta * 0.11 * rotationSpeed
      }

      // Damped controls update
      if (controls) {
        controls.update()
      }

      renderer.render(scene, camera)
    }

    animate()

    // ==========================================
    // 10. RESPONSIVE RESIZE HANDLING
    // ==========================================
    const handleResize = () => {
      if (!currentMount) return
      const newWidth = currentMount.clientWidth
      const newHeight = currentMount.clientHeight

      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }

    window.addEventListener('resize', handleResize)

    // Cleanup resources on unmount
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
      controls.dispose()
      renderer.dispose()

      earthGeometry.dispose()
      earthMaterial.dispose()
      cloudsGeometry.dispose()
      cloudsMaterial.dispose()
      starGeometry.dispose()
      starMaterial.dispose()
      atmosphereMaterial.dispose()

      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Reset Camera View Handler
  const handleResetCamera = () => {
    if (sceneRefs.current.controls) {
      sceneRefs.current.controls.reset()
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020408] select-none">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#020408] transition-opacity">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin mb-4" />
          <p className="text-neutral-400 font-mono text-sm tracking-wider uppercase animate-pulse">
            Memuat Tekstur Resolusi Tinggi Bumi 3D...
          </p>
        </div>
      )}

      {/* Top Left Title & Specs (Minimalist HUD) */}
      <div className="absolute top-6 left-6 z-20 pointer-events-none">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <h1 className="text-white font-mono font-bold text-base tracking-wider uppercase drop-shadow-md">
            Earth 3D Simulation
          </h1>
        </div>
        <p className="text-neutral-400 text-xs font-mono tracking-wide drop-shadow-sm">
          High-Res Textures • Bump Map • Axial Tilt • OrbitControls
        </p>
      </div>

      {/* Bottom Center Interaction Guide */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="bg-[#0B0F19]/80 backdrop-blur-md border border-neutral-800/80 px-4 py-2 rounded-full text-neutral-300 text-xs font-mono flex items-center gap-4 shadow-xl">
          <span>🖱️ <b>Klik Kiri</b>: Putar</span>
          <span className="text-neutral-600">•</span>
          <span>🖱️ <b>Klik Kanan</b>: Geser (Pan)</span>
          <span className="text-neutral-600">•</span>
          <span>🔍 <b>Scroll</b>: Zoom</span>
        </div>
      </div>

      {/* Top Right Quick Controls Panel */}
      <div className="absolute top-6 right-6 z-20 flex flex-col items-end gap-2 pointer-events-auto">
        <div className="bg-[#0B0F19]/85 backdrop-blur-md border border-neutral-800 p-3 rounded-xl shadow-2xl flex flex-col gap-2.5 min-w-[190px]">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 text-xs font-mono text-neutral-400">
            <span>KONTROL VIEW</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </div>

          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
              autoRotate
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
              Rotasi Otomatis
            </span>
            <span className="font-bold">{autoRotate ? 'ON' : 'OFF'}</span>
          </button>

          {/* Clouds Toggle */}
          <button
            onClick={() => setShowClouds(!showClouds)}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
              showClouds
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Cloud className="w-3.5 h-3.5" />
              Lapisan Awan
            </span>
            <span className="font-bold">{showClouds ? 'ON' : 'OFF'}</span>
          </button>

          {/* Speed Adjuster */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
              <span>Kecepatan:</span>
              <span className="text-white font-bold">{rotationSpeed}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.2"
              value={rotationSpeed}
              onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Reset View Button */}
          <button
            onClick={handleResetCamera}
            className="mt-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-mono bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 rounded-lg transition border border-neutral-700 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-neutral-400" />
            Reset Posisi Kamera
          </button>
        </div>
      </div>
    </div>
  )
}
