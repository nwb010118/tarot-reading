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

// 공유하기는 (공유 시트가 없는 jsdom에서) 제목 + 결과 링크 + 리딩 글을 복사한다. 링크는 둘째 줄.
function sharedLink(app) {
  const copied = app.window.__copied || '';
  return copied.split('\n')[1] || '';
}

// 모든 결과 맨 아래에는 관련 가이드와 자주 묻는 질문 링크가 있다
function assertResultLinks(app, guideSlug, name) {
  assert.ok(app.q('#summary .result-links a[href="guides/' + guideSlug + '.html"]'), name + ': guide link ' + guideSlug);
  assert.ok(app.q('#summary .result-links a[href="faq.html"]'), name + ': faq link');
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
  app.click('#share-button');
  await wait(20);
  const zLink = sharedLink(app);
  assert.ok(/[?&#]v=/.test(zLink), 'zodiac link carries the variant');
  const zOriginal = app.text('#summary').replace(/이 실천을 약속할게요/g, '');
  const zViewer = await loadApp({ hash: zLink.slice(zLink.indexOf('#')) });
  assert.strictEqual(zViewer.text('#summary').replace(/이 실천을 약속할게요/g, ''), zOriginal, 'zodiac share link reproduces the same text');
  zViewer.close();
  app.click('#new-reading-button');
  await wait(30);

  // 2-3. 별자리 하루 구성: 마음, 사랑, 관계, 선택의 순간, 조언, 마음 키워드 (400~600자)
  app.click('.mode-btn[data-mode="zodiac"]');
  app.click('#draw-button');
  await wait(60);
  ['오늘의 마음', '사랑', '관계', '선택의 순간', '마음을 돌보는 한마디', '오늘의 마음 키워드'].forEach(function (label) {
    assert.ok(app.text('#summary .zodiac-day').includes(label), 'zodiac daily structure: ' + label);
  });
  {
    const dayLen = app.text('#summary .zodiac-day').replace(/이번 리딩의 한마디/g, '').replace(/\s+/g, ' ').trim().length;
    assert.ok(dayLen >= 400 && dayLen <= 600, 'zodiac daily length ' + dayLen);
    assert.ok(!app.text('#summary .zodiac-day').includes('재물운'), 'zodiac day does not repeat the ddi money/work sections');
    assertResultLinks(app, 'what-is-zodiac', 'zodiac');
  }
  app.click('#new-reading-button');
  await wait(30);

  // 2-4. 투자·건강처럼 민감한 주제는 하루 구성에서도 예측 문구 대신 안전 문구로 나온다
  app.click('.mode-btn[data-mode="zodiac"]');
  app.click('#category-select button[data-category="health"]');
  app.click('#draw-button');
  await wait(60);
  assert.ok(app.text('#summary .zodiac-day').includes('예측하지 않습니다'), 'zodiac health safety text');
  {
    const healthLen = app.text('#summary .zodiac-day').replace(/이번 리딩의 한마디/g, '').replace(/\s+/g, ' ').trim().length;
    assert.ok(healthLen >= 400 && healthLen <= 600, 'zodiac health day length ' + healthLen);
  }
  app.click('#new-reading-button');
  await wait(30);
  app.click('.mode-btn[data-mode="ddi"]');
  app.type('#birth-year-input', '1990');
  app.click('#category-select button[data-category="money"]');
  app.click('.subchoice-btn[data-subchoice="invest"]');
  app.click('#draw-button');
  await wait(60);
  assert.ok(app.text('#summary .ddi-day').includes('예측하지 않습니다'), 'ddi invest safety text in the money section');
  assert.ok(app.text('#summary .ddi-day').includes('투자 결정의 근거로 사용하지 마세요'), 'ddi invest warning');
  app.click('#new-reading-button');
  await wait(30);
  app.click('#category-select button[data-category=""]');

  // 2-5. 띠 연도에 소수나 범위 밖 값을 넣으면 오류 없이 안내 문구가 뜬다
  for (const bad of ['1990.5', '1800', '']) {
    app.click('.mode-btn[data-mode="ddi"]');
    app.type('#birth-year-input', bad);
    app.click('#draw-button');
    await wait(20);
    assert.strictEqual(app.errors.length, 0, 'no script error for ddi year ' + JSON.stringify(bad) + ': ' + app.errors.join(' / '));
    assert.ok(app.visible('#ddi-error'), 'ddi error message for ' + JSON.stringify(bad));
    assert.ok(app.q('#screen-reading').classList.contains('hidden'), 'no reading for ddi year ' + JSON.stringify(bad));
  }
  app.type('#birth-year-input', '1990');
  assert.strictEqual(app.visible('#ddi-error'), false, 'ddi error clears after a valid year');

  // 2-6. 3장 타로의 건강·투자 주제는 안전 문구를 화면 위에 한 번만 보여 준다
  {
    const t3 = await loadApp();
    t3.click('.mode-btn[data-mode="tarot"]');
    t3.click('.spread-btn[data-spread="3"]');
    t3.click('#category-select button[data-category="money"]');
    t3.click('.subchoice-btn[data-subchoice="invest"]');
    t3.click('#draw-button');
    await wait(60);
    t3.qa('.card').forEach(function (c) { c.click(); });
    await wait(60);
    assert.strictEqual(t3.qa('#summary .sensitive-note').length, 1, 'one safety notice');
    const all = t3.text('#summary');
    assert.strictEqual(all.split('매매 시점을 예측하지 않습니다').length - 1, 1, 'safety sentence appears once');
    assert.strictEqual(t3.qa('#summary .reading-detail:not(.sensitive-note)').length, 4, 'three positions plus summary');
    t3.close();
  }

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
  ['오늘의 총운', '애정운', '재물운', '직장운', '오늘의 조언', '행운의 숫자', '행운의 색'].forEach(function (label) {
    assert.ok(app.text('#summary .ddi-day').includes(label), 'ddi daily structure: ' + label);
  });
  {
    const dayLen = app.text('#summary .ddi-day').replace(/이번 리딩의 한마디/g, '').replace(/\s+/g, ' ').trim().length;
    assert.ok(dayLen >= 400 && dayLen <= 600, 'ddi daily length ' + dayLen);
  }
  assertResultLinks(app, 'zodiac-animals', 'ddi');
  app.click('#new-reading-button');
  await wait(30);

  // 4. 사주
  const saju = await drawReading(app, 'saju', function () {
    app.type('#saju-date-input', '1990-05-15');
    app.type('#saju-time-input', '10:30');
  });
  assert.ok(saju.includes('일간'), 'saju summary');
  assert.ok(saju.includes('오행 분포'), 'saju evidence');

  // 4-2. 사주 5섹션 아코디언: 총운과 오행 / 재물과 직업 / 연애와 인간관계 / 건강과 주의할 시기 / 개운법 (본문 1,800~2,200자)
  {
    app.click('.mode-btn[data-mode="saju"]');
    app.type('#saju-date-input', '1990-05-15');
    app.type('#saju-time-input', '10:30');
    app.click('#draw-button');
    await wait(60);
    const secs = app.qa('#summary .saju-sec');
    assert.deepStrictEqual(secs.map(function (d) { return d.querySelector('summary').textContent; }),
      ['총운과 오행', '재물과 직업', '연애와 인간관계', '건강과 주의할 시기', '개운법']);
    assert.strictEqual(secs[0].open, true, 'first section is open');
    assert.ok(secs.slice(1).every(function (d) { return !d.open; }), 'other sections start closed');
    const bodyLen = secs.map(function (d) { return d.querySelector('.saju-sec-body').textContent; }).join(' ').replace(/이번 리딩의 한마디/g, '').replace(/\s+/g, ' ').trim().length;
    assert.ok(bodyLen >= 1800 && bodyLen <= 2200, 'saju sections length ' + bodyLen);
    assert.ok(app.text('#summary .saju-sec:nth-of-type(4)').includes('예측하지 않고'), 'saju health disclaimer');
    app.click('.saju-acc-toggle');
    assert.ok(app.qa('#summary .saju-sec').every(function (d) { return d.open; }), 'toggle opens every section');
    app.click('.saju-acc-toggle');
    assert.ok(app.qa('#summary .saju-sec').every(function (d) { return !d.open; }), 'toggle closes every section');
    ['태어난 달의 오행', '십성 묶음 분포', '올해 세운과 일간의 관계'].forEach(function (label) {
      assert.ok(app.text('#summary .evidence').includes(label), 'saju evidence: ' + label);
    });
    assertResultLinks(app, 'what-is-saju', 'saju');
    app.click('#new-reading-button');
    await wait(30);
  }

  // 5. 궁합 세 가지: 점수 없이 네 부분(개요, 성격 상성, 갈등의 원인과 해결, 관계 유지)과 관계 요소 근거가 보인다
  const checkCompat = function (name) {
    assert.strictEqual(app.q('.compat-score'), null, name + ': no score element');
    assert.ok(!/\d\s*%/.test(app.text('#summary .compat-day')), name + ': no percentage');
    ['두 사람의 관계를 한 줄로', '개요', '성격 상성', '갈등의 원인과 해결', '관계를 오래 이어 가려면'].forEach(function (label) {
      assert.ok(app.text('#summary .compat-day').includes(label), name + ' structure: ' + label);
    });
    const len = app.text('#summary .compat-day').replace(/\s+/g, ' ').trim().length;
    assert.ok(len >= 1200 && len <= 1500, name + ' body length ' + len);
    assert.ok(app.text('#summary').includes('점수나 순위를 매기지 않고'), name + ': evidence says no score');
    assertResultLinks(app, 'compatibility-guide', name);
  };
  app.click('.mode-btn[data-mode="compatibility"]');
  {
    app.click('.compat-subtype-btn[data-compat-subtype="zodiac"]');
    app.qa('.compat-zodiac2-btn').forEach(function (b) { if (b.dataset.zodiac === 'leo') b.click(); });
    app.click('#draw-button');
    await wait(60);
    checkCompat('zodiac compat');
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
  checkCompat('ddi compat');
  assert.ok(app.text('#summary').includes('원진 관계'));
  app.click('#new-reading-button');
  await wait(30);
  app.click('.mode-btn[data-mode="compatibility"]');
  app.click('.compat-subtype-btn[data-compat-subtype="saju"]');
  app.type('#compat-saju-date1-input', '2026-08-01');
  app.type('#compat-saju-date2-input', '2026-08-06');
  app.click('#draw-button');
  await wait(60);
  checkCompat('saju compat');
  assert.ok(app.text('#summary').includes('일간 천간합'));
  assert.ok(app.text('#summary').includes('일지 해'));
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
    assertResultLinks(app, 'one-card-reading', 'one-card');
    assert.ok(app.qa('#summary .result-links a').some(function (a) { return a.getAttribute('href').indexOf('tarot/') === 0; }), 'one-card meaning link');
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
  app.click('#share-button');
  await wait(20);
  const link = sharedLink(app);
  assert.ok(link && link.includes('#share=tarot'), 'share link copied');
  assert.ok(app.window.__copied.includes(app.text('#summary .reading-lead')), 'shared text carries the reading');
  assert.ok(!app.window.__copied.includes('나도 운세 보'), 'no promo line in shared text');
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

  // 12. 3카드: 과거/현재/미래 위치별 본문(약 200~250자)과 하나로 잇는 종합
  const three = await loadApp();
  three.click('.mode-btn[data-mode="tarot"]');
  three.click('.spread-btn[data-spread="3"]');
  three.click('#category-select button[data-category="career"]');
  three.click('#draw-button');
  await wait(60);
  three.qa('.card').forEach(function (c) { c.click(); });
  await wait(60);
  {
    const blocks = three.qa('#summary .reading-detail');
    assert.strictEqual(blocks.length, 4, 'three positions plus summary');
    ['과거', '현재', '미래'].forEach(function (label, i) {
      assert.ok(blocks[i].querySelector('h4').textContent.startsWith(label + ' · '), 'position heading ' + label);
      const n = blocks[i].querySelector('.reading-body').textContent.replace(/\s+/g, ' ').trim().length;
      assert.ok(n >= 185 && n <= 265, label + ' body length ' + n);
    });
    assert.ok(blocks[3].querySelector('h4').textContent.includes('하나로'), 'summary heading');
    assert.ok(blocks[3].querySelector('.reading-lead').textContent.length > 20, 'summary story line');
    assert.ok(blocks[3].querySelector('.card-action'), 'summary action');
    assertResultLinks(three, 'three-card-spread', 'three-card');
    assert.strictEqual(three.qa('#summary .result-links a').filter(function (a) { return a.getAttribute('href').indexOf('tarot/') === 0; }).length, 3, 'three card meaning links');
  }
  assert.deepStrictEqual(three.errors, [], 'no script errors in three-card session');
  three.close();

  // 뒤로 가기: 결과 → 입력 화면 → 운세 선택 순서로 한 단계씩 돌아가고, 고른 별자리는 유지된다
  const nav = await loadApp();
  nav.click('.mode-btn[data-mode="zodiac"]');
  nav.click('.zodiac-btn[data-zodiac="cancer"]');
  nav.click('#draw-button');
  await wait(60);
  assert.ok(nav.text('#summary h3').startsWith('게자리'), 'cancer reading');
  nav.window.history.back();
  await wait(60);
  assert.strictEqual(nav.visible('#screen-reading'), false, 'back hides the result');
  assert.strictEqual(nav.q('#flow-details').hidden, false, 'back returns to the input step');
  assert.ok(nav.q('.zodiac-btn[data-zodiac="cancer"]').classList.contains('selected'), 'selection kept');
  nav.window.history.forward();
  await wait(60);
  assert.strictEqual(nav.visible('#screen-reading'), true, 'forward shows the same result again');
  nav.window.history.back();
  await wait(60);
  nav.window.history.back();
  await wait(60);
  assert.strictEqual(nav.q('#flow-choice').hidden, false, 'second back returns to the mode choice');
  nav.click('.mode-btn[data-mode="zodiac"]');
  nav.click('#draw-button');
  await wait(60);
  nav.click('#new-reading-button');
  await wait(60);
  assert.strictEqual(nav.window.history.state, null, 'new reading rewinds the pushed screens');
  assert.strictEqual(nav.q('#flow-choice').hidden, false, 'new reading shows the mode choice');
  assert.deepStrictEqual(nav.errors, [], 'no script errors in back navigation');
  nav.close();

  // 모든 흐름에서 스크립트 오류가 없었다
  assert.deepStrictEqual(app.errors, [], 'no script errors in main session');
  console.log('ui-flows ok');
  process.exit(0);
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
