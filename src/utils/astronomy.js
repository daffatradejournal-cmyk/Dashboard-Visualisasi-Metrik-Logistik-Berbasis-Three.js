/**
 * astronomy.js
 * 
 * Modul kalkulasi astronomis presisi untuk posisi Matahari, perputaran Bumi waktu-nyata,
 * dan orbit Bulan berdasarkan Waktu Universal Terkoordinasi (UTC).
 */

/**
 * Menghitung posisi Matahari terhadap Bumi untuk tanggal/waktu tertentu
 * @param {Date} date - Objek Date (default: saat ini)
 * @returns {Object} Vektor posisi matahari, koordinat lintang/bujur sub-solar, dan declinasi
 */
export function calculateSolarPosition(date) {
  const time = date.getTime()
  // Hari Julian sejak 1 Januari 2000 12:00 UTC (J2000.0)
  const d = (time / 86400000) - 10957.5

  // Rata-rata bujur Matahari (derajat)
  const L = (280.460 + 0.9856474 * d) % 360

  // Anomali rata-rata Matahari (radian)
  const g = ((357.528 + 0.9856003 * d) % 360) * (Math.PI / 180)

  // Bujur ekliptika Matahari (derajat)
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) % 360
  const lambdaRad = lambda * (Math.PI / 180)

  // Kemiringan sumbu rotasi bumi (Obliquity of Ecliptic ~ 23.44 derajat)
  const epsilonRad = 23.439 * (Math.PI / 180)

  // Deklinasi Matahari (Latitude di mana matahari tepat di zenit)
  const sinDeclination = Math.sin(epsilonRad) * Math.sin(lambdaRad)
  const declinationRad = Math.asin(sinDeclination)
  const declinationDeg = declinationRad * (180 / Math.PI)

  // Bujur Sub-Solar (Longitude di mana matahari tepat di zenit saat ini)
  // 12:00 UTC = 0° Bujur (Greenwich). Setiap jam matahari bergeser 15° ke barat (-15°/jam).
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3600000
  
  // Bujur dalam rentang -180° hingga +180°
  let subsolarLonDeg = (12 - utcHours) * 15
  while (subsolarLonDeg > 180) subsolarLonDeg -= 360
  while (subsolarLonDeg < -180) subsolarLonDeg += 360

  const lonRad = (subsolarLonDeg * Math.PI) / 180

  // Jarak visual matahari dari bumi untuk rendering
  const distance = 42

  // Konversi ke koordinat Cartesian Three.js (Prime Meridian di +X pada sphere rot=0)
  const x = distance * Math.cos(declinationRad) * Math.cos(lonRad)
  const y = distance * Math.sin(declinationRad)
  const z = -distance * Math.cos(declinationRad) * Math.sin(lonRad)

  return {
    vector: { x, y, z },
    distance,
    declinationDeg,
    subsolarLonDeg,
    utcHours,
  }
}

/**
 * Menghitung posisi Bulan dan fase bulan
 * @param {Date} date
 * @param {number} orbitRadius Jarak orbit Bulan dari Bumi dalam satuan visual Three.js
 */
export function calculateMoonPosition(date, orbitRadius = 9.2) {
  const time = date.getTime()
  // Periode orbit sinodis bulan ~ 29.53059 hari
  const synodicPeriod = 29.53058867 * 86400000
  // Referensi Bulan Baru yang diketahui: 11 Januari 2024 11:57 UTC
  const knownNewMoon = new Date('2024-01-11T11:57:00Z').getTime()
  
  const phaseCycle = ((time - knownNewMoon) % synodicPeriod + synodicPeriod) % synodicPeriod
  const phaseFraction = phaseCycle / synodicPeriod // 0.0 - 1.0

  // Posisi orbital Bulan mengelilingi Bumi
  const orbitAngle = phaseFraction * Math.PI * 2
  // Kemiringan bidang orbit bulan terhadap ekliptika (~5.14 derajat)
  const inclination = 5.14 * (Math.PI / 180)

  const x = orbitRadius * Math.cos(orbitAngle)
  const y = orbitRadius * Math.sin(orbitAngle) * Math.sin(inclination)
  const z = orbitRadius * Math.sin(orbitAngle) * Math.cos(inclination)

  // Nama fase bulan dalam Bahasa Indonesia
  let phaseName = 'Bulan Baru'
  if (phaseFraction >= 0.03 && phaseFraction < 0.22) {
    phaseName = 'Bulan Sabit Awal (Waxing Crescent)'
  } else if (phaseFraction >= 0.22 && phaseFraction < 0.28) {
    phaseName = 'Kuartir Pertama / Perbani Awal'
  } else if (phaseFraction >= 0.28 && phaseFraction < 0.47) {
    phaseName = 'Bulan Cembung Awal (Waxing Gibbous)'
  } else if (phaseFraction >= 0.47 && phaseFraction < 0.53) {
    phaseName = 'Bulan Purnama (Full Moon)'
  } else if (phaseFraction >= 0.53 && phaseFraction < 0.72) {
    phaseName = 'Bulan Cembung Akhir (Waning Gibbous)'
  } else if (phaseFraction >= 0.72 && phaseFraction < 0.78) {
    phaseName = 'Kuartir Ketiga / Perbani Akhir'
  } else if (phaseFraction >= 0.78 && phaseFraction < 0.97) {
    phaseName = 'Bulan Sabit Akhir (Waning Crescent)'
  }

  return {
    vector: { x, y, z },
    phaseFraction,
    phasePercentage: Math.round(phaseFraction * 100),
    phaseName,
  }
}

/**
 * Format koordinat derajat lintang/bujur dalam format geografis Indonesia
 */
export function formatCoordinate(latDeg, lonDeg) {
  const latStr = `${Math.abs(latDeg).toFixed(1)}° ${latDeg >= 0 ? 'LU' : 'LS'}`
  const lonStr = `${Math.abs(lonDeg).toFixed(1)}° ${lonDeg >= 0 ? 'BT' : 'BB'}`
  return `${latStr}, ${lonStr}`
}
