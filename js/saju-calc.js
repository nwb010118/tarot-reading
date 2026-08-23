function normalizeMod(n, m) {
  return ((n % m) + m) % m;
}

function normalizeDegrees(deg) {
  return normalizeMod(deg, 360);
}

function degToRad(deg) {
  return deg * Math.PI / 180;
}

function toJulianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Meeus 저정밀 태양 좌표 공식 (정확도 약 0.01도)
function solarLongitude(date) {
  const JD = toJulianDay(date);
  const T = (JD - 2451545.0) / 36525;
  const L0 = normalizeDegrees(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = normalizeDegrees(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mrad = degToRad(M);
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
    + 0.000289 * Math.sin(3 * Mrad);
  const trueLongitude = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLongitude - 0.00569 - 0.00478 * Math.sin(degToRad(omega));
  return normalizeDegrees(lambda);
}

// seedInstant에 가장 가까운, 태양황경이 targetLongitude가 되는 시각을 뉴턴법으로 역산
function findSolarTermMoment(seedInstant, targetLongitude) {
  let t = seedInstant;
  for (let i = 0; i < 8; i += 1) {
    const lambda = solarLongitude(t);
    let diff = targetLongitude - lambda;
    diff = normalizeMod(diff + 180, 360) - 180;
    t = new Date(t.getTime() + (diff / 0.9856) * 86400000);
  }
  return t;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeMod, normalizeDegrees, solarLongitude, findSolarTermMoment, toJulianDay };
}
