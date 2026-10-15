import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { calculateSolarPosition, calculateMoonPosition, formatCoordinate } from '../utils/astronomy'
import { Sun, Moon, Globe2, Compass, Play, Pause, RotateCcw, Sliders, Layers } from 'lucide-react'

// Pembuat tekstur korona cahaya matahari procedural murni (tanpa asset eksternal)
function createSunCoronaTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255, 255, 245, 1.0)')
  gradient.addColorStop(0.18, 'rgba(255, 215, 130, 0.75)')
  gradient.addColorStop(0.45, 'rgba(255, 140, 45, 0.28)')
  gradient.addColorStop(0.8, 'rgba(255, 90, 20, 0.08)')
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export default function Earth3D() {
  const mountRef = useRef(null)

  // Status waktu dan mode (Waktu Nyata vs Simulasi Waktu)
  const [isRealtime, setIsRealtime] = useState(true)
  const [simulationHour, setSimulationHour] = useState(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Pengaturan visual
  const [showClouds, setShowClouds] = useState(true)
  const [cameraFocus, setCameraFocus] = useState('earth') // 'earth' | 'moon' | 'sun'
  const [isLoading, setIsLoading] = useState(true)

  // Data astronomi terhitung
  const [solarData, setSolarData] = useState(() => calculateSolarPosition(new Date()))
  const [lunarData, setLunarData] = useState(() => calculateMoonPosition(new Date()))

  // Mutable reference untuk loop animasi Three.js
  const engineRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    earthMesh: null,
    earthMaterial: null,
    cloudsMesh: null,
    cloudsMaterial: null,
    moonMesh: null,
    sunGroup: null,
    sunLight: null,
    currentDate: new Date(),
    targetLookAt: new THREE.Vector3(0, 0, 0),
    targetCameraPos: new THREE.Vector3(0, 1.2, 5.5),
    isTransitioning: false,
  })

  // Timer update waktu nyata setiap detik
  useEffect(() => {
    const timer = setInterval(() => {
      if (isRealtime) {
        const now = new Date()
        setCurrentDate(now)
        engineRef.current.currentDate = now
        const sData = calculateSolarPosition(now)
        const lData = calculateMoonPosition(now)
        setSolarData(sData)
        setLunarData(lData)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [isRealtime])

  // Sinkronisasi saat pengguna menggeser slider simulasi jam (0 - 24)
  const handleHourSliderChange = (hourVal) => {
    setIsRealtime(false)
    setSimulationHour(hourVal)
    const simulatedDate = new Date()
    const wholeHours = Math.floor(hourVal)
    const minutes = Math.floor((hourVal - wholeHours) * 60)
    simulatedDate.setHours(wholeHours, minutes, 0, 0)
    setCurrentDate(simulatedDate)
    engineRef.current.currentDate = simulatedDate
    const sData = calculateSolarPosition(simulatedDate)
    const lData = calculateMoonPosition(simulatedDate)
    setSolarData(sData)
    setLunarData(lData)
  }

  // Kembali ke waktu nyata sekarang
  const handleResetToRealtime = () => {
    setIsRealtime(true)
    setSimulationHour(null)
    const now = new Date()
    setCurrentDate(now)
    engineRef.current.currentDate = now
    const sData = calculateSolarPosition(now)
    const lData = calculateMoonPosition(now)
    setSolarData(sData)
    setLunarData(lData)
  }

  // Penggantian fokus kamera ke Bumi / Bulan / Matahari
  const setFocus = (target) => {
    setCameraFocus(target)
    const eng = engineRef.current
    if (!eng.camera || !eng.controls) return

    eng.isTransitioning = true
    if (target === 'earth') {
      eng.targetLookAt.set(0, 0, 0)
      eng.targetCameraPos.set(0, 1.2, 5.5)
    } else if (target === 'moon' && eng.moonMesh) {
      const mPos = eng.moonMesh.position
      eng.targetLookAt.copy(mPos)
      eng.targetCameraPos.set(mPos.x + 1.2, mPos.y + 0.6, mPos.z + 1.8)
    } else if (target === 'sun' && eng.sunGroup) {
      const sPos = eng.sunGroup.position
      eng.targetLookAt.copy(sPos)
      eng.targetCameraPos.set(sPos.x * 0.6, sPos.y * 0.6 + 2, sPos.z * 0.6 + 8)
    }
  }

  // Toggle tampilan awan
  useEffect(() => {
    if (engineRef.current.cloudsMesh) {
      engineRef.current.cloudsMesh.visible = showClouds
    }
  }, [showClouds])

  // ==========================================
  // INISIALISASI THREE.JS SCENE
  // ==========================================
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth
    const height = mount.clientHeight

    // 1. Scene & Latar Angkasa
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x010307)
    engineRef.current.scene = scene

    // 2. Kamera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 1.2, 5.5)
    engineRef.current.camera = camera

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.18
    mount.appendChild(renderer.domElement)
    engineRef.current.renderer = renderer

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 2.4
    controls.maxDistance = 60
    controls.rotateSpeed = 0.7
    controls.zoomSpeed = 1.0
    engineRef.current.controls = controls

    // 5. Texture Loader
    const textureLoader = new THREE.TextureLoader()

    const dayTexture = textureLoader.load('/textures/earth_daymap.jpg', () => {
      setIsLoading(false)
    })
    dayTexture.colorSpace = THREE.SRGBColorSpace

    const nightTexture = textureLoader.load('/textures/earth_lights.png')
    nightTexture.colorSpace = THREE.SRGBColorSpace

    const normalTexture = textureLoader.load('/textures/earth_normal.jpg')
    const specularTexture = textureLoader.load('/textures/earth_specular.jpg')
    const cloudsTexture = textureLoader.load('/textures/earth_clouds.png')
    const moonTexture = textureLoader.load('/textures/moon.jpg')
    moonTexture.colorSpace = THREE.SRGBColorSpace

    // 6. Model Bumi dengan Shader Custom Siang-Malam & Lampu Kota
    const earthRadius = 1.8
    const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64)

    const earthVertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vUv = uv;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `

    const earthFragmentShader = `
      uniform sampler2D dayMap;
      uniform sampler2D nightMap;
      uniform sampler2D specularMap;
      uniform vec3 sunPosition;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 sunDir = normalize(sunPosition - vWorldPosition);
        
        // Sudut sinar matahari terhadap permukaan
        float sunDot = dot(normal, sunDir);
        
        vec4 dayColor = texture2D(dayMap, vUv);
        vec4 nightLights = texture2D(nightMap, vUv);
        vec4 specValue = texture2D(specularMap, vUv);
        
        // Zona twilight halus (garis batas fajar & senja)
        float dayFactor = smoothstep(-0.08, 0.08, sunDot);
        
        // Sisi malam: Cahaya lampu kota + ambient angkasa indigo samar
        vec3 nightAmbient = vec3(0.008, 0.012, 0.022);
        vec3 cityLights = nightLights.rgb * (1.0 - dayFactor) * 2.8;
        vec3 nightHemisphere = cityLights + nightAmbient;
        
        // Sisi siang: Cahaya matahari alami
        float diffuse = max(sunDot, 0.0);
        vec3 dayHemisphere = dayColor.rgb * (diffuse * 0.94 + 0.06);
        
        // Pantulan kilau matahari pada permukaan laut (specular glint)
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        vec3 halfVec = normalize(sunDir + viewDir);
        float specIntensity = pow(max(dot(normal, halfVec), 0.0), 32.0) * specValue.r * 1.6;
        vec3 sunGlint = vec3(1.0, 0.97, 0.90) * specIntensity * dayFactor;
        
        // Gabungan tekstur permukaan
        vec3 surfaceColor = mix(nightHemisphere, dayHemisphere, dayFactor) + sunGlint;
        
        // Efek hamburan atmosfer Rayleigh biru tipis di bibir horizon
        float rim = 1.0 - max(dot(viewDir, normal), 0.0);
        float atmosphereGlow = pow(rim, 3.4) * max(sunDot * 0.5 + 0.5, 0.15);
        vec3 atmosphereColor = vec3(0.22, 0.58, 1.0) * atmosphereGlow;
        
        gl_FragColor = vec4(surfaceColor + atmosphereColor, 1.0);
      }
    `

    const initialSolar = calculateSolarPosition(engineRef.current.currentDate)

    const earthMaterial = new THREE.ShaderMaterial({
      vertexShader: earthVertexShader,
      fragmentShader: earthFragmentShader,
      uniforms: {
        dayMap: { value: dayTexture },
        nightMap: { value: nightTexture },
        specularMap: { value: specularTexture },
        sunPosition: { value: new THREE.Vector3(initialSolar.vector.x, initialSolar.vector.y, initialSolar.vector.z) },
      },
    })

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial)
    scene.add(earthMesh)
    engineRef.current.earthMesh = earthMesh
    engineRef.current.earthMaterial = earthMaterial

    // 7. Lapisan Awan
    const cloudsGeometry = new THREE.SphereGeometry(earthRadius * 1.014, 64, 64)
    const cloudsVertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vUv = uv;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `
    const cloudsFragmentShader = `
      uniform sampler2D cloudsMap;
      uniform vec3 sunPosition;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 sunDir = normalize(sunPosition - vWorldPosition);
        float sunDot = dot(normal, sunDir);
        
        vec4 cloudSample = texture2D(cloudsMap, vUv);
        float cloudAlpha = cloudSample.r * 0.72;
        
        // Awan terang di siang hari, bayangan halus di malam hari
        float dayFactor = smoothstep(-0.1, 0.15, sunDot);
        vec3 cloudColor = mix(vec3(0.015, 0.02, 0.035), vec3(1.0, 1.0, 1.0), dayFactor);
        
        gl_FragColor = vec4(cloudColor, cloudAlpha);
      }
    `
    const cloudsMaterial = new THREE.ShaderMaterial({
      vertexShader: cloudsVertexShader,
      fragmentShader: cloudsFragmentShader,
      uniforms: {
        cloudsMap: { value: cloudsTexture },
        sunPosition: { value: new THREE.Vector3(initialSolar.vector.x, initialSolar.vector.y, initialSolar.vector.z) },
      },
      transparent: true,
      depthWrite: false,
    })
    const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial)
    scene.add(cloudsMesh)
    engineRef.current.cloudsMesh = cloudsMesh
    engineRef.current.cloudsMaterial = cloudsMaterial

    // 8. Model Bulan HD dengan Tekstur Kawah Nyata
    const moonRadius = 0.49
    const moonGeometry = new THREE.SphereGeometry(moonRadius, 48, 48)
    const moonMaterial = new THREE.MeshStandardMaterial({
      map: moonTexture,
      bumpMap: moonTexture,
      bumpScale: 0.035,
      roughness: 0.92,
      metalness: 0.05,
    })
    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial)
    const initialMoon = calculateMoonPosition(engineRef.current.currentDate)
    moonMesh.position.set(initialMoon.vector.x, initialMoon.vector.y, initialMoon.vector.z)
    scene.add(moonMesh)
    engineRef.current.moonMesh = moonMesh

    // Garis lintasan orbit Bulan tipis (visualizer)
    const moonOrbitGeo = new THREE.BufferGeometry()
    const orbitPoints = []
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2
      const ox = 9.2 * Math.cos(angle)
      const oy = 9.2 * Math.sin(angle) * Math.sin(5.14 * (Math.PI / 180))
      const oz = 9.2 * Math.sin(angle) * Math.cos(5.14 * (Math.PI / 180))
      orbitPoints.push(new THREE.Vector3(ox, oy, oz))
    }
    moonOrbitGeo.setFromPoints(orbitPoints)
    const moonOrbitLine = new THREE.Line(
      moonOrbitGeo,
      new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.35 })
    )
    scene.add(moonOrbitLine)

    // 9. Model Matahari di Posisi Sebenarnya + Cahaya Sinar
    const sunGroup = new THREE.Group()
    sunGroup.position.set(initialSolar.vector.x, initialSolar.vector.y, initialSolar.vector.z)

    // Bola inti matahari
    const sunCoreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.9, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xfffdf0 })
    )
    sunGroup.add(sunCoreMesh)

    // Korona cahaya matahari berpijar
    const sunCoronaTexture = createSunCoronaTexture()
    const sunCoronaMaterial = new THREE.SpriteMaterial({
      map: sunCoronaTexture,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const sunCoronaSprite = new THREE.Sprite(sunCoronaMaterial)
    sunCoronaSprite.scale.set(13, 13, 1)
    sunGroup.add(sunCoronaSprite)

    scene.add(sunGroup)
    engineRef.current.sunGroup = sunGroup

    // Directional Sunlight menuju pusat Bumi (0, 0, 0)
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 2.7)
    sunLight.position.set(initialSolar.vector.x, initialSolar.vector.y, initialSolar.vector.z)
    sunLight.target.position.set(0, 0, 0)
    scene.add(sunLight)
    scene.add(sunLight.target)
    engineRef.current.sunLight = sunLight

    // Cahaya latar angkasa agar sisi malam tidak hampa total
    const ambientLight = new THREE.AmbientLight(0x0a101d, 0.25)
    scene.add(ambientLight)

    // 10. Bintang Latar Belakang (Starfield)
    const starCount = 3000
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i += 3) {
      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const r = 70 + Math.random() * 50
      starPos[i] = r * Math.sin(phi) * Math.cos(theta)
      starPos[i + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPos[i + 2] = r * Math.cos(phi)
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.6,
      transparent: true,
      opacity: 0.8,
    })
    scene.add(new THREE.Points(starGeo, starMat))

    // ==========================================
    // 11. ANIMATION & RENDER LOOP
    // ==========================================
    let animId
    const clock = new THREE.Clock()

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const eng = engineRef.current

      // Update posisi astronomi Matahari dan Bulan
      const solar = calculateSolarPosition(eng.currentDate)
      const moon = calculateMoonPosition(eng.currentDate)

      // Perbarui posisi Matahari di ruang 3D
      if (eng.sunGroup && eng.sunLight) {
        eng.sunGroup.position.set(solar.vector.x, solar.vector.y, solar.vector.z)
        eng.sunLight.position.set(solar.vector.x, solar.vector.y, solar.vector.z)
      }

      // Perbarui posisi Matahari ke dalam uniform shader Bumi & Awan
      if (eng.earthMaterial) {
        eng.earthMaterial.uniforms.sunPosition.value.set(solar.vector.x, solar.vector.y, solar.vector.z)
      }
      if (eng.cloudsMaterial) {
        eng.cloudsMaterial.uniforms.sunPosition.value.set(solar.vector.x, solar.vector.y, solar.vector.z)
      }

      // Perbarui posisi Bulan di orbitnya
      if (eng.moonMesh) {
        eng.moonMesh.position.set(moon.vector.x, moon.vector.y, moon.vector.z)
        // Bulan menghadap ke arah pusat Bumi (terkunci pasang surut)
        eng.moonMesh.lookAt(0, 0, 0)
      }

      // Rotasi awan sedikit lebih dinamis untuk efek atmosfer hidup
      if (eng.cloudsMesh) {
        eng.cloudsMesh.rotation.y += delta * 0.008
      }

      // Transisi kamera halus saat berganti fokus
      if (eng.isTransitioning && eng.controls) {
        eng.controls.target.lerp(eng.targetLookAt, 0.06)
        eng.camera.position.lerp(eng.targetCameraPos, 0.06)
        if (eng.camera.position.distanceTo(eng.targetCameraPos) < 0.08) {
          eng.isTransitioning = false
        }
      }

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    // 12. Responsive Resize
    const handleResize = () => {
      if (!mount) return
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animId)
      controls.dispose()
      renderer.dispose()
      earthGeometry.dispose()
      earthMaterial.dispose()
      cloudsGeometry.dispose()
      cloudsMaterial.dispose()
      moonGeometry.dispose()
      moonMaterial.dispose()
      moonOrbitGeo.dispose()
      starGeo.dispose()
      starMat.dispose()
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Format Waktu Indonesia Barat (WIB) dan UTC
  const formatTimeIndo = (date) => {
    return date.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  const formatDateIndo = (date) => {
    return date.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTimeUTC = (date) => {
    return date.toLocaleTimeString('en-GB', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#010307] font-sans select-none text-neutral-200">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Indikator Memuat Awal */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#010307] text-neutral-300">
          <div className="w-9 h-9 border-2 border-neutral-700 border-t-white rounded-full animate-spin mb-3" />
          <p className="font-mono-tech text-xs tracking-wider uppercase text-neutral-400">
            Menginisialisasi Model Astronomi Tiga Dimensi...
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* PANEL ATAS KIRI: TELEMETRI WAKTU NYATA & KOORDINAT SURYA */}
      {/* ======================================================== */}
      <div className="absolute top-5 left-5 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="bg-[#090D16]/85 backdrop-blur-md border border-neutral-800/80 px-4 py-3 rounded-lg shadow-xl pointer-events-auto">
          {/* Header Status */}
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-neutral-800">
            <span className={`w-2 h-2 rounded-full ${isRealtime ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-mono-tech text-[11px] font-bold tracking-wider text-neutral-200 uppercase">
              {isRealtime ? 'Sistem Siang & Malam Waktu Nyata' : 'Mode Simulasi Waktu Manual'}
            </span>
          </div>

          {/* Jam WIB & UTC */}
          <div className="grid grid-cols-2 gap-4 mb-2.5">
            <div>
              <p className="font-mono-tech text-[10px] text-neutral-400 uppercase tracking-wide">Waktu Indonesia (WIB)</p>
              <p className="font-mono-tech text-lg font-bold text-white tracking-tight">
                {formatTimeIndo(currentDate)}
              </p>
            </div>
            <div>
              <p className="font-mono-tech text-[10px] text-neutral-400 uppercase tracking-wide">Waktu Universal (UTC)</p>
              <p className="font-mono-tech text-lg font-bold text-neutral-300 tracking-tight">
                {formatTimeUTC(currentDate)}
              </p>
            </div>
          </div>

          <p className="font-mono-tech text-[11px] text-neutral-400 mb-2">
            {formatDateIndo(currentDate)}
          </p>

          {/* Posisi Zenit Matahari */}
          <div className="pt-2 border-t border-neutral-800/80 space-y-1 text-xs font-mono-tech">
            <div className="flex items-center justify-between gap-4">
              <span className="text-neutral-400">Titik Sub-Solar (Zenit):</span>
              <span className="font-medium text-amber-300">
                {formatCoordinate(solarData.declinationDeg, solarData.subsolarLonDeg)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-neutral-400">Deklinasi Matahari:</span>
              <span className="text-neutral-200">{solarData.declinationDeg.toFixed(2)}°</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PANEL ATAS KANAN: KONTROL FOKUS KAMERA & VISUALISASI     */}
      {/* ======================================================== */}
      <div className="absolute top-5 right-5 z-20 flex flex-col items-end gap-2.5 pointer-events-auto">
        <div className="bg-[#090D16]/85 backdrop-blur-md border border-neutral-800/80 p-3 rounded-lg shadow-xl flex flex-col gap-2 min-w-[210px]">
          <span className="font-mono-tech text-[10px] text-neutral-400 uppercase tracking-wider pb-1.5 border-b border-neutral-800">
            Arahkan Kamera
          </span>

          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setFocus('earth')}
              className={`flex flex-col items-center justify-center p-2 rounded text-xs font-mono-tech transition cursor-pointer ${
                cameraFocus === 'earth'
                  ? 'bg-white text-black font-bold shadow-xs'
                  : 'bg-neutral-900/90 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5 mb-1" />
              <span>Bumi</span>
            </button>

            <button
              onClick={() => setFocus('moon')}
              className={`flex flex-col items-center justify-center p-2 rounded text-xs font-mono-tech transition cursor-pointer ${
                cameraFocus === 'moon'
                  ? 'bg-white text-black font-bold shadow-xs'
                  : 'bg-neutral-900/90 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <Moon className="w-3.5 h-3.5 mb-1" />
              <span>Bulan</span>
            </button>

            <button
              onClick={() => setFocus('sun')}
              className={`flex flex-col items-center justify-center p-2 rounded text-xs font-mono-tech transition cursor-pointer ${
                cameraFocus === 'sun'
                  ? 'bg-amber-400 text-black font-bold shadow-xs'
                  : 'bg-neutral-900/90 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <Sun className="w-3.5 h-3.5 mb-1 text-amber-300" />
              <span>Matahari</span>
            </button>
          </div>

          {/* Toggle Awan */}
          <button
            onClick={() => setShowClouds(!showClouds)}
            className="flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono-tech bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition cursor-pointer border border-neutral-800"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-neutral-400" />
              Lapisan Awan
            </span>
            <span className="font-bold text-[10px] text-neutral-400">{showClouds ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Info Fase Bulan */}
        <div className="bg-[#090D16]/85 backdrop-blur-md border border-neutral-800/80 px-3.5 py-2.5 rounded-lg shadow-xl min-w-[210px]">
          <div className="flex items-center gap-2 mb-1">
            <Moon className="w-3.5 h-3.5 text-neutral-300" />
            <p className="font-mono-tech text-[10px] text-neutral-400 uppercase tracking-wider">Fase Bulan Astronomi</p>
          </div>
          <p className="text-xs font-bold text-white leading-tight font-mono-tech">
            {lunarData.phaseName}
          </p>
          <p className="text-[11px] font-mono-tech text-neutral-400 mt-0.5">
            Iluminasi: ~{lunarData.phasePercentage}% siklus
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PANEL BAWAH: SCRUBBER WAKTU SIANG/MALAM (24 JAM)         */}
      {/* ======================================================== */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-2xl pointer-events-auto">
        <div className="bg-[#090D16]/90 backdrop-blur-md border border-neutral-800/80 px-4 py-3 rounded-lg shadow-2xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono-tech">
            <div className="flex items-center gap-2 text-neutral-300">
              <Sliders className="w-3.5 h-3.5 text-neutral-400" />
              <span>Simulasi Siklus 24 Jam:</span>
              <span className="text-white font-bold">
                {currentDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })} WIB
              </span>
            </div>

            {!isRealtime && (
              <button
                onClick={handleResetToRealtime}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono-tech bg-white hover:bg-neutral-200 text-black font-semibold rounded transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Kembali ke Waktu Nyata Sekarang
              </button>
            )}
          </div>

          {/* Range Slider 0.0 - 23.99 */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono-tech text-neutral-500">00:00</span>
            <input
              type="range"
              min="0"
              max="23.99"
              step="0.1"
              value={
                simulationHour !== null
                  ? simulationHour
                  : currentDate.getHours() + currentDate.getMinutes() / 60
              }
              onChange={(e) => handleHourSliderChange(parseFloat(e.target.value))}
              className="w-full accent-white h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] font-mono-tech text-neutral-500">23:59</span>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono-tech text-neutral-500 pt-0.5">
            <span>Tarik slider untuk melihat pergeseran matahari & lampu kota di malam hari</span>
            <span>Navigasi: Drag Kiri (Putar) | Drag Kanan (Geser) | Scroll (Zoom)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
