// 화면 흐름 테스트: 실제 index.html과 스크립트를 jsdom에서 실행해 사용자가 누르는 순서대로 확인한다.
// jsdom이 없으면(npm install 전) 건너뛴다.
const assert = require('assert');
const { loadApp, wait, jsdomAvailable } = require('./helpers/load-app.js');

if (!jsdomAvailable()) {
  console.log('SKIP ui-flows: jsdom is not installed (run npm install)');
  process.exit(0);
}

async function drawReading(app, mode, setup) {
  app.click('.mode-btn[data-mode="' + mode + '"]');
  if (setup) setup();
  app.click('#draw-button');
  await wait(60);
  const summary = app.text('#summary');
  app.click('#new-reading-button');
  await wait(30);
  return summary;
}

async function main() {
  // 1. 홈: 오늘의 한 장, 오류 없음
  let app = await loadApp();
  assert.ok(app.text('#daily-card-body').length > 20, 'daily card renders');
  assert.ok(app.text('#daily-card-body').includes('오늘 날짜와 이 기기를 기준으로'), 'daily card explains basis');
  assert.strictEqual(app.visible('#promise-check'), false, 'no promise check on a fresh device');
  assert.strictEqual(app.visible('#question-section'), true, 'question input is visible in tarot mode');

  // 2. 별자리: 같은 조건이면 같은 결과, 도입·마무리·근거 패널
  const zodiac = [];
  for (let i = 0; i < 3; i += 1) zodiac.push(await drawReading(app, 'zodiac'));
  assert.strictEqual(new Set(zodiac).size, 1, 'zodiac reading is stable for the same conditions');
  assert.ok(zodiac[0].includes('주인의 한마디'), 'owner outro');
  assert.ok(zodiac[0].includes('이 풀이는 어떻게 나왔나요?'), 'evidence panel');

  // 2-2. 같은 별자리라도 기기마다 다른 문장을 받을 수 있고, 그 링크를 열면 보낸 사람과 같은 문장이 나온다
  const others = [];
  for (let i = 0; i < 3; i += 1) {
    const other = await loadApp();
    others.push(await drawReading(other, 'zodiac'));
    other.close();
  }
  assert.ok(new Set(others.concat(zodiac[0])).size > 1, 'different devices get different zodiac sentences');
  app.click('.mode-btn[data-mode="zodiac"]');
  app.click('#draw-button');
  await wait(60);
  app.click('#share-link-button');
  await wait(20);
  const zLink = app.window.__copied;
  assert.ok(/[?&#]v=/.test(zLink), 'zodiac link carries the variant');
  const zOriginal = app.text('#summary').replace(/이 실천을 약속할게요/g, '');
  const zViewer = await loadApp({ hash: zLink.slice(zLink.indexOf('#')) });
  assert.strictEqual(zViewer.text('#summary').replace(/이 실천을 약속할게요/g, ''), zOriginal, 'zodiac share link reproduces the same text');
  zViewer.close();
  app.click('#new-reading-button');
  await wait(30);

  // 3. 띠: 생일을 넣으면 설날 이전 출생은 전년도 띠
  app.click('.mode-btn[data-mode="ddi"]');
  app.type('#birth-year-input', '2000');
  app.type('#birth-date-input', '2000-01-20');
  assert.ok(app.text('#ddi-result').includes('1999년 토끼띠'), 'seollal boundary note: ' + app.text('#ddi-result'));
  app.type('#birth-date-input', '2000-03-01');
  assert.ok(app.text('#ddi-result').includes('용띠'), 'after seollal stays 2000 dragon');
  app.click('#draw-button');
  await wait(60);
  assert.ok(app.text('#summary').includes('용띠'));
  app.click('#new-reading-button');
  await wait(30);

  // 4. 사주
  const saju = await drawReading(app, 'saju', function () {
    app.type('#saju-date-input', '1990-05-15');
    app.type('#saju-time-input', '10:30');
  });
  assert.ok(saju.includes('일간'), 'saju summary');
  assert.ok(saju.includes('오행 분포'), 'saju evidence');

  // 5. 궁합 세 가지: 점수 근거가 보인다
  app.click('.mode-btn[data-mode="compatibility"]');
  {
    app.click('.compat-subtype-btn[data-compat-subtype="zodiac"]');
    app.qa('.compat-zodiac2-btn').forEach(function (b) { if (b.dataset.zodiac === 'leo') b.click(); });
    app.click('#draw-button');
    await wait(60);
    assert.strictEqual(app.text('.compat-score'), '94%');
    assert.ok(app.text('#summary').includes('별자리 간격 4칸'));
    app.click('#new-reading-button');
    await wait(30);
  }
  app.click('.mode-btn[data-mode="compatibility"]');
  app.click('.compat-subtype-btn[data-compat-subtype="ddi"]');
  app.type('#compat-ddi-year1-input', '1998');
  app.type('#compat-ddi-year2-input', '1993');
  app.click('#draw-button');
  await wait(60);
  assert.strictEqual(app.text('.compat-score'), '54%', 'tiger x rooster wonjin');
  assert.ok(app.text('#summary').includes('원진 관계'));
  app.click('#new-reading-button');
  await wait(30);
  app.click('.mode-btn[data-mode="compatibility"]');
  app.click('.compat-subtype-btn[data-compat-subtype="saju"]');
  app.type('#compat-saju-date1-input', '2026-08-01');
  app.type('#compat-saju-date2-input', '2026-08-06');
  app.click('#draw-button');
  await wait(60);
  assert.strictEqual(app.text('.compat-score'), '50%', 'saju compat with 합 and 해');
  assert.ok(app.text('#summary').includes('일간 천간합'));
  app.click('#new-reading-button');
  await wait(30);

  // 6. 타로 + 질문: 칩, 인용, 약속, 기록
  app.click('.mode-btn[data-mode="tarot"]');
  app.type('#question-input', '올해 이직해도 될까요?');
  assert.ok(app.text('#question-chip').includes('취업운 · 이직 · 1년'), 'question chip: ' + app.text('#question-chip'));
  app.click('#draw-button');
  await wait(60);
  app.qa('.card').forEach(function (c) { c.click(); });
  await wait(60);
  assert.ok(app.text('.question-quote').includes('올해 이직해도 될까요?'), 'question quote');
  assert.ok(app.text('.question-quote').includes('조건을 함께 읽어'), 'decision frame');
  assert.ok(app.text('#summary').includes('주인의 한마디'));

  // 6-2. 원카드 구성: 키워드 3~4개, 해석 150~200자, 질문에 대한 조언 150~200자 (실천 안내·근거 패널 제외)
  {
    const textLen = function (selector) {
      return app.qa('#summary ' + selector).map(function (el) { return el.textContent; }).join(' ').replace(/\s+/g, ' ').trim().length;
    };
    const keywordCount = app.text('#summary .card-keywords').replace('키워드:', '').split('·').length;
    assert.ok(keywordCount >= 3 && keywordCount <= 4, 'one-card keywords: ' + keywordCount);
    const meaningLen = textLen('.reading-lead, #summary .reading-body');
    assert.ok(meaningLen >= 150 && meaningLen <= 200, 'one-card meaning length ' + meaningLen);
    const adviceLen = textLen('.card-advice, #summary .card-action');
    assert.ok(adviceLen >= 150 && adviceLen <= 200, 'one-card advice length ' + adviceLen);
    assert.ok(app.text('#summary').includes('질문에 대한 조언'), 'one-card advice label');
  }
  app.click('.promise-open');
  assert.ok(app.q('#promise-input').value.length > 5, 'promise prefilled');
  app.type('#promise-input', '지원서 한 곳 작성하기');
  app.click('.promise-save');
  assert.ok(app.text('.promise-done').includes('약속했어요'));
  const history = JSON.parse(app.window.localStorage.getItem('tarot_history'));
  assert.strictEqual(history[0].question, '올해 이직해도 될까요?');
  assert.strictEqual(history[0].promise.text, '지원서 한 곳 작성하기');
  assert.strictEqual(history[0].promise.status, 'pending');

  // 7. 공유 링크: 복사한 주소에 질문이 없고, 그 주소로 열면 같은 결과
  app.click('#share-link-button');
  await wait(20);
  const link = app.window.__copied;
  assert.ok(link && link.includes('#share=tarot'), 'share link copied');
  assert.ok(!decodeURIComponent(link).includes('이직'), 'question must not be in link');
  const originalSummary = app.text('#summary').replace('이 실천을 약속할게요', '').replace(/약속했어요[^.]*\./, '');
  const hash = link.slice(link.indexOf('#'));
  app.close();

  const viewer = await loadApp({ hash: hash });
  assert.ok(viewer.visible('#shared-banner'), 'shared banner');
  assert.strictEqual(viewer.q('#new-reading-button').textContent, '나도 운세 보기');
  assert.strictEqual(viewer.q('.promise-open'), null, 'no promise box in shared view');
  assert.strictEqual(viewer.window.localStorage.getItem('tarot_history'), null, 'shared view must not save history');
  const viewerSummary = viewer.text('#summary');
  const cardLine = viewerSummary.slice(0, 200);
  assert.ok(cardLine.length > 50);
  assert.ok(!viewerSummary.includes('올해 이직해도 될까요?'), 'viewer never sees the question');
  viewer.click('#new-reading-button');
  await wait(30);
  assert.strictEqual(viewer.visible('#shared-banner'), false, 'banner leaves with shared view');
  viewer.close();

  // 8. 잘못된 링크는 무시하고 평소 화면
  const bad = await loadApp({ hash: '#share=tarot&cards=hack.u&p=today&d=2026-10-01&k=x' });
  assert.strictEqual(bad.visible('#shared-banner'), false);
  assert.strictEqual(bad.q('#screen-reading').classList.contains('hidden'), true);
  bad.close();

  // 8-2. 주제를 하나로 정하지 못하면 후보를 눌러 고른다
  const pick = await loadApp();
  pick.type('#question-input', '연애와 돈 둘 다 궁금해요');
  const suggests = pick.qa('.suggest-btn').map(function (b) { return b.textContent; }).sort();
  assert.deepStrictEqual(suggests, ['연애운', '재물운'], 'candidate chips');
  pick.click('.suggest-btn[data-category="love"]');
  assert.strictEqual(pick.q('#category-select .selected').dataset.category, 'love', 'candidate picks the category');
  assert.strictEqual(pick.visible('#question-suggest'), false, 'suggestions disappear after choosing');
  pick.close();

  // 9. 위기 표현: 카드를 뽑지 않고 상담 안내
  const safe = await loadApp();
  safe.type('#question-input', '죽고 싶어요');
  assert.ok(safe.visible('#question-safety'));
  assert.ok(safe.text('#question-safety').includes('109'));
  safe.click('#draw-button');
  await wait(40);
  assert.strictEqual(safe.q('#screen-reading').classList.contains('hidden'), true, 'no draw on crisis wording');
  safe.close();

  // 10. 확인일이 지난 약속은 홈에서 묻는다
  const due = await loadApp({
    storage: {
      tarot_history: JSON.stringify([{
        id: 'abc', date: new Date().toISOString(), mode: 'zodiac', zodiac: 'leo', category: null, period: 'today', cards: [],
        promise: { text: '산책하기', status: 'pending', dueDate: '2020-01-01', answeredAt: null }
      }])
    }
  });
  assert.ok(due.visible('#promise-check'), 'promise check card');
  assert.ok(due.text('#promise-check').includes('산책하기'));
  due.click('#promise-check button[data-status="done"]');
  assert.ok(due.text('#promise-check').includes('해냈군요'));
  assert.strictEqual(JSON.parse(due.window.localStorage.getItem('tarot_history'))[0].promise.status, 'done');
  due.close();

  // 11. 연속 방문 표시
  const day = function (n) { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const streak = await loadApp({ storage: { jeomjip_visits: JSON.stringify([day(2), day(1)]) } });
  assert.ok(streak.text('#daily-card-body').includes('3일 연속 방문'), 'streak of three days');
  streak.close();

  // 모든 흐름에서 스크립트 오류가 없었다
  assert.deepStrictEqual(app.errors, [], 'no script errors in main session');
  console.log('ui-flows ok');
  process.exit(0);
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
