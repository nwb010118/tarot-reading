const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const guidance = require('../data/reading-guidance.js');
const { CATEGORY_SUBCHOICES, CATEGORY_LABELS } = require('../data/category-labels.js');
const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
function extract(name) {
  const start = source.indexOf('  function ' + name + '(');
  const end = source.indexOf('\n  }', start) + 4;
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
}
const context = Object.assign({}, guidance, {
  selectedCategory: 'money', selectedSubChoice: 'invest', selectedPeriod: 'year',
  selectedMode: 'tarot', CATEGORY_SUBCHOICES, CATEGORY_LABELS,
  SUBCHOICE_ENABLED_MODES: new Set(['tarot', 'saju', 'ddi', 'zodiac']),
  subchoiceSelect: { innerHTML: '', classList: { add() {}, toggle() {} }, querySelectorAll() { return []; } },
  escapeHtml: text => String(text).replace(/</g, '&lt;'),
  getZodiacByKey: () => ({ name_kr: '양자리', categories: { money: { invest: '수익을 확신하는 원래 문장' } }, keywords: ['판단'], advice: '' }),
  selectedZodiac: 'aries', renderKeywordsAdviceHtml: () => '',
  summaryEl: { innerHTML: '', classList: { remove() {} } },
  newReadingButton: { classList: { remove() {} } }, shareButton: { classList: { remove() {} } }
});
vm.createContext(context);
['pickRandom', 'resolveMeaningText', 'resolveSubchoiceValue', 'resolveCategoryMeaning', 'renderReadingMeaning', 'renderPracticePlan', 'showZodiacSummary', 'renderSubChoices'].forEach(name => vm.runInContext(extract(name), context));
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
