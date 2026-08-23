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

// 음력 날짜 -> 양력 날짜. 지원 범위(1000~2050) 밖이거나 유효하지 않으면 null.
function lunarToSolar(lunarYear, lunarMonth, lunarDay, isIntercalation) {
  if (lunarYear < LUNAR_TABLE_DATA.BASE_YEAR || lunarYear > LUNAR_TABLE_DATA.BASE_YEAR + LUNAR_TABLE_DATA.DATA.length - 1) {
    return null;
  }
  if (lunarMonth < 1 || lunarMonth > 12 || lunarDay < 1) {
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { lunarToSolar };
}
