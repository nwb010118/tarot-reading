// 띠는 설날(음력 1월 1일) 기준: 생일이 그해 설날보다 앞이면 전년도 띠로 본다.
// lunarToSolarFn은 브라우저에서는 전역 lunarToSolar, Node에서는 인자로 주입한다.
function getEffectiveDdiYear(year, month, day, lunarToSolarFn) {
  if (!month || !day) return { year: year, adjusted: false };
  const seollal = lunarToSolarFn(year, 1, 1, false);
  if (!seollal) return { year: year, adjusted: false };
  const before = month < seollal.month || (month === seollal.month && day < seollal.day);
  return before
    ? { year: year - 1, adjusted: true, seollal: seollal }
    : { year: year, adjusted: false, seollal: seollal };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getEffectiveDdiYear };
}
