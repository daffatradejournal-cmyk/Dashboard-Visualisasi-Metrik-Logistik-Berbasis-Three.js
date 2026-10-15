import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { calculateSolarPosition, calculateMoonPosition, formatCoordinate } from '../utils/astronomy'
import { Sun, Moon, Globe2, Layers, RotateCcw, Sliders } from 'lucide-react'

// Pembuat tekstur korona cahaya matahari procedural fotorealistik
function createSunCoronaTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
  gradient.addColorStop(0, 'rgba(255, 255, 245, 1.0)')
  gradient.addColorStop(0.12, 'rgba(255, 225, 140, 0.85)')
  gradient.addColorStop(0.35, 'rgba(255, 150, 50, 0.35)')
  gradient.addColorStop(0.7, 'rgba(255, 90, 20, 0.06)')
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 512)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export default function Earth3D() {
  const mountRef = useRef(null)

  // Status waktu
  const [isRealtime, setIsRealtime] = useState(true)
  const [simulationHour, setSimulationHour] = useState(null)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Status visual
  const [showClouds, setShowClouds] = useState(true)
  const [cameraFocus, setCameraFocus] = useState('earth')
  const [isLoading, setIsLoading] = useState(true)

  // Data astronomis
  const [solarData, setSolarData] = useState(() => calculateSolarPosition(new Date()))
  const [lunarData, setLunarData] = useState(() => calculateMoonPosition(new Date()))

  // References loop animasi Three.js
  const engineRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    earthMesh: null,
    earthMaterial: null,
    cloudsMesh: null,
    cloudsMaterial: null,
    atmosphereMesh: null,
    atmosphereMaterial: null,
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
        setSolarData(calculateSolarPosition(now))
        setLunarData(calculateMoonPosition(now))
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [isRealtime])

  // Simulasi waktu via slider
  const handleHourSliderChange = (hourVal) => {
    setIsRealtime(false)
    setSimulationHour(hourVal)
    const simulatedDate = new Date()
    const wholeHours = Math.floor(hourVal)
    const minutes = Math.floor((hourVal - wholeHours) * 60)
    simulatedDate.setHours(wholeHours, minutes, 0, 0)
    setCurrentDate(simulatedDate)
    engineRef.current.currentDate = simulatedDate
    setSolarData(calculateSolarPosition(simulatedDate))
    setLunarData(calculateMoonPosition(simulatedDate))
  }

  // Reset ke waktu nyata
  const handleResetToRealtime = () => {
    setIsRealtime(true)
    setSimulationHour(null)
    const now = new Date()
    setCurrentDate(now)
    engineRef.current.currentDate = now
    setSolarData(calculateSolarPosition(now))
    setLunarData(calculateMoonPosition(now))
  }

  // Fokus kamera
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

  // Toggle awan
  useEffect(() => {
    if (engineRef.current.cloudsMesh) {
      engineRef.current.cloudsMesh.visible = showClouds
    }
  }, [showClouds])

  // ==========================================
  // INISIALISASI THREE.JS SCENE UTAMA
  // ==========================================
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth
    const height = mount.clientHeight

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x010204)
    engineRef.current.scene = scene

    // 2. Kamera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 1.2, 5.5)
    engineRef.current.camera = camera

    // 3. Renderer dengan Anisotropic Filtering & ACES Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    mount.appendChild(renderer.domElement)
    engineRef.current.renderer = renderer

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy() || 8

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 2.4
    controls.maxDistance = 60
    controls.rotateSpeed = 0.7
    controls.zoomSpeed = 1.0
    engineRef.current.controls = controls

    // 5. Texture Loader (Tekstur Ultra HD 4K)
    const textureLoader = new THREE.TextureLoader()

    const configureTexture = (tex) => {
      tex.anisotropy = maxAnisotropy
      tex.generateMipmaps = true
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.magFilter = THREE.LinearFilter
      return tex
    }

    // 4K Blue Marble Earth Daymap
    const dayTexture = configureTexture(textureLoader.load('/textures/2_no_clouds_4k.jpg', () => {
      setIsLoading(false)
    }))
    dayTexture.colorSpace = THREE.SRGBColorSpace

    // 4K Water / Ocean Mask
    const waterTexture = configureTexture(textureLoader.load('/textures/water_4k.png'))

    // 4K Elevation Bump Map
    const bumpTexture = configureTexture(textureLoader.load('/textures/elev_bump_4k.jpg'))

    // 2K Earth Night City Lights
    const nightTexture = configureTexture(textureLoader.load('/textures/earth_lights.png'))
    nightTexture.colorSpace = THREE.SRGBColorSpace

    // 4K Fair Clouds (32-bit ARGB dengan feathering halus anti-pixelated)
    const cloudsTexture = configureTexture(textureLoader.load('/textures/fair_clouds_4k.png'))

    // Moon Texture
    const moonTexture = configureTexture(textureLoader.load('/textures/moon.jpg'))
    moonTexture.colorSpace = THREE.SRGBColorSpace

    const earthRadius = 1.8
    const initialSolar = calculateSolarPosition(engineRef.current.currentDate)

    // ==========================================
    // 6. SHADER PERMUKAAN BUMI GOOGLE EARTH GRADE
    // ==========================================
    const earthGeometry = new THREE.SphereGeometry(earthRadius, 96, 96)

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
      uniform sampler2D waterMap;
      uniform vec3 sunPosition;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 sunDir = normalize(sunPosition - vWorldPosition);
        
        // Sudut sinar matahari
        float sunDot = dot(normal, sunDir);
        
        vec4 dayColor = texture2D(dayMap, vUv);
        vec4 nightLights = texture2D(nightMap, vUv);
        vec4 waterMask = texture2D(waterMap, vUv);
        
        // Transisi senja/fajar halus (twilight terminator)
        float dayFactor = smoothstep(-0.06, 0.08, sunDot);
        
        // Sisi malam: Lampu kota berpijar + ambient antariksa
        vec3 nightAmbient = vec3(0.006, 0.010, 0.018);
        vec3 cityLights = nightLights.rgb * (1.0 - dayFactor) * 2.4;
        vec3 nightHemisphere = cityLights + nightAmbient;
        
        // Sisi siang: Cahaya matahari natural seimbang
        float diffuse = max(sunDot, 0.0);
        vec3 dayHemisphere = dayColor.rgb * (diffuse * 0.94 + 0.06);
        
        // Pantulan kilau matahari pada laut (Sun glint halus, tidak silau berlebih)
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        vec3 halfVec = normalize(sunDir + viewDir);
        float isWater = waterMask.r;
        float specIntensity = pow(max(dot(normal, halfVec), 0.0), 64.0) * isWater * 0.55;
        vec3 sunGlint = vec3(1.0, 0.96, 0.88) * specIntensity * dayFactor;
        
        // Permukaan dasar bumi
        vec3 surfaceColor = mix(nightHemisphere, dayHemisphere, dayFactor) + sunGlint;
        
        // Hamburan atmosfer Rayleigh tipis di horizon siang hari
        float rim = 1.0 - max(dot(viewDir, normal), 0.0);
        float atmosphereIntensity = pow(rim, 3.2);
        vec3 dayAtmosphere = vec3(0.24, 0.62, 1.0) * atmosphereIntensity * max(sunDot * 0.6 + 0.4, 0.0);
        
        gl_FragColor = vec4(surfaceColor + dayAtmosphere, 1.0);
      }
    `

    const earthMaterial = new THREE.ShaderMaterial({
      vertexShader: earthVertexShader,
      fragmentShader: earthFragmentShader,
      uniforms: {
        dayMap: { value: dayTexture },
        nightMap: { value: nightTexture },
        waterMap: { value: waterTexture },
        sunPosition: { value: new THREE.Vector3(initialSolar.vector.x, initialSolar.vector.y, initialSolar.vector.z) },
      },
    })

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial)
    scene.add(earthMesh)
    engineRef.current.earthMesh = earthMesh
    engineRef.current.earthMaterial = earthMaterial

    // ==========================================
    // 7. LAPISAN AWAN ULTRA HD 4K (HALUS & TRANSPARAN)
    // ==========================================
    const cloudsGeometry = new THREE.SphereGeometry(earthRadius * 1.006, 96, 96)

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
        
        // Sampel awan 32-bit ARGB halus
        vec4 cloudSample = texture2D(cloudsMap, vUv);
        float cloudAlpha = cloudSample.a;
        
        if (cloudAlpha < 0.01) {
          discard;
        }
        
        // Pencahayaan awan siang vs malam
        float daylight = smoothstep(-0.06, 0.12, sunDot);
        vec3 dayCloud = vec3(1.0, 1.0, 1.0);
        vec3 nightCloud = vec3(0.012, 0.016, 0.028);
        vec3 cloudColor = mix(nightCloud, dayCloud, daylight);
        
        // Alpha halus tembus pandang alami
        float finalAlpha = cloudAlpha * 0.76;
        
        gl_FragColor = vec4(cloudColor, finalAlpha);
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

    // ==========================================
    // 8. ATMOSFER GLOW CIRI KHAS GOOGLE EARTH (HALO BIRU)
    // ==========================================
    const atmosphereVertexShader = `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

    const atmosphereFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      uniform vec3 sunPosition;

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        vec3 sunDir = normalize(sunPosition - vWorldPosition);
        vec3 normal = normalize(vNormal);
        
        // Pendaran cahaya atmosfer di sekeliling bola bumi
        float intensity = pow(0.68 - dot(normal, viewDir), 2.8);
        
        // Lebih menyala di sisi yang terkena matahari
        float daylightFactor = smoothstep(-0.2, 0.35, dot(normal, sunDir));
        vec3 skyColor = mix(vec3(0.04, 0.14, 0.32), vec3(0.32, 0.70, 1.0), daylightFactor);
        
        gl_FragColor = vec4(skyColor, intensity * (daylightFactor * 0.75 + 0.15));
      }
    `

    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        sunPosition: { value: new THREE.Vector3(initialSolar.vector.x, initialSolar.vector.y, initialSolar.vector.z) },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    })

    const atmosphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius * 1.028, 96, 96),
      atmosphereMaterial
    )
    scene.add(atmosphereMesh)
    engineRef.current.atmosphereMesh = atmosphereMesh
    engineRef.current.atmosphereMaterial = atmosphereMaterial

    // ==========================================
    // 9. MODEL BULAN HD DENGAN TEKSTUR KAWAH
    // ==========================================
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

    // Garis lintasan orbit Bulan halus
    const moonOrbitGeo = new THREE.BufferGeometry()
    const orbitPoints = []
    for (let i = 0; i <= 96; i++) {
      const angle = (i / 96) * Math.PI * 2
      const ox = 9.2 * Math.cos(angle)
      const oy = 9.2 * Math.sin(angle) * Math.sin(5.14 * (Math.PI / 180))
      const oz = 9.2 * Math.sin(angle) * Math.cos(5.14 * (Math.PI / 180))
      orbitPoints.push(new THREE.Vector3(ox, oy, oz))
    }
    moonOrbitGeo.setFromPoints(orbitPoints)
    const moonOrbitLine = new THREE.Line(
      moonOrbitGeo,
      new THREE.LineBasicMaterial({ color: 0x243248, transparent: true, opacity: 0.4 })
    )
    scene.add(moonOrbitLine)

    // ==========================================
    // 10. MATAHARI SEBENARNYA & CAHAYA DIRECT
    // ==========================================
    const sunGroup = new THREE.Group()
    sunGroup.position.set(initialSolar.vector.x, initialSolar.vector.y, initialSolar.vector.z)

    const sunCoreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.9, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xfffef4 })
    )
    sunGroup.add(sunCoreMesh)

    // Korona matahari berpijar
    const sunCoronaTexture = createSunCoronaTexture()
    const sunCoronaSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sunCoronaTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    sunCoronaSprite.scale.set(13, 13, 1)
    sunGroup.add(sunCoronaSprite)
    scene.add(sunGroup)
    engineRef.current.sunGroup = sunGroup

    // Directional Sunlight menuju pusat Bumi
    const sunLight = new THREE.DirectionalLight(0xfff9ef, 2.7)
    sunLight.position.set(initialSolar.vector.x, initialSolar.vector.y, initialSolar.vector.z)
    sunLight.target.position.set(0, 0, 0)
    scene.add(sunLight)
    scene.add(sunLight.target)
    engineRef.current.sunLight = sunLight

    // Ambient light angkasa
    const ambientLight = new THREE.AmbientLight(0x0a101d, 0.22)
    scene.add(ambientLight)

    // 11. Bintang Latar Belakang (Starfield)
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
      opacity: 0.75,
    })
    scene.add(new THREE.Points(starGeo, starMat))

    // ==========================================
    // 12. ANIMATION & RENDER LOOP
    // ==========================================
    let animId
    const clock = new THREE.Clock()

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const eng = engineRef.current

      const solar = calculateSolarPosition(eng.currentDate)
      const moon = calculateMoonPosition(eng.currentDate)

      // Perbarui posisi Matahari
      if (eng.sunGroup && eng.sunLight) {
        eng.sunGroup.position.set(solar.vector.x, solar.vector.y, solar.vector.z)
        eng.sunLight.position.set(solar.vector.x, solar.vector.y, solar.vector.z)
      }

      // Perbarui uniform shader
      if (eng.earthMaterial) {
        eng.earthMaterial.uniforms.sunPosition.value.set(solar.vector.x, solar.vector.y, solar.vector.z)
      }
      if (eng.cloudsMaterial) {
        eng.cloudsMaterial.uniforms.sunPosition.value.set(solar.vector.x, solar.vector.y, solar.vector.z)
      }
      if (eng.atmosphereMaterial) {
        eng.atmosphereMaterial.uniforms.sunPosition.value.set(solar.vector.x, solar.vector.y, solar.vector.z)
      }

      // Perbarui posisi Bulan
      if (eng.moonMesh) {
        eng.moonMesh.position.set(moon.vector.x, moon.vector.y, moon.vector.z)
        eng.moonMesh.lookAt(0, 0, 0)
      }

      // Pergerakan awan dinamis sangat halus (tanpa tersendat)
      if (eng.cloudsMesh) {
        eng.cloudsMesh.rotation.y += delta * 0.006
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

    // 13. Responsive Resize
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
      atmosphereMesh.geometry.dispose()
      atmosphereMaterial.dispose()
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
    <div className="relative w-screen h-screen overflow-hidden bg-[#010204] font-sans select-none text-neutral-200">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Indikator Memuat Awal */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#010204] text-neutral-300">
          <div className="w-8 h-8 border-2 border-neutral-700 border-t-white rounded-full animate-spin mb-3" />
          <p className="font-mono-tech text-xs tracking-wider uppercase text-neutral-400">
            Memuat Citra Satelit Bumi & Awan 4K...
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* PANEL ATAS KIRI: TELEMETRI OBSERVATORIUM                */}
      {/* ======================================================== */}
      <div className="absolute top-5 left-5 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="bg-[#080C14]/85 backdrop-blur-md border border-neutral-800/80 px-4 py-3 rounded-lg shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-neutral-800">
            <span className={`w-2 h-2 rounded-full ${isRealtime ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-mono-tech text-[11px] font-bold tracking-wider text-neutral-200 uppercase">
              {isRealtime ? 'Sinkronisasi Waktu Nyata' : 'Mode Simulasi Waktu'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-2">
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
        <div className="bg-[#080C14]/85 backdrop-blur-md border border-neutral-800/80 p-3 rounded-lg shadow-xl flex flex-col gap-2 min-w-[210px]">
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

          <button
            onClick={() => setShowClouds(!showClouds)}
            className="flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono-tech bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition cursor-pointer border border-neutral-800"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-neutral-400" />
              Lapisan Awan 4K
            </span>
            <span className="font-bold text-[10px] text-neutral-400">{showClouds ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Info Fase Bulan */}
        <div className="bg-[#080C14]/85 backdrop-blur-md border border-neutral-800/80 px-3.5 py-2.5 rounded-lg shadow-xl min-w-[210px]">
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
        <div className="bg-[#080C14]/90 backdrop-blur-md border border-neutral-800/80 px-4 py-3 rounded-lg shadow-2xl flex flex-col gap-2">
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
