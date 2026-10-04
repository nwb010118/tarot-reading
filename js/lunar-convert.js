function getLunarRawData(year) {
  return LUNAR_TABLE_DATA.DATA[year - LUNAR_TABLE_DATA.BASE_YEAR];
}

function getLunarIntercalationMonth(lunarData) {
  return (lunarData >> 12) & 0x000f;
}

function getLunarYearDays(year) {
  return (getLunarRawData(year) >> 17) & 0x01ff;
}

function getLunarMonthDays(year, month, isIntercalation) {
  const lunarData = getLunarRawData(year);
  const isBigMonth = (isIntercalation && getLunarIntercalationMonth(lunarData) === month)
    ? ((lunarData >> 16) & 0x01) > 0
    : ((lunarData >> (12 - month)) & 0x01) > 0;
  return isBigMonth ? LUNAR_TABLE_DATA.LUNAR_BIG_MONTH_DAY : LUNAR_TABLE_DATA.LUNAR_SMALL_MONTH_DAY;
}

function getLunarDaysBeforeBaseYear(year) {
  let days = 0;
  for (let y = LUNAR_TABLE_DATA.BASE_YEAR; y <= year; y += 1) days += getLunarYearDays(y);
  return days;
}

function getLunarDaysBeforeBaseMonth(year, month, isIntercalation) {
  let days = 0;
  if (year >= LUNAR_TABLE_DATA.BASE_YEAR && month > 0) {
    for (let m = 1; m <= month; m += 1) days += getLunarMonthDays(year, m, false);
    if (isIntercalation) {
      const im = getLunarIntercalationMonth(getLunarRawData(year));
      if (im > 0 && im < month + 1) days += getLunarMonthDays(year, im, true);
    }
  }
  return days;
}

function getLunarAbsDays(year, month, day, isIntercalation) {
  let days = getLunarDaysBeforeBaseYear(year - 1) + getLunarDaysBeforeBaseMonth(year, month - 1, true) + day;
  if (isIntercalation && getLunarIntercalationMonth(getLunarRawData(year)) === month) {
    days += getLunarMonthDays(year, month, false);
  }
  return days;
}

function isSolarIntercalationYear(lunarData) {
  return ((lunarData >> 30) & 0x01) > 0;
}

function getSolarYearDays(year) {
  return isSolarIntercalationYear(getLunarRawData(year)) ? LUNAR_TABLE_DATA.SOLAR_BIG_YEAR_DAY : LUNAR_TABLE_DATA.SOLAR_SMALL_YEAR_DAY;
}

function getSolarMonthDays(year, month) {
  if (month === 2 && isSolarIntercalationYear(getLunarRawData(year))) return LUNAR_TABLE_DATA.SOLAR_DAYS[12];
  return LUNAR_TABLE_DATA.SOLAR_DAYS[month - 1];
}

function getSolarDaysBeforeBaseYear(year) {
  let days = 0;
  for (let y = LUNAR_TABLE_DATA.BASE_YEAR; y <= year; y += 1) days += getSolarYearDays(y);
  return days;
}

function getSolarDaysBeforeBaseMonth(year, month) {
  let days = 0;
  for (let m = 1; m <= month; m += 1) days += getSolarMonthDays(year, m);
  return days;
}

function getSolarAbsDays(year, month, day) {
  return getSolarDaysBeforeBaseYear(year - 1) + getSolarDaysBeforeBaseMonth(year, month - 1) + day - LUNAR_TABLE_DATA.SOLAR_LUNAR_DAY_DIFF;
}

// 음력 날짜 -> 양력 날짜. 데이터 테이블의 원본 지원 범위는 1000~2050년이지만,
// 이 앱이 사용자 입력으로 허용하는 범위는 1900~2050년이다(js/app.js에서 별도 검증).
// 유효하지 않은 날짜(범위 밖 연/월/일, 해당 월의 실제 일수를 초과하는 일)면 null.
function lunarToSolar(lunarYear, lunarMonth, lunarDay, isIntercalation) {
  if (lunarYear < LUNAR_TABLE_DATA.BASE_YEAR || lunarYear > LUNAR_TABLE_DATA.BASE_YEAR + LUNAR_TABLE_DATA.DATA.length - 1) {
    return null;
  }
  if (lunarMonth < 1 || lunarMonth > 12 || lunarDay < 1) {
    return null;
  }
  if (lunarDay > getLunarMonthDays(lunarYear, lunarMonth, isIntercalation)) {
    return null;
  }

  const absDays = getLunarAbsDays(lunarYear, lunarMonth, lunarDay, isIntercalation);
  const solarYear = absDays < getSolarAbsDays(lunarYear + 1, 1, 1) ? lunarYear : lunarYear + 1;
  let solarMonth = 0;
  let solarDay = 0;

  for (let month = 12; month > 0; month -= 1) {
    const absDaysByMonth = getSolarAbsDays(solarYear, month, 1);
    if (absDays >= absDaysByMonth) {
      solarMonth = month;
      solarDay = absDays - absDaysByMonth + 1;
      break;
    }
  }

  return { year: solarYear, month: solarMonth, day: solarDay };
}

// 음력 생년월일 글자를 읽는다. 아이폰 숫자 키패드에는 '-'가 없어서 19900215처럼 숫자만 쓰거나
// 점·빗금·공백·'년 월 일'로 나눠 써도 받는다. 연도는 네 자리만. 읽을 수 없으면 null.
function parseLunarDateText(text) {
  const t = String(text || '').trim();
  let m = /^(\d{4})(\d{2})(\d{2})$/.exec(t);
  if (!m) m = /^(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D*$/.exec(t);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

// 그 해의 윤달(1~12). 윤달이 없거나 표 범위 밖이면 0.
function getLunarLeapMonth(year) {
  const data = getLunarRawData(year);
  return data === undefined ? 0 : getLunarIntercalationMonth(data);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { lunarToSolar, parseLunarDateText, getLunarLeapMonth };
}
