const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const guidance = require('../data/reading-guidance.js');
const seeded = require('../js/seeded-random.js');
const { CATEGORY_SUBCHOICES, CATEGORY_LABELS } = require('../data/category-labels.js');
const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
function extract(name) {
  const start = source.indexOf('  function ' + name + '(');
  const end = source.indexOf('\n  }', start) + 4;
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
}
const context = Object.assign({}, guidance, { createRng: seeded.createRng, todayKey: seeded.todayKey, activeRng: Math.random, readingDay: seeded.todayKey, variantParts: () => [], readingVariant: () => 'v1', linkSubChoice: () => null, setShareState() {}, sharedView: false, renderOwnerIntro: () => '', renderOwnerOutro: () => '' }, {
  selectedCategory: 'money', selectedSubChoice: 'invest', selectedPeriod: 'year',
  selectedMode: 'tarot', CATEGORY_SUBCHOICES, CATEGORY_LABELS,
  SUBCHOICE_ENABLED_MODES: new Set(['tarot', 'saju', 'ddi', 'zodiac']),
  subchoiceSelect: { innerHTML: '', classList: { add() {}, toggle() {} }, querySelectorAll() { return []; } },
  escapeHtml: text => String(text).replace(/</g, '&lt;'),
  getZodiacByKey: () => ({ name_kr: '양자리', dateRange: '3/21 ~ 4/19', categories: { money: { invest: '수익을 확신하는 원래 문장' } }, keywords: ['판단'], advice: '' }),
  selectedZodiac: 'aries', renderKeywordsAdviceHtml: () => '', renderResultLinks: () => '',
  summaryEl: { innerHTML: '', classList: { remove() {} } },
  newReadingButton: { classList: { remove() {} } }, shareButton: { classList: { remove() {} } }
});
vm.createContext(context);
['pickRandom', 'resolveMeaningText', 'resolveSubchoiceValue', 'resolveCategoryMeaning', 'renderReadingMeaning', 'renderEvidence', 'renderPracticePlan', 'showZodiacSummary', 'renderSubChoices'].forEach(name => vm.runInContext(extract(name), context));
// 하루 구성 렌더러는 별도 UI 테스트에서 확인하고, 여기서는 주제·기간 선택이 결과 조립에 닿는지만 본다
vm.runInContext('function renderZodiacDay(zodiac) { return "<div class=\\"reading-detail\\">" + renderReadingMeaning(resolveCategoryMeaning(zodiac, selectedCategory, selectedPeriod, selectedSubChoice)) + "</div>"; }', context);
vm.runInContext('showZodiacSummary()', context);
assert.ok(context.summaryEl.innerHTML.includes('분기마다'), 'selected year must reach the actual result');
assert.ok(context.summaryEl.innerHTML.includes('예측하지 않습니다'));
assert.ok(!context.summaryEl.innerHTML.includes('수익을 확신하는 원래 문장'), 'sensitive prediction must not leak');
context.selectedPeriod = 'today';
vm.runInContext('showZodiacSummary()', context);
assert.ok(context.summaryEl.innerHTML.includes('저녁에'));
vm.runInContext('renderSubChoices()', context);
assert.ok(context.subchoiceSelect.innerHTML.includes('수입'), 'income sub-choice is offered');
['zodiac', 'ddi', 'saju'].forEach(mode => {
  context.selectedMode = mode;
  vm.runInContext('renderSubChoices()', context);
  assert.ok(context.subchoiceSelect.innerHTML.includes('수입'), 'income reading is available in ' + mode + ' mode');
});
console.log('reading guidance UI: live rendering, period changes, safe text, income choice in all modes passed');

// 같은 조건이면 같은 결과, 근거 공개 패널이 붙는다
context.selectedPeriod = 'today';
context.getZodiacByKey = () => ({ name_kr: '양자리', dateRange: '3/21 ~ 4/19', categories: { money: { invest: 'x' } }, trait: { a: ['가1', '가2', '가3', '가4', '가5', '가6'], b: ['나1', '나2', '나3', '나4', '나5', '나6'] }, keywords: ['판단'], advice: '' });
context.selectedCategory = null;
context.selectedSubChoice = null;
const renders = new Set();
for (let i = 0; i < 5; i += 1) { vm.runInContext('showZodiacSummary()', context); renders.add(context.summaryEl.innerHTML); }
assert.strictEqual(renders.size, 1, 'same conditions must give the same reading');
assert.ok(context.summaryEl.innerHTML.includes('이 풀이는 어떻게 나왔나요?'));
