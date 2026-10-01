// 리딩 일기: 실천 약속의 확인일 계산, 확인 대상 선정, 연속 방문 기록. DOM에 의존하지 않는다.
const PROMISE_DUE_DAYS = { today: 1, week: 7, month: 30, month3: 90, month6: 180, year: 365 };
const VISITS_KEY = 'jeomjip_visits';
const MAX_VISIT_DAYS = 60;

function parseDayKey(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatDayKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function addDays(dayKey, days) {
  const d = parseDayKey(dayKey);
  d.setDate(d.getDate() + days);
  return formatDayKey(d);
}

function dueDateFor(period, todayKeyValue) {
  return addDays(todayKeyValue, PROMISE_DUE_DAYS[period] || 1);
}

function getDueEntries(history, todayKeyValue, limit) {
  return history.filter(function (entry) {
    return entry.promise && entry.promise.status === 'pending' && entry.promise.dueDate <= todayKeyValue;
  }).slice(0, limit || 3);
}

function readVisits(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(VISITS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function recordVisit(storage, todayKeyValue) {
  if (!storage) return;
  try {
    const visits = readVisits(storage);
    if (visits.indexOf(todayKeyValue) === -1) visits.push(todayKeyValue);
    visits.sort();
    storage.setItem(VISITS_KEY, JSON.stringify(visits.slice(-MAX_VISIT_DAYS)));
  } catch (e) { /* 저장 실패는 무시 */ }
}

function getStreak(storage, todayKeyValue) {
  if (!storage) return 0;
  const visits = new Set(readVisits(storage));
  let count = 0;
  let day = todayKeyValue;
  while (visits.has(day)) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}

const PROMISE_REPLIES = {
  done: '해냈군요. 그 경험이 다음 선택의 힘이 됩니다.',
  partial: '조금이라도 움직였다면 충분해요. 이어갈 한 걸음만 남겨두세요.',
  skipped: '괜찮아요. 못 한 이유를 알게 된 것도 수확입니다. 다시 작게 시작해보세요.'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PROMISE_DUE_DAYS, dueDateFor, addDays, getDueEntries, recordVisit, getStreak, PROMISE_REPLIES, VISITS_KEY };
}
