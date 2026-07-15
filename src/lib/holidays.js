const HIJRI_EPOCH = 1948440

function gregorianToJulianDay(year, month, day) {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
}

function julianDayToGregorian(jd) {
  const a = jd + 32044
  const b = Math.floor((4 * a + 3) / 146097)
  const c = a - Math.floor(146097 * b / 4)
  const d = Math.floor((4 * c + 3) / 1461)
  const e = c - Math.floor(1461 * d / 4)
  const m = Math.floor((5 * e + 2) / 153)
  const day = e - Math.floor((153 * m + 2) / 5) + 1
  const month = m + 3 - 12 * Math.floor(m / 10)
  const year = 100 * b + d - 4800 + Math.floor(m / 10)
  return [year, month, day]
}

function hijriToJulianDay(hijriYear, hijriMonth, hijriDay) {
  return Math.floor((11 * hijriYear + 3) / 30) + 354 * hijriYear + 30 * hijriMonth - Math.floor((hijriMonth - 1) / 2) + hijriDay + 1948440 - 385
}

function julianDayToHijri(jd) {
  const l = jd - 1948440 + 10632
  const n = Math.floor((l - 1) / 10631)
  const remainder = l - 10631 * n + 354
  const j = Math.floor((10985 - remainder) / 5316) * Math.floor((50 * remainder) / 17719) + Math.floor(remainder / 5670) * Math.floor((43 * remainder) / 15238)
  const adjustedRemainder = remainder - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29
  const hijriMonth = Math.floor((24 * adjustedRemainder) / 709)
  const hijriDay = adjustedRemainder - Math.floor((709 * hijriMonth) / 24)
  const hijriYear = 30 * n + j - 30

  return [hijriYear, hijriMonth, hijriDay]
}

function getHijriYearForGregorian(gregYear) {
  const jd = gregorianToJulianDay(gregYear, 1, 1)
  const [hYear] = julianDayToHijri(jd)
  return hYear
}

function getGregorianFromHijri(hijriYear, hijriMonth, hijriDay) {
  const jd = hijriToJulianDay(hijriYear, hijriMonth, hijriDay)
  const [year, month, day] = julianDayToGregorian(jd)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatHijriDate(gregYear, hijriMonth, hijriDay) {
  const hijriYear = getHijriYearForGregorian(gregYear)
  return getGregorianFromHijri(hijriYear, hijriMonth, hijriDay)
}

function formatHijriDateNext(gregYear, hijriMonth, hijriDay) {
  const hijriYear = getHijriYearForGregorian(gregYear) + 1
  return getGregorianFromHijri(hijriYear, hijriMonth, hijriDay)
}

export function getHolidays(year) {
  const holidays = []

  // Sabit resmi tatiller
  holidays.push(
    { date: `${year}-01-01`, name: 'Yılbaşı', type: 'resmi' },
    { date: `${year}-04-23`, name: 'Ulusal Egemenlik ve Çocuk Bayramı', type: 'resmi' },
    { date: `${year}-05-01`, name: 'Emek ve Dayanışma Günü', type: 'resmi' },
    { date: `${year}-05-19`, name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", type: 'resmi' },
    { date: `${year}-07-15`, name: 'Demokrasi ve Milli Birlik Günü', type: 'resmi' },
    { date: `${year}-08-30`, name: 'Zafer Bayramı', type: 'resmi' },
    { date: `${year}-10-28`, name: 'Cumhuriyet Bayramı Arifesi (Yarım Gün)', type: 'resmi' },
    { date: `${year}-10-29`, name: 'Cumhuriyet Bayramı', type: 'resmi' },
  )

  // Hicri takvime göre hesaplanan bayramlar
  try {
    // Ramazan Bayramı: 1 Şevval (10. ay, 1. gün) + ertesi 3 gün
    const ramazanDate = formatHijriDate(year, 10, 1)
    const ramazanDateNext = formatHijriDateNext(year, 10, 1)

    // Hangisi bu yıla daha yakın?
    const rDate1 = new Date(ramazanDate)
    const rDate2 = new Date(ramazanDateNext)
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)

    let ramazanBase
    if (rDate1 >= yearStart && rDate1 <= yearEnd) {
      ramazanBase = ramazanDate
    } else if (rDate2 >= yearStart && rDate2 <= yearEnd) {
      ramazanBase = ramazanDateNext
    } else {
      ramazanBase = ramazanDate
    }

    const rb = new Date(ramazanBase)
    for (let i = 0; i < 4; i++) {
      const d = new Date(rb)
      d.setDate(d.getDate() + i)
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      holidays.push({
        date: ds,
        name: `Ramazan Bayramı (${i + 1}. Gün)`,
        type: 'bayram'
      })
    }

    // Kurban Bayramı: 10 Zilhice (12. ay, 10. gün) + ertesi 3 gün
    const kurbanDate = formatHijriDate(year, 12, 10)
    const kurbanDateNext = formatHijriDateNext(year, 12, 10)

    const kDate1 = new Date(kurbanDate)
    const kDate2 = new Date(kurbanDateNext)

    let kurbanBase
    if (kDate1 >= yearStart && kDate1 <= yearEnd) {
      kurbanBase = kurbanDate
    } else if (kDate2 >= yearStart && kDate2 <= yearEnd) {
      kurbanBase = kurbanDateNext
    } else {
      kurbanBase = kurbanDate
    }

    const kb = new Date(kurbanBase)
    for (let i = 0; i < 4; i++) {
      const d = new Date(kb)
      d.setDate(d.getDate() + i)
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      holidays.push({
        date: ds,
        name: `Kurban Bayramı (${i + 1}. Gün)`,
        type: 'bayram'
      })
    }
  } catch (e) {
    // Hesaplama hatası olursa sabit tarihlerle devam et
  }

  return holidays
}
