const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const calc = require('../js/saju-calc.js');

// Execute the actual summary renderer, with only unrelated prose/DOM plumbing
// stubbed. All date, pillar, age and fortune calculations use production code.
const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const renderer = source.slice(source.indexOf('  function showSajuSummary('),
  source.indexOf('  function saveSajuReading('));
const input = { year: 2020, month: 10, day: 16, hour: 16, minute: 0, timeUnknown: false };
function render(now, birth) {
  const element = function () { return { innerHTML: '', classList: { remove: function () {} } }; };
  function FixedDate(value) { return new Date(arguments.length ? value : now); }
  const context = Object.assign({}, calc, {
    Date: FixedDate, selectedCategory: null, selectedPeriod: 'today', selectedGender: 'male',
    selectedSubChoice: null, PERIOD_LABELS: { today: '오늘' }, CATEGORY_LABELS: {},
    getIlganByIndex: function () { return { name_kr: '일간', keywords: [], advice: '' }; },
    renderMyeongsikDetailTable: function () { return ''; },
    getElementBalanceText: function () { return ''; },
    resolveCategoryMeaning: function () { return ''; },
    renderKeywordsAdviceHtml: function () { return ''; },
    renderReadingMeaning: function () { return ''; },
    renderPracticePlan: function () { return ''; },
    pillarText: function (p) { return calc.CHEONGAN[p.stemIdx] + calc.JIJI[p.branchIdx]; },
    summaryEl: element(), newReadingButton: element(), shareButton: element(),
    birth: birth, saju: calc.calculateSaju(birth)
  });
  vm.runInNewContext(renderer + '\nshowSajuSummary(birth, saju);', context);
  return context.summaryEl.innerHTML;
}
function monthly(html) {
  return Array.from(html.matchAll(/class="wolun-col( current)?"><span class="wolun-ganji">([^<]+)<\/span><span class="wolun-month">([^<]+)<\/span>/g),
    function (m) { return { current: !!m[1], pillar: m[2], month: m[3] }; });
}
const autumn = render('2026-09-28T03:00:00Z', input);
assert.deepStrictEqual(monthly(autumn).map(function (m) { return m.month; }),
  ['인월', '묘월', '진월', '사월', '오월', '미월', '신월', '유월', '술월', '해월', '자월', '축월']);
assert.deepStrictEqual(monthly(autumn).map(function (m) { return m.pillar; }),
  ['경인', '신묘', '임진', '계사', '갑오', '을미', '병신', '정유', '무술', '기해', '경자', '신축']);
assert.deepStrictEqual(monthly(autumn).filter(function (m) { return m.current; }),
  [{ current: true, pillar: '정유', month: '유월' }]);
assert(autumn.indexOf('class="seun-table"') < autumn.indexOf('class="wolun-table"'));
const unknown = render('2026-09-28T03:00:00Z', Object.assign({}, input, { timeUnknown: true }));
assert(!/class="(?:daeun|seun|wolun)-table"|>월운|>세운|>대운/.test(unknown));
assert(!render('2021-09-28T03:00:00Z', input).includes('class="wolun-table"'), 'no active daeun');

// One minute either side of the astronomical boundary avoids rounding noise.
const ipchun = calc.findIpchun(2026).getTime();
[
  { now: ipchun - 60000, year: 2025, pillar: '기축', month: '축월' },
  { now: ipchun + 60000, year: 2026, pillar: '경인', month: '인월' },
  // KST is already 2026 while UTC (and many host timezones) is still 2025.
  { now: '2025-12-31T15:30:00Z', year: 2025, pillar: '무자', month: '자월' }
].forEach(function (fixture) {
  // An adult fixture keeps the existing host-calendar age gate active in all
  // timezones, isolating the monthly KST year calculation from that old gate.
  const html = render(fixture.now, Object.assign({}, input, { year: 1990 }));
  assert.deepStrictEqual(monthly(html).filter(function (m) { return m.current; }),
    [{ current: true, pillar: fixture.pillar, month: fixture.month }], 'solar year at ' + fixture.now);
  assert(html.includes('월운 · ' + fixture.year + '년 (입춘 기준)'), 'explicit monthly solar year');
});
console.log('Monthly UI: 12 labels/pillars, ordering, highlighting, unknown time, inactive daeun, Ipchun and KST rollover passed');
