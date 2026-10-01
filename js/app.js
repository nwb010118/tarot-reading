(function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getStorage() {
    try {
      localStorage.setItem('__tarot_probe__', '1');
      localStorage.removeItem('__tarot_probe__');
      return localStorage;
    } catch (e) {
      return null;
    }
  }

  // CATEGORY_LABELS / CATEGORY_SUBCHOICES는 data/category-labels.js(이 스크립트보다 먼저 로드됨)의 전역 선언을 그대로 사용한다.

  const SUBCHOICE_ENABLED_MODES = new Set(['tarot', 'saju', 'zodiac', 'ddi']);

  const PERIOD_LABELS = {
    today: '오늘', week: '이번 주', month: '이번 달', month3: '3개월', month6: '6개월', year: '1년'
  };

  const ZODIAC_LABELS = {};
  getZodiacList().forEach(function (z) { ZODIAC_LABELS[z.key] = z.name_kr; });

  const COMPAT_SUBTYPE_LABELS = { zodiac: '별자리 궁합', ddi: '띠 궁합', saju: '사주 궁합' };

  const MODE_BUTTON_LABELS = { tarot: '카드 뽑기', zodiac: '운세 보기', ddi: '운세 보기', saju: '운세 보기', compatibility: '궁합 보기' };

  const storage = getStorage();
  const deck = getFullDeck();
  let activeRng = Math.random;
  let currentEntryId = null;
  let shareState = null;
  let sharedView = false;
  let readingDateOverride = null;
  let currentTarotSeed = null;
  let variantOverride = null;
  let currentQuestion = '';
  let questionIntent = null;
  let lastAppliedIntent = '';
  let selectedSpread = 1;
  let selectedCategory = null;
  let selectedPeriod = 'today';
  let selectedMode = 'tarot';
  let selectedSubChoice = null;
  let selectedZodiac = 'aries';
  let selectedBirthYear = null;
  let flippedCount = 0;
  let historySaved = false;
  let selectedCalendarType = 'solar';
  let selectedIntercalation = false;
  let selectedGender = 'male';
  let selectedTimeUnknown = false;
  let selectedCompatSubtype = 'zodiac';
  let selectedCompatZodiac1 = 'aries';
  let selectedCompatZodiac2 = 'aries';
  let selectedCompatCalendarType = 'solar';

  const screenStart = document.getElementById('screen-start');
  const screenReading = document.getElementById('screen-reading');
  const modeButtons = document.querySelectorAll('#mode-select .mode-btn');
  const zodiacSelect = document.getElementById('zodiac-select');
  const zodiacButtons = document.querySelectorAll('#zodiac-select .zodiac-btn');
  const zodiacResultEl = document.getElementById('zodiac-result');
  const ddiSelect = document.getElementById('ddi-select');
  const birthYearInput = document.getElementById('birth-year-input');
  const ddiResultEl = document.getElementById('ddi-result');
  const ddiErrorEl = document.getElementById('ddi-error');
  const birthDateInput = document.getElementById('birth-date-input');
  const compatDdiDate1Input = document.getElementById('compat-ddi-date1-input');
  const compatDdiDate2Input = document.getElementById('compat-ddi-date2-input');
  let selectedDdiNote = '';
  const sajuSelect = document.getElementById('saju-select');
  const calendarTypeButtons = document.querySelectorAll('#calendar-type-select .calendar-type-btn');
  const intercalationSelect = document.getElementById('intercalation-select');
  const intercalationCheckbox = document.getElementById('intercalation-checkbox');
  const sajuDateSolarGroup = document.getElementById('saju-date-solar-group');
  const sajuDateLunarGroup = document.getElementById('saju-date-lunar-group');
  const sajuDateInput = document.getElementById('saju-date-input');
  const sajuLunarDateInput = document.getElementById('saju-lunar-date-input');
  const sajuTimeInput = document.getElementById('saju-time-input');
  const timeUnknownCheckbox = document.getElementById('time-unknown-checkbox');
  const genderButtons = document.querySelectorAll('#gender-select .gender-btn');
  const sajuErrorEl = document.getElementById('saju-error');
  const compatibilitySelect = document.getElementById('compatibility-select');
  const categorySection = document.getElementById('category-section');
  const periodSection = document.getElementById('period-section');
  const compatSubtypeButtons = document.querySelectorAll('#compat-subtype-select .compat-subtype-btn');
  const compatZodiacGroup = document.getElementById('compat-zodiac-group');
  const compatZodiac1Buttons = document.querySelectorAll('.compat-zodiac1-btn');
  const compatZodiac2Buttons = document.querySelectorAll('.compat-zodiac2-btn');
  const compatDdiGroup = document.getElementById('compat-ddi-group');
  const compatDdiYear1Input = document.getElementById('compat-ddi-year1-input');
  const compatDdiYear2Input = document.getElementById('compat-ddi-year2-input');
  const compatSajuGroup = document.getElementById('compat-saju-group');
  const compatCalendarTypeButtons = document.querySelectorAll('#compat-calendar-type-select .compat-calendar-type-btn');
  const compatSajuDate1SolarGroup = document.getElementById('compat-saju-date1-solar-group');
  const compatSajuDate1LunarGroup = document.getElementById('compat-saju-date1-lunar-group');
  const compatSajuDate2SolarGroup = document.getElementById('compat-saju-date2-solar-group');
  const compatSajuDate2LunarGroup = document.getElementById('compat-saju-date2-lunar-group');
  const compatSajuDate1Input = document.getElementById('compat-saju-date1-input');
  const compatSajuLunarDate1Input = document.getElementById('compat-saju-lunar-date1-input');
  const compatSajuDate2Input = document.getElementById('compat-saju-date2-input');
  const compatSajuLunarDate2Input = document.getElementById('compat-saju-lunar-date2-input');
  const compatIntercalation1Checkbox = document.getElementById('compat-intercalation1-checkbox');
  const compatIntercalation2Checkbox = document.getElementById('compat-intercalation2-checkbox');
  const compatErrorEl = document.getElementById('compat-error');
  const categoryButtons = document.querySelectorAll('#category-select .category-btn');
  const periodButtons = document.querySelectorAll('#period-select .category-btn');
  const spreadSelect = document.getElementById('spread-select');
  const subchoiceSelect = document.getElementById('subchoice-select');
  const spreadButtons = document.querySelectorAll('.spread-btn');
  const drawButton = document.getElementById('draw-button');
  const cardsContainer = document.getElementById('cards-container');
  const summaryEl = document.getElementById('summary');
  const newReadingButton = document.getElementById('new-reading-button');
  const shareButton = document.getElementById('share-button');
  const shareImageButton = document.getElementById('share-image-button');
  const shareLinkButton = document.getElementById('share-link-button');
  const sharedBanner = document.getElementById('shared-banner');
  const questionSection = document.getElementById('question-section');
  const questionInput = document.getElementById('question-input');
  const questionChip = document.getElementById('question-chip');
  const questionSafety = document.getElementById('question-safety');
  const questionSuggest = document.getElementById('question-suggest');
  const historyOpenButton = document.getElementById('history-open-button');
  const historyModal = document.getElementById('history-modal');
  const historyList = document.getElementById('history-list');
  const historyCloseButton = document.getElementById('history-close-button');
  const clearHistoryButton = document.getElementById('clear-history-button');

  modeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      modeButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedMode = btn.dataset.mode;
      zodiacSelect.classList.toggle('hidden', selectedMode !== 'zodiac');
      ddiSelect.classList.toggle('hidden', selectedMode !== 'ddi');
      sajuSelect.classList.toggle('hidden', selectedMode !== 'saju');
      compatibilitySelect.classList.toggle('hidden', selectedMode !== 'compatibility');
      spreadSelect.classList.toggle('hidden', selectedMode !== 'tarot');
      questionSection.classList.toggle('hidden', selectedMode !== 'tarot');
      subchoiceSelect.classList.toggle('hidden', !SUBCHOICE_ENABLED_MODES.has(selectedMode) || !CATEGORY_SUBCHOICES[selectedCategory]);
      categorySection.classList.toggle('hidden', selectedMode === 'compatibility');
      periodSection.classList.toggle('hidden', selectedMode === 'compatibility');
      drawButton.textContent = MODE_BUTTON_LABELS[selectedMode];
    });
  });

  function updateZodiacResult() {
    const zodiac = getZodiacByKey(selectedZodiac);
    zodiacResultEl.textContent = zodiac.name_kr + ' (' + zodiac.dateRange + ')';
  }

  zodiacButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      zodiacButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedZodiac = btn.dataset.zodiac;
      updateZodiacResult();
    });
  });

  updateZodiacResult();

  // 연도 입력과 (선택) 생일을 합쳐 설날 기준 띠 연도를 구한다. 생일 연도가 있으면 연도 칸에 맞춘다.
  function resolveDdiYear(yearInput, dateInput, personText) {
    let year = Number(yearInput.value);
    let month = null;
    let day = null;
    if (dateInput.value) {
      const parts = dateInput.value.split('-').map(Number);
      if (parts[0] !== year) {
        year = parts[0];
        yearInput.value = String(year);
      }
      month = parts[1];
      day = parts[2];
    }
    // 소수(1990.5)나 범위 밖 연도는 띠를 정할 수 없다
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
    const effective = getEffectiveDdiYear(year, month, day, lunarToSolar);
    const note = effective.adjusted
      ? personText + year + '년 ' + month + '월 ' + day + '일생은 설날(' + effective.seollal.month + '월 ' + effective.seollal.day + '일) 이전이라 ' + effective.year + '년 ' + getDdiByYear(effective.year).name_kr + '로 계산했어요.'
      : (month && effective.seollal ? personText + month + '월 ' + day + '일생은 설날(' + effective.seollal.month + '월 ' + effective.seollal.day + '일) 이후라 출생연도 그대로 계산했어요.' : '');
    return { year: effective.year, note: note };
  }

  function updateDdiResult() {
    const resolved = resolveDdiYear(birthYearInput, birthDateInput, '');
    ddiErrorEl.classList.add('hidden');
    if (!resolved) {
      selectedBirthYear = null;
      selectedDdiNote = '';
      ddiResultEl.classList.add('hidden');
      return;
    }
    selectedBirthYear = resolved.year;
    selectedDdiNote = resolved.note;
    const ddi = getDdiByYear(resolved.year);
    ddiResultEl.textContent = resolved.note || (resolved.year + '년생 → ' + ddi.name_kr);
    if (resolved.note && birthDateInput.value && resolved.note.indexOf('이후') !== -1) ddiResultEl.textContent = resolved.year + '년생 → ' + ddi.name_kr;
    ddiResultEl.classList.remove('hidden');
  }

  birthYearInput.addEventListener('input', updateDdiResult);
  birthDateInput.addEventListener('input', updateDdiResult);

  calendarTypeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      calendarTypeButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedCalendarType = btn.dataset.calendarType;
      intercalationSelect.classList.toggle('hidden', selectedCalendarType !== 'lunar');
      sajuDateSolarGroup.classList.toggle('hidden', selectedCalendarType === 'lunar');
      sajuDateLunarGroup.classList.toggle('hidden', selectedCalendarType !== 'lunar');
    });
  });

  intercalationCheckbox.addEventListener('change', function () {
    selectedIntercalation = intercalationCheckbox.checked;
  });

  timeUnknownCheckbox.addEventListener('change', function () {
    selectedTimeUnknown = timeUnknownCheckbox.checked;
    sajuTimeInput.disabled = selectedTimeUnknown;
  });

  genderButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      genderButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedGender = btn.dataset.gender;
    });
  });

  compatSubtypeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      compatSubtypeButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedCompatSubtype = btn.dataset.compatSubtype;
      compatZodiacGroup.classList.toggle('hidden', selectedCompatSubtype !== 'zodiac');
      compatDdiGroup.classList.toggle('hidden', selectedCompatSubtype !== 'ddi');
      compatSajuGroup.classList.toggle('hidden', selectedCompatSubtype !== 'saju');
      compatErrorEl.classList.add('hidden');
    });
  });

  compatZodiac1Buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      compatZodiac1Buttons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedCompatZodiac1 = btn.dataset.zodiac;
    });
  });

  compatZodiac2Buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      compatZodiac2Buttons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedCompatZodiac2 = btn.dataset.zodiac;
    });
  });

  compatCalendarTypeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      compatCalendarTypeButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedCompatCalendarType = btn.dataset.calendarType;
      compatSajuDate1SolarGroup.classList.toggle('hidden', selectedCompatCalendarType === 'lunar');
      compatSajuDate1LunarGroup.classList.toggle('hidden', selectedCompatCalendarType !== 'lunar');
      compatSajuDate2SolarGroup.classList.toggle('hidden', selectedCompatCalendarType === 'lunar');
      compatSajuDate2LunarGroup.classList.toggle('hidden', selectedCompatCalendarType !== 'lunar');
    });
  });

  spreadButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      spreadButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedSpread = Number(btn.dataset.spread);
    });
  });

  function renderSubChoices() {
    const options = CATEGORY_SUBCHOICES[selectedCategory];
    if (!options) {
      subchoiceSelect.classList.add('hidden');
      subchoiceSelect.innerHTML = '';
      selectedSubChoice = null;
      return;
    }
    selectedSubChoice = options[0].key;
    subchoiceSelect.innerHTML = options.map(function (opt, idx) {
      return '<button type="button" class="category-btn subchoice-btn' + (idx === 0 ? ' selected' : '') + '" data-subchoice="' + opt.key + '">' + opt.label + '</button>';
    }).join('');
    subchoiceSelect.classList.toggle('hidden', !SUBCHOICE_ENABLED_MODES.has(selectedMode));
    subchoiceSelect.querySelectorAll('.subchoice-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        subchoiceSelect.querySelectorAll('.subchoice-btn').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        selectedSubChoice = btn.dataset.subchoice;
      });
    });
  }

  // 질문을 읽어 주제·하위선택·실천 기간을 기존 버튼에 반영한다 (같은 해석이면 사용자가 고친 선택을 덮어쓰지 않는다)
  function hideQuestionSuggest() {
    questionSuggest.classList.add('hidden');
    questionSuggest.innerHTML = '';
  }

  function applyQuestionIntent() {
    const text = questionInput.value.trim();
    questionIntent = classifyQuestion(text);
    questionSafety.textContent = questionIntent.safety ? QUESTION_SAFETY_MESSAGE : '';
    questionSafety.classList.toggle('hidden', !questionIntent.safety);
    if (!text || questionIntent.safety) {
      questionChip.classList.add('hidden');
      hideQuestionSuggest();
      lastAppliedIntent = '';
      return;
    }
    const signature = [questionIntent.category, questionIntent.subchoice, questionIntent.period, questionIntent.candidates.join(',')].join('|');
    if (signature === lastAppliedIntent) return;
    lastAppliedIntent = signature;
    hideQuestionSuggest();
    const parts = [];
    if (questionIntent.category) {
      const catBtn = Array.prototype.find.call(categoryButtons, function (b) { return b.dataset.category === questionIntent.category; });
      if (catBtn) {
        catBtn.click();
        parts.push(CATEGORY_LABELS[questionIntent.category]);
      }
      if (questionIntent.subchoice) {
        const subBtn = Array.prototype.find.call(subchoiceSelect.querySelectorAll('.subchoice-btn'), function (b) { return b.dataset.subchoice === questionIntent.subchoice; });
        if (subBtn) {
          subBtn.click();
          parts.push(subBtn.textContent);
        }
      }
      if (questionIntent.period) {
        const perBtn = Array.prototype.find.call(periodButtons, function (b) { return b.dataset.period === questionIntent.period && !b.disabled; });
        if (perBtn) {
          perBtn.click();
          parts.push(PERIOD_LABELS[questionIntent.period]);
        }
      }
    }
    questionChip.textContent = parts.length
      ? '이렇게 읽을게요: ' + parts.join(' · ') + ' (아래에서 바꿀 수 있어요)'
      : (questionIntent.candidates.length ? '주제를 하나로 정하지 못했어요. 가까운 주제를 골라 주세요.' : '주제를 찾지 못했어요. 아래에서 직접 골라 주세요.');
    questionChip.classList.remove('hidden');
    if (!questionIntent.category && questionIntent.candidates.length) {
      questionSuggest.innerHTML = '<span class="suggest-label">혹시 이런 주제인가요?</span>' + questionIntent.candidates.map(function (key) {
        return '<button type="button" class="suggest-btn" data-category="' + key + '">' + escapeHtml(CATEGORY_LABELS[key]) + '</button>';
      }).join('');
      questionSuggest.classList.remove('hidden');
      questionSuggest.querySelectorAll('.suggest-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const catBtn = Array.prototype.find.call(categoryButtons, function (b) { return b.dataset.category === btn.dataset.category; });
          if (catBtn) catBtn.click();
          questionChip.textContent = '이렇게 읽을게요: ' + CATEGORY_LABELS[btn.dataset.category] + ' (아래에서 바꿀 수 있어요)';
          hideQuestionSuggest();
        });
      });
    }
  }

  questionInput.addEventListener('input', applyQuestionIntent);

  function renderQuestionQuote() {
    if (!currentQuestion) return '';
    const frame = QUESTION_FRAME_LINES[(questionIntent && questionIntent.form) || 'general'];
    return '<blockquote class="question-quote">“' + escapeHtml(currentQuestion) + '”<footer>' + escapeHtml(frame) + '</footer></blockquote>';
  }

  // 가만점방 주인의 도입·마무리 한 줄. 같은 조건이면 같은 문구가 나오도록 시드로 고른다.
  // 결과 맨 아래의 "더 알아보기": 이 풀이와 관련된 가이드와 자주 묻는 질문, 타로는 뽑힌 카드의 의미 페이지
  const RESULT_GUIDE_LINKS = {
    tarot1: [['one-card-reading', '원 카드 리딩 활용법'], ['upright-and-reversed', '정방향과 역방향 읽는 법']],
    tarot3: [['three-card-spread', '3장 스프레드 읽는 법'], ['upright-and-reversed', '정방향과 역방향 읽는 법']],
    zodiac: [['what-is-zodiac', '12별자리 기본 가이드'], ['zodiac-vs-ddi', '별자리와 띠, 무엇이 어떻게 다른가']],
    ddi: [['zodiac-animals', '12띠 기본 가이드'], ['zodiac-vs-ddi', '별자리와 띠, 무엇이 어떻게 다른가']],
    saju: [['what-is-saju', '사주란 무엇인가'], ['saju-sipseong-guide', '십성 열 가지를 규칙으로 이해하기'], ['saju-daeun-seun-wolun', '대운·세운·월운은 무엇을 보여주는 표일까']],
    compat: [['compatibility-guide', '궁합은 어떻게 보는가'], ['compatibility-type-guide', '가만점방 궁합은 어떻게 풀이되는가']]
  };

  function renderResultLinks(kind, cards) {
    const items = [];
    (cards || []).forEach(function (item) {
      const slug = (typeof TAROT_SLUGS !== 'undefined') ? TAROT_SLUGS[item.card.cardId] : null;
      if (slug) items.push('<li><a href="tarot/' + slug + '.html">' + escapeHtml(item.card.name) + ' 카드 의미</a></li>');
    });
    (RESULT_GUIDE_LINKS[kind] || []).forEach(function (g) {
      items.push('<li><a href="guides/' + g[0] + '.html">' + escapeHtml(g[1]) + '</a></li>');
    });
    items.push('<li><a href="faq.html">자주 묻는 질문</a></li>');
    return '<nav class="result-links" aria-label="더 알아보기"><p class="result-links-title">더 알아보기</p><ul>' + items.join('') + '</ul></nav>';
  }

  function renderOwnerIntro(kind, key) {
    return '<p class="owner-intro">' + escapeHtml(getVoiceLine(kind, createRng(['voice-intro', kind, key]))) + '</p>';
  }

  function renderOwnerOutro(key) {
    const kind = getOutroKind(selectedCategory, selectedSubChoice);
    return '<aside class="owner-outro"><h4>주인의 한마디</h4><p>' +
      escapeHtml(getVoiceLine(kind, createRng(['voice-outro', kind, key]))) + '</p></aside>';
  }

  function readingDay() {
    return readingDateOverride || todayKey();
  }

  // 같은 별자리·띠여도 기기마다 다른 문장이 고르도록 하는 짧은 값. 공유 링크는 보낸 사람의 값을 그대로 쓴다(없으면 예전 링크).
  function readingVariant() {
    if (variantOverride !== null) return variantOverride;
    return (hashString(getDeviceId(storage)) % 1679616).toString(36);
  }

  function variantParts() {
    const v = readingVariant();
    return v ? [v] : [];
  }

  function linkSubChoice() {
    return (selectedCategory && CATEGORY_SUBCHOICES[selectedCategory]) ? selectedSubChoice : null;
  }

  function firstLeadText() {
    const el = summaryEl.querySelector('.reading-lead');
    return el ? el.textContent.trim() : '';
  }

  // 이미지 카드와 링크에 쓸 현재 결과를 기억한다 (params가 null이면 링크 없이 이미지만 공유)
  function setShareState(title, images, params) {
    shareState = { title: title, lead: firstLeadText(), images: images, params: params };
    shareImageButton.classList.remove('hidden');
    shareLinkButton.classList.toggle('hidden', !params);
  }

  function resolveSubchoiceValue(category, value, selectedSubChoice) {
    return (CATEGORY_SUBCHOICES[category] && typeof value === 'object')
      ? value[selectedSubChoice]
      : value;
  }

  function pickRandom(arr) {
    return arr[Math.floor(activeRng() * arr.length)];
  }

  function resolveMeaningText(value) {
    return (typeof value === 'string') ? value : (pickRandom(value.a) + ' ' + pickRandom(value.b));
  }

  function pickKeywords(keywordsPool, count) {
    count = count || 3;
    if (!keywordsPool || keywordsPool.length <= count) return keywordsPool;
    const shuffled = keywordsPool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(activeRng() * (i + 1));
      const t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
    }
    return shuffled.slice(0, count);
  }

  function pickAdvice(advicePool) {
    return Array.isArray(advicePool) ? pickRandom(advicePool) : advicePool;
  }

  function resolveCategoryMeaning(entity, category, period, selectedSubChoice, withoutTheme) {
    const sensitive = getSensitiveReading(category, selectedSubChoice, withoutTheme ? [] : entity.keywords);
    if (sensitive) return sensitive;
    if (category && entity.categories[category]) {
      const readingText = resolveSubchoiceValue(category, entity.categories[category], selectedSubChoice);
      return resolveMeaningText(readingText);
    }
    return resolveMeaningText(entity.trait);
  }

  const ONECARD_RANGE = { min: 150, max: 200 };

  function combineSentences(listA, listB) {
    const out = [];
    listA.forEach(function (a) { listB.forEach(function (b) { out.push(a + ' ' + b); }); });
    return out;
  }

  // 후보 중 글자 수 범위에 드는 것을 시드로 고른다. 범위에 드는 후보가 없으면 가장 가까운 것을 쓴다.
  // 후보가 문자열이 아니면 getText로 본문을 꺼낸다.
  function pickWithinRange(candidates, range, getText) {
    const r = range || ONECARD_RANGE;
    const textOf = getText || function (t) { return t; };
    const fit = candidates.filter(function (t) { const n = textOf(t).length; return n >= r.min && n <= r.max; });
    if (fit.length) return pickRandom(fit);
    const center = (r.min + r.max) / 2;
    return candidates.slice().sort(function (x, y) { return Math.abs(textOf(x).length - center) - Math.abs(textOf(y).length - center); })[0];
  }

  const THREECARD_POSITION_RANGE = { min: 200, max: 250 };
  const THREECARD_SUMMARY_RANGE = { min: 190, max: 260 };

  // 3카드 위치별 본문: 위치 문장 + 카드 상징 + 주제 문장(주제를 고른 경우)
  function threeCardPositionText(item, posKey, category, sensitiveText) {
    const extra = TAROT_ONECARD[item.card.cardId][item.orientation];
    const base = item.orientation === 'upright' ? item.card.upright : item.card.reversed;
    const frames = THREECARD_FRAMES[posKey];
    const candidates = [];
    // 건강·투자처럼 민감한 주제는 안전 문구를 화면 위에 한 번만 보여 주고(renderThreeCardDetails),
    // 자리별 본문은 주제 문장 대신 카드의 기본 의미로 쓴다. 세 자리에 같은 안전 문구가 반복되지 않게 하려는 것이다.
    const categoryReading = !sensitiveText && category && item.card.categories && item.card.categories[category];
    if (categoryReading) {
      const value = resolveSubchoiceValue(category, categoryReading[item.orientation], selectedSubChoice);
      const texts = (typeof value === 'string') ? [value] : combineSentences(value.a, value.b).concat(value.a, value.b);
      frames.forEach(function (f) {
        base.a.forEach(function (a) {
          texts.forEach(function (t) { candidates.push(f + ' ' + a + ' ' + extra.deepen + ' ' + t); });
        });
      });
    } else {
      frames.forEach(function (f) {
        combineSentences(base.a, base.b).concat(base.a).forEach(function (t) {
          candidates.push(f + ' ' + t + ' ' + extra.deepen);
          item.card.advice[item.orientation].forEach(function (adv) { candidates.push(f + ' ' + t + ' ' + extra.deepen + ' ' + adv); });
        });
      });
    }
    return pickWithinRange(candidates, THREECARD_POSITION_RANGE);
  }

  // 3카드 결과: 위치별 카드 세 장과 하나의 이야기로 잇는 종합
  function renderThreeCardDetails(draw, category) {
    const blocks = draw.map(function (item, index) {
      const pos = THREECARD_POSITIONS[index];
      const sensitive = getSensitiveReading(category, selectedSubChoice, item.card.keywords && item.card.keywords[item.orientation]);
      const text = threeCardPositionText(item, pos.key, category, sensitive);
      const orientationLabel = item.orientation === 'upright' ? '정방향' : '역방향';
      const slug = (typeof TAROT_SLUGS !== 'undefined') ? TAROT_SLUGS[item.card.cardId] : null;
      return '<div class="reading-detail">' +
        '<h4>' + pos.label + ' · ' + item.card.name + ' (' + orientationLabel + ')</h4>' +
        '<p class="card-keywords">키워드: ' + pickKeywords(item.card.keywords[item.orientation], 3).join(' · ') + '</p>' +
        '<p class="reading-body">' + escapeHtml(text) + '</p>' +
        (slug ? '<a class="card-detail-link" href="tarot/' + slug + '.html">이 카드 자세히 보기 →</a>' : '') +
        '</div>';
    });

    const key = draw.map(function (item) { return item.orientation === 'upright' ? 'u' : 'r'; }).join('');
    const words = draw.map(function (item) { return pickKeywords(item.card.keywords[item.orientation], 1)[0]; });
    const stories = THREECARD_STORY.map(function (t) {
      return t.replace('{a}', words[0]).replace('{b}', words[1]).replace('{c}', words[2]);
    });
    const patterns = THREECARD_PATTERN[key];
    const sensitiveAny = draw.some(function (item) {
      return getSensitiveReading(category, selectedSubChoice, item.card.keywords && item.card.keywords[item.orientation]);
    });
    let story;
    let action = '';
    if (sensitiveAny) {
      const reflections = getSensitiveReflections(category, selectedSubChoice);
      const sensitiveCombos = [];
      stories.forEach(function (s) {
        patterns.forEach(function (p) {
          reflections.forEach(function (r) { sensitiveCombos.push({ lead: s, body: p + ' ' + r, text: s + ' ' + p + ' ' + r }); });
        });
      });
      story = pickWithinRange(sensitiveCombos, THREECARD_SUMMARY_RANGE, function (c) { return c.text; });
    } else {
      const actions = draw.map(function (item) { return TAROT_ONECARD[item.card.cardId][item.orientation].action; });
      const combos = [];
      stories.forEach(function (s) {
        patterns.forEach(function (p) {
          actions.forEach(function (a) { combos.push({ lead: s, body: p, action: a, text: s + ' ' + p + ' ' + a }); });
        });
      });
      story = pickWithinRange(combos, THREECARD_SUMMARY_RANGE, function (c) { return c.text; });
      action = story.action;
    }
    const summaryHtml = '<div class="reading-detail">' +
      '<h4>세 장을 하나로 이으면</h4>' +
      '<p class="reading-lead">' + escapeHtml(story.lead) + '</p>' +
      '<p class="reading-body">' + escapeHtml(story.body) + '</p>' +
      (action ? '<p class="reading-lead-label">오늘 해볼 한 걸음</p><p class="card-action">' + escapeHtml(action) + '</p>' : '') +
      '</div>';
    const noticeHtml = sensitiveAny
      ? '<div class="reading-detail sensitive-note"><h4>먼저 알아 두세요</h4><p class="reading-body">' +
        escapeHtml(getSensitiveReading(category, selectedSubChoice, [])) + '</p></div>'
      : '';
    return (noticeHtml ? [noticeHtml] : []).concat(blocks, summaryHtml);
  }

  // 원카드 결과: 키워드, 카드 의미 해석(기본 상징 + 그림 해석), 질문에 대한 조언(주제별 문장 + 구체적 행동)
  function renderOneCardDetail(item, category, sensitiveText) {
    const extra = TAROT_ONECARD[item.card.cardId][item.orientation];
    const base = item.orientation === 'upright' ? item.card.upright : item.card.reversed;
    // 기본 문장 두 개를 모두 쓰면 길이가 넘치는 카드는 첫 문장만 쓰는 후보도 함께 둔다
    const interpretation = pickWithinRange(combineSentences(base.a, base.b).concat(base.a).map(function (t) { return t + ' ' + extra.deepen; }));
    const keywords = pickKeywords(item.card.keywords[item.orientation], 4);

    // 조언은 주제(또는 카드 조언) 문장과 카드별 행동 문장을 두 단락으로 나눠 보여 준다. 길이는 합쳐서 맞춘다.
    let advice;
    let action = '';
    const categoryReading = category && item.card.categories && item.card.categories[category];
    if (sensitiveText) {
      advice = pickWithinRange(getSensitiveReflections(category, selectedSubChoice).map(function (r) { return sensitiveText + ' ' + r; }));
    } else if (categoryReading) {
      const value = resolveSubchoiceValue(category, categoryReading[item.orientation], selectedSubChoice);
      const texts = (typeof value === 'string') ? [value] : combineSentences(value.a, value.b).concat(value.a, value.b);
      advice = pickWithinRange(texts.map(function (t) { return t + ' ' + extra.action; }));
      action = extra.action;
    } else {
      advice = pickWithinRange(item.card.advice[item.orientation].map(function (t) { return t + ' ' + extra.action; }));
      action = extra.action;
    }
    if (action) advice = advice.slice(0, advice.length - action.length - 1);

    const orientationLabel = item.orientation === 'upright' ? '정방향' : '역방향';
    const slug = (typeof TAROT_SLUGS !== 'undefined') ? TAROT_SLUGS[item.card.cardId] : null;
    return '<div class="reading-detail">' +
      '<h4>' + item.card.name + ' (' + orientationLabel + ')</h4>' +
      '<p class="card-keywords">키워드: ' + keywords.join(' · ') + '</p>' +
      renderReadingMeaning(interpretation) +
      '<p class="reading-lead-label">' + (category ? '질문에 대한 조언' : '오늘의 조언') + '</p>' +
      '<p class="card-advice">' + escapeHtml(advice) + '</p>' +
      (action ? '<p class="reading-lead-label">오늘 해볼 한 걸음</p><p class="card-action">' + escapeHtml(action) + '</p>' : '') +
      (slug ? '<a class="card-detail-link" href="tarot/' + slug + '.html">이 카드 자세히 보기 →</a>' : '') +
      '</div>';
  }

  function renderKeywordsAdviceHtml(keywordsList, adviceText) {
    const resolvedKeywords = pickKeywords(keywordsList);
    const resolvedAdvice = pickAdvice(adviceText);
    return (resolvedKeywords && resolvedAdvice)
      ? '<div class="card-extra"><p class="card-keywords">키워드: ' + resolvedKeywords.join(' · ') + '</p><p class="card-advice">조언: ' + resolvedAdvice + '</p></div>'
      : '';
  }

  function updatePeriodLock() {
    const locked = !selectedCategory;
    periodButtons.forEach(function (b) { b.disabled = locked; });
    if (locked) {
      periodButtons.forEach(function (b) { b.classList.remove('selected'); });
      periodButtons[0].classList.add('selected');
      selectedPeriod = 'today';
    }
  }

  categoryButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      categoryButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedCategory = btn.dataset.category || null;
      renderSubChoices();
      updatePeriodLock();
    });
  });

  periodButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      periodButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedPeriod = btn.dataset.period;
    });
  });

  renderSubChoices();
  updatePeriodLock();

  drawButton.addEventListener('click', function () {
    if (selectedMode === 'zodiac') {
      cardsContainer.innerHTML = '';
      screenStart.classList.add('hidden');
      screenReading.classList.remove('hidden');
      showZodiacSummary();
      saveZodiacReading();
      setupPromiseBox();
      return;
    }

    if (selectedMode === 'ddi') {
      if (!selectedBirthYear) {
        ddiErrorEl.textContent = birthYearInput.value
          ? '태어난 연도를 1900~2100년 사이의 네 자리 숫자로 입력해주세요.'
          : '태어난 연도를 입력해주세요.';
        ddiErrorEl.classList.remove('hidden');
        birthYearInput.focus();
        return;
      }
      cardsContainer.innerHTML = '';
      screenStart.classList.add('hidden');
      screenReading.classList.remove('hidden');
      showDdiSummary();
      saveDdiReading();
      setupPromiseBox();
      return;
    }

    if (selectedMode === 'saju') {
      const input = resolveSajuInput();
      if (!input) return;
      const saju = calculateSaju(input);
      cardsContainer.innerHTML = '';
      screenStart.classList.add('hidden');
      screenReading.classList.remove('hidden');
      showSajuSummary(input, saju);
      saveSajuReading(input, saju);
      setupPromiseBox();
      return;
    }

    if (selectedMode === 'compatibility') {
      let label1, label2, tier;
      let saju1, saju2;
      let factors;
      let people;
      let notes = [];
      if (selectedCompatSubtype === 'zodiac') {
        people = [getZodiacByKey(selectedCompatZodiac1), getZodiacByKey(selectedCompatZodiac2)];
        label1 = people[0].name_kr;
        label2 = people[1].name_kr;
        tier = getZodiacCompatibility(selectedCompatZodiac1, selectedCompatZodiac2);
        factors = zodiacFactors(selectedCompatZodiac1, selectedCompatZodiac2);
      } else if (selectedCompatSubtype === 'ddi') {
        const input = resolveCompatDdiInput();
        if (!input) return;
        people = [getDdiByYear(input.year1), getDdiByYear(input.year2)];
        label1 = input.year1 + '년생 ' + people[0].name_kr;
        label2 = input.year2 + '년생 ' + people[1].name_kr;
        tier = getDdiCompatibility(input.year1, input.year2);
        factors = ddiFactors(people[0].key, people[1].key);
        notes = input.notes;
      } else {
        const input = resolveCompatSajuInput();
        if (!input) return;
        const sajuResult = getSajuCompatibility(input.date1, input.date2);
        label1 = sajuResult.ilganName1 + ' 일간';
        label2 = sajuResult.ilganName2 + ' 일간';
        tier = sajuResult.tier;
        saju1 = sajuResult.saju1;
        saju2 = sajuResult.saju2;
        people = [getIlganByIndex(saju1.day.stemIdx), getIlganByIndex(saju2.day.stemIdx)];
        factors = sajuFactors(saju1, saju2);
      }
      const tierInfo = getCompatTierInfo(tier, label1, label2, createRng(['compat-text', selectedCompatSubtype, label1, label2]));
      cardsContainer.innerHTML = '';
      screenStart.classList.add('hidden');
      screenReading.classList.remove('hidden');
      showCompatibilitySummary(label1, label2, tierInfo, saju1, saju2, { tier: tier, factors: factors, people: people, notes: notes, labels: [label1, label2] });
      saveCompatibilityReading(selectedCompatSubtype, label1, label2, tierInfo);
      return;
    }

    currentQuestion = questionInput.value.trim();
    questionIntent = currentQuestion ? classifyQuestion(currentQuestion) : null;
    if (questionIntent && questionIntent.safety) {
      questionSafety.textContent = QUESTION_SAFETY_MESSAGE;
      questionSafety.classList.remove('hidden');
      questionSafety.scrollIntoView({ block: 'center' });
      return;
    }
    activeRng = Math.random;
    currentTarotSeed = Math.random().toString(36).slice(2, 10);
    const currentDraw = drawCards(deck, selectedSpread);
    flippedCount = 0;
    historySaved = false;

    renderCards(currentDraw);

    screenStart.classList.add('hidden');
    screenReading.classList.remove('hidden');
    summaryEl.classList.add('hidden');
    summaryEl.innerHTML = '';
    newReadingButton.classList.add('hidden');
    shareButton.classList.add('hidden');
    shareImageButton.classList.add('hidden');
    shareLinkButton.classList.add('hidden');
  });

  function renderReadingMeaning(meaning) {
    const boundary = meaning.search(/[.!?](?:\s|$)/);
    const lead = boundary < 0 ? meaning : meaning.slice(0, boundary + 1);
    const rest = boundary < 0 ? '' : meaning.slice(boundary + 1).trim();
    return '<p class="reading-lead-label">이번 리딩의 한마디</p>' +
      '<p class="reading-lead">' + escapeHtml(lead) + '</p>' +
      (rest ? '<p class="reading-body">' + escapeHtml(rest) + '</p>' : '');
  }

  function renderEvidence(lines) {
    return '<details class="evidence"><summary>이 풀이는 어떻게 나왔나요?</summary><ul>' +
      lines.map(function (line) { return '<li>' + escapeHtml(line) + '</li>'; }).join('') +
      '</ul></details>';
  }

  function renderPracticePlan() {
    const plan = getPracticePlan(selectedPeriod, selectedCategory);
    return '<aside class="practice-plan"><h4>' + escapeHtml(plan.label) + ' 실천 안내</h4><p>' +
      escapeHtml(plan.focus) + '</p><p>' + escapeHtml(plan.schedule) +
      '</p><p class="editorial-meta">선택한 기간은 실천과 회고를 위한 기간입니다. 사건이 일어날 시점을 예측하지 않습니다. 리딩 문장은 준비된 해석 중에서 고르며, 같은 조건이면 같은 문장이 나오도록 정해져 있습니다.</p></aside>';
  }

  const ZODIAC_CORE_SECTIONS = [
    { category: 'love', label: '사랑' },
    { category: 'relationships', label: '관계' }
  ];

  // 별자리 하루 구성: 오늘의 마음 + 사랑·관계 + 선택의 순간 + (고른 주제가 다르면 그 주제) + 마음 돌봄 조언 + 마음 키워드
  function renderZodiacDay(zodiac) {
    const daily = ZODIAC_DAILY[zodiac.key];
    const overallCandidates = [];
    combineSentences(zodiac.trait.a, zodiac.trait.b).forEach(function (t) { daily.mood.forEach(function (m) { overallCandidates.push(t + ' ' + m); }); });
    // 안전 문구 구간은 고정 문구가 길어 본문 합계가 600자를 넘기 쉬워, 총운과 조언의 범위를 좁힌다
    const tight = !!selectedCategory && !ZODIAC_CORE_SECTIONS.some(function (s) { return s.category === selectedCategory; }) &&
      !!getSensitiveReading(selectedCategory, selectedSubChoice, []);
    const overall = pickWithinRange(overallCandidates, tight ? { min: 140, max: 146 } : DDI_OVERALL_RANGE);

    const sections = ZODIAC_CORE_SECTIONS.map(function (s) { return { label: s.label, text: daySectionText(zodiac, s.category, tight ? { min: 70, max: 76 } : null) }; });
    sections.push({ label: '선택의 순간', text: pickRandom(daily.choice) });
    const isCore = ZODIAC_CORE_SECTIONS.some(function (s) { return s.category === selectedCategory; });
    if (selectedCategory && !isCore) {
      sections.push({ label: CATEGORY_LABELS[selectedCategory], text: resolveCategoryMeaning(zodiac, selectedCategory, selectedPeriod, selectedSubChoice, true) });
    }

    const adviceCandidates = [];
    zodiac.advice.forEach(function (a) { daily.tip.forEach(function (t) { adviceCandidates.push(a + ' ' + t); }); });
    const advice = pickWithinRange(adviceCandidates, tight ? { min: 45, max: 49 } : DDI_ADVICE_RANGE);
    const keywords = pickKeywords(zodiac.keywords, 3);

    return '<div class="reading-detail zodiac-day">' +
      '<h4>오늘의 마음</h4>' + renderReadingMeaning(overall) +
      sections.map(function (s) { return '<h4>' + s.label + '</h4><p class="reading-body">' + escapeHtml(s.text) + '</p>'; }).join('') +
      '<h4>마음을 돌보는 한마디</h4><p class="card-advice">' + escapeHtml(advice) + '</p>' +
      '<p class="card-keywords">오늘의 마음 키워드 ' + keywords.join(' · ') + '</p>' +
      '</div>';
  }

  function showZodiacSummary() {
    activeRng = createRng(['zodiac', selectedZodiac, readingDay()].concat(variantParts(), ['daily']));
    const zodiac = getZodiacByKey(selectedZodiac);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = zodiac.name_kr + ' · ' + (category ? CATEGORY_LABELS[category] : '운세') + ' 리딩';

    const dayHtml = renderZodiacDay(zodiac);

    const evidenceHtml = renderEvidence([
      '선택한 별자리: ' + zodiac.name_kr + ' (' + zodiac.dateRange + ')',
      '문장은 별자리, 날짜, 이 기기를 기준으로 골라요. 같은 조건이면 오늘은 같은 문장이고, 같은 별자리여도 기기마다 다른 문장을 받을 수 있어요.',
      '천체의 실제 위치를 계산한 예측이 아니라, 별자리의 전통적인 성향을 바탕으로 준비된 문장입니다.'
    ]);

    const voiceKey = [selectedZodiac, readingDay(), selectedCategory, selectedSubChoice, selectedPeriod].join('|');
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' + renderOwnerIntro('zodiac', voiceKey) +
      dayHtml + renderPracticePlan() + renderOwnerOutro(voiceKey) + evidenceHtml + renderResultLinks('zodiac');
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
    setShareState(heading, [], { kind: 'zodiac', z: selectedZodiac, c: selectedCategory, b: linkSubChoice(), p: selectedPeriod, d: readingDay(), v: readingVariant() });
    shareButton.classList.remove('hidden');
  }

  function saveZodiacReading() {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'zodiac',
      zodiac: selectedZodiac,
      category: selectedCategory,
      period: selectedPeriod,
      subChoice: selectedSubChoice,
      cards: []
    };
    currentEntryId = saveReading(storage, entry)[0].id;
  }

  const DDI_OVERALL_RANGE = { min: 140, max: 175 };
  const DDI_SECTION_RANGE = { min: 70, max: 100 };
  const DDI_ADVICE_RANGE = { min: 45, max: 70 };
  const DDI_CORE_SECTIONS = [
    { category: 'love', label: '애정운' },
    { category: 'money', label: '재물운' },
    { category: 'workplace', label: '직장운' }
  ];

  // 하루 구성의 한 섹션 문장: 고른 주제면 선택한 하위선택을, 아니면 첫 하위선택을 쓴다. 민감 주제는 안전 문구로 대신한다.
  function daySectionText(entity, category, range) {
    if (category === selectedCategory) {
      const sensitive = getSensitiveReading(category, selectedSubChoice, []);
      if (sensitive) return sensitive;
    }
    const sub = (category === selectedCategory) ? selectedSubChoice : (CATEGORY_SUBCHOICES[category] ? CATEGORY_SUBCHOICES[category][0].key : null);
    const value = resolveSubchoiceValue(category, entity.categories[category], sub);
    return (typeof value === 'string') ? value : pickWithinRange(combineSentences(value.a, value.b), range || DDI_SECTION_RANGE);
  }

  // 띠운세 하루 구성: 총운 + 애정·재물·직장 + (고른 주제가 다르면 그 주제) + 조언 + 행운의 숫자·색
  function renderDdiDay(ddi) {
    const daily = DDI_DAILY[ddi.key];
    const traitCombos = combineSentences(ddi.trait.a, ddi.trait.b);
    const overallCandidates = [];
    traitCombos.forEach(function (t) { daily.daily.forEach(function (d) { overallCandidates.push(t + ' ' + d); }); });
    const overall = pickWithinRange(overallCandidates, DDI_OVERALL_RANGE);

    const sections = DDI_CORE_SECTIONS.map(function (s) { return { label: s.label, text: daySectionText(ddi, s.category) }; });
    const isCore = DDI_CORE_SECTIONS.some(function (s) { return s.category === selectedCategory; });
    if (selectedCategory && !isCore) {
      sections.push({ label: CATEGORY_LABELS[selectedCategory], text: resolveCategoryMeaning(ddi, selectedCategory, selectedPeriod, selectedSubChoice, true) });
    }

    const adviceCandidates = [];
    ddi.advice.forEach(function (a) { daily.tip.forEach(function (t) { adviceCandidates.push(a + ' ' + t); }); });
    const advice = pickWithinRange(adviceCandidates, DDI_ADVICE_RANGE);

    const shuffled = daily.numbers.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(activeRng() * (i + 1));
      const t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
    }
    const numbers = shuffled.slice(0, 2).sort(function (x, y) { return x - y; });
    const color = pickRandom(daily.colors);

    return '<div class="reading-detail ddi-day">' +
      '<h4>오늘의 총운</h4>' + renderReadingMeaning(overall) +
      sections.map(function (s) { return '<h4>' + s.label + '</h4><p class="reading-body">' + escapeHtml(s.text) + '</p>'; }).join('') +
      '<h4>오늘의 조언</h4><p class="card-advice">' + escapeHtml(advice) + '</p>' +
      '<p class="card-keywords">행운의 숫자 ' + numbers.join(', ') + ' · 행운의 색 ' + escapeHtml(color) + '</p>' +
      '</div>';
  }

  function showDdiSummary() {
    const ddi = getDdiByYear(selectedBirthYear);
    activeRng = createRng(['ddi', ddi.key, readingDay()].concat(variantParts(), ['daily']));
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = ddi.name_kr + ' · ' + (category ? CATEGORY_LABELS[category] : '운세') + ' 리딩';

    const dayHtml = renderDdiDay(ddi);

    const evidenceHtml = renderEvidence([
      sharedView ? '공유된 띠: ' + ddi.name_kr : '입력한 출생연도: ' + selectedBirthYear + '년 → ' + ddi.name_kr,
      sharedView ? '공유된 링크는 띠만 담고 있어요.' : (selectedDdiNote || '생일을 입력하지 않으면 출생연도만으로 띠를 정해요. 1~2월생은 생일을 함께 입력하면 설날 기준으로 계산합니다.'),
      '띠는 설날, 사주의 연주는 입춘이 기준이라 두 결과가 다를 수 있어요.',
      '문장은 띠, 날짜, 이 기기를 기준으로 골라요. 같은 조건이면 오늘은 같은 문장이고, 같은 띠여도 기기마다 다른 문장을 받을 수 있어요.',
      '행운의 색은 띠의 전통적인 오행 연상이고, 숫자는 날짜를 기준으로 후보 중에서 골라요. 결과를 보장하는 값은 아니에요.'
    ]);

    const voiceKey = [ddi.key, readingDay(), selectedCategory, selectedSubChoice, selectedPeriod].join('|');
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' + renderOwnerIntro('ddi', voiceKey) +
      dayHtml + renderPracticePlan() + renderOwnerOutro(voiceKey) + evidenceHtml + renderResultLinks('ddi');
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
    setShareState(heading, [], { kind: 'ddi', a: ddi.key, c: selectedCategory, b: linkSubChoice(), p: selectedPeriod, d: readingDay(), v: readingVariant() });
    shareButton.classList.remove('hidden');
  }

  function saveDdiReading() {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'ddi',
      birthYear: selectedBirthYear,
      category: selectedCategory,
      period: selectedPeriod,
      subChoice: selectedSubChoice,
      cards: []
    };
    currentEntryId = saveReading(storage, entry)[0].id;
  }

  // 입력을 검증하고 calculateSaju에 넘길 형태로 정규화. 실패 시 null을 반환하고 에러 메시지를 표시.
  function resolveSajuInput() {
    sajuErrorEl.classList.add('hidden');

    // 음력 입력은 양력 <input type="date">가 아니라 별도의 텍스트 입력(YYYY-MM-DD)을 사용한다.
    // 양력 달력의 일수 제한(예: 2월 28/29일)이 음력(29/30일)에는 적용되지 않기 때문.
    const activeDateInput = selectedCalendarType === 'lunar' ? sajuLunarDateInput : sajuDateInput;

    if (!activeDateInput.value) {
      sajuErrorEl.textContent = '생년월일을 입력해주세요.';
      sajuErrorEl.classList.remove('hidden');
      return null;
    }
    if (!selectedTimeUnknown && !sajuTimeInput.value) {
      sajuErrorEl.textContent = '태어난 시각을 입력하거나 "시간을 몰라요"를 선택해주세요.';
      sajuErrorEl.classList.remove('hidden');
      return null;
    }

    if (selectedCalendarType === 'lunar' && !/^\d{4}-\d{1,2}-\d{1,2}$/.test(activeDateInput.value.trim())) {
      sajuErrorEl.textContent = '음력 생년월일은 YYYY-MM-DD 형식으로 입력해주세요.';
      sajuErrorEl.classList.remove('hidden');
      return null;
    }

    const dateParts = activeDateInput.value.trim().split('-').map(Number);
    let year = dateParts[0];
    let month = dateParts[1];
    let day = dateParts[2];

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || year < 1900 || year > 2050) {
      sajuErrorEl.textContent = '1900년~2050년 사이의 생년월일만 지원합니다.';
      sajuErrorEl.classList.remove('hidden');
      return null;
    }

    if (selectedCalendarType === 'lunar') {
      const solar = lunarToSolar(year, month, day, selectedIntercalation);
      if (!solar) {
        sajuErrorEl.textContent = '입력한 음력 날짜를 양력으로 변환할 수 없습니다. 날짜를 다시 확인해주세요.';
        sajuErrorEl.classList.remove('hidden');
        return null;
      }
      year = solar.year;
      month = solar.month;
      day = solar.day;

      // 음력 입력 자체는 1900~2050 범위였더라도, 변환된 양력 날짜가 그 범위를 벗어날 수 있다
      // (예: 음력 2050년 12월 -> 양력 2051년). 변환 후 최종 날짜로 다시 검증한다.
      if (year < 1900 || year > 2050) {
        sajuErrorEl.textContent = '1900년~2050년 사이의 생년월일만 지원합니다.';
        sajuErrorEl.classList.remove('hidden');
        return null;
      }
    }

    let hour = 0;
    let minute = 0;
    if (!selectedTimeUnknown) {
      const timeParts = sajuTimeInput.value.split(':').map(Number);
      hour = timeParts[0];
      minute = timeParts[1];
    }

    return { year: year, month: month, day: day, hour: hour, minute: minute, timeUnknown: selectedTimeUnknown };
  }

  function resolveCompatDdiInput() {
    compatErrorEl.classList.add('hidden');
    if (!compatDdiYear1Input.value && !compatDdiDate1Input.value) {
      compatErrorEl.textContent = '사람 1의 태어난 연도를 1900~2100년 사이로 입력해주세요.';
      compatErrorEl.classList.remove('hidden');
      return null;
    }
    if (!compatDdiYear2Input.value && !compatDdiDate2Input.value) {
      compatErrorEl.textContent = '사람 2의 태어난 연도를 1900~2100년 사이로 입력해주세요.';
      compatErrorEl.classList.remove('hidden');
      return null;
    }
    const person1 = resolveDdiYear(compatDdiYear1Input, compatDdiDate1Input, '사람 1: ');
    const person2 = resolveDdiYear(compatDdiYear2Input, compatDdiDate2Input, '사람 2: ');
    if (!person1) {
      compatErrorEl.textContent = '사람 1의 태어난 연도를 1900~2100년 사이로 입력해주세요.';
      compatErrorEl.classList.remove('hidden');
      return null;
    }
    if (!person2) {
      compatErrorEl.textContent = '사람 2의 태어난 연도를 1900~2100년 사이로 입력해주세요.';
      compatErrorEl.classList.remove('hidden');
      return null;
    }
    return { year1: person1.year, year2: person2.year, notes: [person1.note, person2.note].filter(Boolean) };
  }

  // 궁합 사주 날짜 한 사람분을 검증. 실패 시 null을 반환하고 compatErrorEl에 에러를 표시.
  function resolveCompatSajuDate(dateInput, lunarDateInput, intercalation, personLabel) {
    const activeInput = selectedCompatCalendarType === 'lunar' ? lunarDateInput : dateInput;

    if (!activeInput.value) {
      compatErrorEl.textContent = personLabel + '의 생년월일을 입력해주세요.';
      compatErrorEl.classList.remove('hidden');
      return null;
    }

    if (selectedCompatCalendarType === 'lunar' && !/^\d{4}-\d{1,2}-\d{1,2}$/.test(activeInput.value.trim())) {
      compatErrorEl.textContent = personLabel + '의 음력 생년월일은 YYYY-MM-DD 형식으로 입력해주세요.';
      compatErrorEl.classList.remove('hidden');
      return null;
    }

    const dateParts = activeInput.value.trim().split('-').map(Number);
    let year = dateParts[0];
    let month = dateParts[1];
    let day = dateParts[2];

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || year < 1900 || year > 2050) {
      compatErrorEl.textContent = personLabel + '은(는) 1900년~2050년 사이의 생년월일만 지원합니다.';
      compatErrorEl.classList.remove('hidden');
      return null;
    }

    if (selectedCompatCalendarType === 'lunar') {
      const solar = lunarToSolar(year, month, day, intercalation);
      if (!solar) {
        compatErrorEl.textContent = personLabel + '의 음력 날짜를 양력으로 변환할 수 없습니다. 날짜를 다시 확인해주세요.';
        compatErrorEl.classList.remove('hidden');
        return null;
      }
      year = solar.year;
      month = solar.month;
      day = solar.day;

      if (year < 1900 || year > 2050) {
        compatErrorEl.textContent = personLabel + '은(는) 1900년~2050년 사이의 생년월일만 지원합니다.';
        compatErrorEl.classList.remove('hidden');
        return null;
      }
    }

    return { year: year, month: month, day: day };
  }

  function resolveCompatSajuInput() {
    compatErrorEl.classList.add('hidden');
    const date1 = resolveCompatSajuDate(compatSajuDate1Input, compatSajuLunarDate1Input, compatIntercalation1Checkbox.checked, '사람 1');
    if (!date1) return null;
    const date2 = resolveCompatSajuDate(compatSajuDate2Input, compatSajuLunarDate2Input, compatIntercalation2Checkbox.checked, '사람 2');
    if (!date2) return null;
    return { date1: date1, date2: date2 };
  }

  function pillarText(pillar) {
    return CHEONGAN[pillar.stemIdx] + JIJI[pillar.branchIdx];
  }

  const ELEMENT_CLASS = { 목: 'el-wood', 화: 'el-fire', 토: 'el-earth', 금: 'el-metal', 수: 'el-water' };

  function ganjiCellHtml(stemIdx, branchIdx) {
    const stemEl = getStemElement(stemIdx);
    const branchEl = JIJI_ELEMENT[branchIdx];
    return '<td class="ganji-cell">' +
      '<span class="' + ELEMENT_CLASS[stemEl] + '">' + CHEONGAN[stemIdx] + '</span>' +
      '<span class="' + ELEMENT_CLASS[branchEl] + '">' + JIJI[branchIdx] + '</span>' +
      '</td>';
  }

  // saju(연/월/일/시주)를 받아 십성/간지/지장간/12운성/납음 상세표 HTML을 만든다.
  // 시주가 없으면(시간 모름) 시주 컬럼 자체를 생략한다.
  function renderMyeongsikDetailTable(saju) {
    const pillars = [
      { key: 'hour', label: '시주', pillar: saju.hour },
      { key: 'day', label: '일주', pillar: saju.day },
      { key: 'month', label: '월주', pillar: saju.month },
      { key: 'year', label: '년주', pillar: saju.year }
    ].filter(function (p) { return p.pillar; });

    const dayStemIdx = saju.day.stemIdx;

    const headerHtml = pillars.map(function (p) { return '<th>' + p.label + '</th>'; }).join('');

    const sipsinStemRowHtml = pillars.map(function (p) {
      const text = p.key === 'day' ? '일간(나)' : getSipsin(dayStemIdx, p.pillar.stemIdx);
      return '<td>' + text + '</td>';
    }).join('');

    const ganjiRowHtml = pillars.map(function (p) {
      return ganjiCellHtml(p.pillar.stemIdx, p.pillar.branchIdx);
    }).join('');

    const sipsinBranchRowHtml = pillars.map(function (p) {
      return '<td>' + getSipsin(dayStemIdx, getJijanggan(p.pillar.branchIdx)) + '</td>';
    }).join('');

    const jijangganRowHtml = pillars.map(function (p) {
      return '<td>' + CHEONGAN[getJijanggan(p.pillar.branchIdx)] + '</td>';
    }).join('');

    const lifeStageRowHtml = pillars.map(function (p) {
      return '<td>' + getTwelveLifeStage(dayStemIdx, p.pillar.branchIdx) + '</td>';
    }).join('');

    const napjeongRowHtml = pillars.map(function (p) {
      return '<td>' + getNapjeong(p.pillar.stemIdx, p.pillar.branchIdx) + '</td>';
    }).join('');

    const chungPairs = [];
    for (let i = 0; i < pillars.length; i += 1) {
      for (let j = i + 1; j < pillars.length; j += 1) {
        if (isChungBranchPair(pillars[i].pillar.branchIdx, pillars[j].pillar.branchIdx)) {
          chungPairs.push(pillars[i].label.replace('주', '지') + '·' + pillars[j].label.replace('주', '지') +
            ' 충 (' + JIJI[pillars[i].pillar.branchIdx] + '·' + JIJI[pillars[j].pillar.branchIdx] + ')');
        }
      }
    }
    const chungHtml = chungPairs.length ? '<p class="chung-note">' + chungPairs.join(', ') + '</p>' : '';
    const elementNames = { 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' };
    const elementColorNames = { 목: '초록색', 화: '빨간색', 토: '갈색', 금: '흰색', 수: '남색' };
    const legendHtml = '<ul class="element-legend" aria-label="오행 색상 안내">' +
      ['목', '화', '토', '금', '수'].map(function (el) {
        return '<li><span class="element-swatch ' + ELEMENT_CLASS[el] + '" aria-hidden="true"></span>' + elementColorNames[el] + ' = ' + el + '(' + elementNames[el] + ')</li>';
      }).join('') + '</ul>';

    return '<div class="myeongsik-detail-wrap"><table class="myeongsik-detail-table">' +
      '<thead><tr><th></th>' + headerHtml + '</tr></thead>' +
      '<tbody>' +
      '<tr><th>천간 십성</th>' + sipsinStemRowHtml + '</tr>' +
      '<tr><th>간지</th>' + ganjiRowHtml + '</tr>' +
      '<tr><th>지지 십성</th>' + sipsinBranchRowHtml + '</tr>' +
      '<tr><th>지장간</th>' + jijangganRowHtml + '</tr>' +
      '<tr><th>12운성</th>' + lifeStageRowHtml + '</tr>' +
      '<tr><th>납음</th>' + napjeongRowHtml + '</tr>' +
      '</tbody></table></div>' + legendHtml + chungHtml;
  }

  const SAJU_GROUP_LABEL = { bigeop: '비겁', siksang: '식상', jaeseong: '재성', gwanseong: '관성', inseong: '인성' };
  const SAJU_CORE_CATEGORIES = ['money', 'career', 'love', 'relationships', 'health'];

  function sajuSection(title, bodyHtml, open) {
    return '<details class="saju-sec"' + (open ? ' open' : '') + '><summary>' + title + '</summary><div class="saju-sec-body">' + bodyHtml + '</div></details>';
  }

  function sajuParagraphs(texts) {
    return texts.filter(Boolean).map(function (t) { return '<p class="reading-body">' + escapeHtml(t) + '</p>'; }).join('');
  }

  // 사주 풀이 5섹션(아코디언): 총운과 오행, 재물과 직업, 연애와 인간관계, 건강과 주의할 시기, 개운법. 계산 결과는 interp에 있다.
  function renderSajuSections(ilgan, balanceText, interp, counts) {
    const t = SAJU_ILGAN_TEXT[ilgan.key];
    const group = SAJU_GROUP_TEXT[interp.dominantGroup];
    const season = SAJU_SEASON_RELATION[interp.seasonRelation].replace('{season}', SAJU_SEASON_LABEL[interp.monthElement]);

    const chartLine = SAJU_CHART_LINE.replace('{ilgan}', ilgan.name_kr).replace('{month}', interp.monthElement)
      .replace('{counts}', ['목', '화', '토', '금', '수'].map(function (el) { return el + ' ' + counts[el]; }).join(' '))
      .replace('{strong}', interp.strongElement);
    const overallHtml = renderReadingMeaning(resolveMeaningText(ilgan.trait)) +
      sajuParagraphs([pickRandom(t.overall), chartLine, balanceText, season, group.lead]);
    const moneyHtml = sajuParagraphs([daySectionText(ilgan, 'money'), daySectionText(ilgan, 'career'), pickRandom(t.work), SAJU_WORK_ELEMENT[interp.dayElement], group.money]);
    const loveHtml = sajuParagraphs([daySectionText(ilgan, 'love'), daySectionText(ilgan, 'relationships'), pickRandom(t.bond), SAJU_LOVE_ELEMENT[interp.dayElement], group.love]);
    const healthHtml = sajuParagraphs([SAJU_HEALTH_DISCLAIMER, SAJU_HEALTH_ELEMENT[interp.healthElement], daySectionText(ilgan, 'health'),
      interp.currentMonthElement ? SAJU_NOW_CARE[interp.currentMonthElement] : '',
      interp.yearGroup ? SAJU_GROUP_TEXT[interp.yearGroup].year : '']);
    const remedy = interp.remedyElement ? SAJU_REMEDY_ELEMENT[interp.remedyElement] : SAJU_REMEDY_BALANCED;
    const keywordLine = '일간의 키워드는 ‘' + pickKeywords(ilgan.keywords, 3).join('·') + '’입니다. 하루에 한 번 이 말을 떠올리며 오늘의 선택 하나를 정해 보세요.';
    const remedyHtml = sajuParagraphs([pickAdvice(ilgan.advice), remedy, pickRandom(t.practice), SAJU_ROUTINE_ELEMENT[interp.dayElement], keywordLine]);

    const sections = [
      sajuSection('총운과 오행', overallHtml, true),
      sajuSection('재물과 직업', moneyHtml, false),
      sajuSection('연애와 인간관계', loveHtml, false),
      sajuSection('건강과 주의할 시기', healthHtml, false)
    ];
    if (selectedCategory && SAJU_CORE_CATEGORIES.indexOf(selectedCategory) === -1) {
      sections.push(sajuSection('고른 주제 · ' + CATEGORY_LABELS[selectedCategory], sajuParagraphs([resolveCategoryMeaning(ilgan, selectedCategory, selectedPeriod, selectedSubChoice)]), false));
    }
    sections.push(sajuSection('개운법', remedyHtml, false));
    return '<div class="saju-acc"><button type="button" class="saju-acc-toggle">모두 펼치기</button>' + sections.join('') + '</div>';
  }

  function showSajuSummary(input, saju) {
    activeRng = createRng(['saju', JSON.stringify(input), selectedGender, 'sections']);
    const category = selectedCategory;
    const period = selectedPeriod;
    const ilgan = getIlganByIndex(saju.day.stemIdx);
    const heading = ilgan.name_kr + ' 일간 · ' + (category ? CATEGORY_LABELS[category] : '운세') + ' 리딩';

    const myeongsikHtml = renderMyeongsikDetailTable(saju);

    const counts = getElementCounts(saju);
    const elementHtml = '<p class="element-summary">' +
      ['목', '화', '토', '금', '수'].map(function (el) { return el + counts[el]; }).join(' ') +
      '</p>';

    let daeunHtml = '';
    let seunHtml = '';
    let wolunHtml = '';
    if (saju.hour) {
      const direction = getDaeunDirection(saju.year.stemIdx, selectedGender);
      const startAge = getDaeunStartAge(saju.instant, saju.monthOffset, direction);
      const daeunList = getDaeunList(saju.month.stemIdx, saju.month.branchIdx, direction, startAge);
      const today = new Date();
      // 대운 구간은 한국식 세는나이 기준으로 판단
      const currentAge = today.getFullYear() - input.year + 1;
      daeunHtml = '<p class="table-label">대운</p><div class="daeun-table">' +
        daeunList.map(function (d) {
          const isCurrent = currentAge >= d.startAge && currentAge <= d.endAge;
          return '<div class="daeun-col' + (isCurrent ? ' current' : '') + '"><span class="daeun-ganji">' + pillarText(d) + '</span><span class="daeun-age">천간 십성: ' + getSipsin(saju.day.stemIdx, d.stemIdx) + '</span><span class="daeun-age">' + d.startAge + '~' + d.endAge + '세</span></div>';
        }).join('') +
        '</div>';

      const activeDaeun = daeunList.find(function (d) { return currentAge >= d.startAge && currentAge <= d.endAge; });
      if (activeDaeun) {
        const seunStartYear = input.year + activeDaeun.startAge - 1;
        const seunList = getSeunList(seunStartYear, 10);
        const thisYear = today.getFullYear();
        seunHtml = '<p class="table-label">세운</p><div class="seun-table">' +
          seunList.map(function (s) {
            const isCurrent = s.year === thisYear;
            return '<div class="seun-col' + (isCurrent ? ' current' : '') + '"><span class="seun-ganji">' + pillarText(s) + '</span><span class="seun-age">' + s.year + '년 · ' + (s.year - input.year + 1) + '세</span></div>';
          }).join('') +
          '</div>';

        // 월운은 호스트 시간대와 무관하게 KST의 입춘 기준 연도를 사용한다.
        const kstCalendarYear = new Date(today.getTime() + 9 * 60 * 60 * 1000).getUTCFullYear();
        const wolunYear = getSajuYear(today, kstCalendarYear);
        const thisYearStemIdx = getYearPillar(wolunYear).stemIdx;
        const wolunList = getWolunList(thisYearStemIdx);
        const currentMonthOffset = getMonthOffset(solarLongitude(today));
        wolunHtml = '<p class="table-label">월운 · ' + wolunYear + '년 (입춘 기준)</p><div class="wolun-table">' +
          wolunList.map(function (w) {
            const isCurrent = w.monthOffset === currentMonthOffset;
            return '<div class="wolun-col' + (isCurrent ? ' current' : '') + '"><span class="wolun-ganji">' + pillarText(w) + '</span><span class="wolun-month">' + JIJI[w.branchIdx] + '월</span></div>';
          }).join('') +
          '</div>';
      }
    }

    const balance = classifyElementBalance(counts);
    const balanceText = getElementBalanceText(balance);
    // 올해 세운(입춘 기준 연도)의 천간으로 올해의 십성 묶음을 계산한다
    const kstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    const yearStemIdx = getYearPillar(getSajuYear(new Date(), kstNow.getUTCFullYear())).stemIdx;
    // 오늘이 속한 달의 지지(절기 기준)로 지금 계절을 계산한다
    const currentBranchIdx = (getMonthOffset(solarLongitude(new Date())) + 2) % 12;
    const interp = interpretSaju(saju, counts, { getSipsin: getSipsin, getJijanggan: getJijanggan, classifyElementBalance: classifyElementBalance }, yearStemIdx, currentBranchIdx);
    const sectionsHtml = renderSajuSections(ilgan, balanceText, interp, counts);

    const voiceKey = [JSON.stringify(input), selectedGender, selectedCategory, selectedSubChoice, selectedPeriod].join('|');
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' + renderOwnerIntro('saju', voiceKey) +
      sectionsHtml +
      myeongsikHtml + elementHtml +
      (daeunHtml ? '<details class="fortune-tables"><summary>대운 · 세운 · 월운 자세히 보기</summary>' + daeunHtml + seunHtml + wolunHtml + '</details>' : '') +
      renderPracticePlan() + renderOwnerOutro(voiceKey) + renderEvidence([
        '일간: ' + ilgan.name_kr + ' (오행 ' + ilgan.element + ')',
        '오행 분포: ' + ['목', '화', '토', '금', '수'].map(function (el) { return el + counts[el]; }).join(' '),
        '태어난 달의 오행: ' + interp.monthElement + ' (일간과의 관계: ' + SAJU_GROUP_LABEL[interp.seasonRelation] + ' 묶음)',
        '십성 묶음 분포: ' + SAJU_GROUP_ORDER.map(function (g) { return SAJU_GROUP_LABEL[g] + ' ' + interp.groupCounts[g]; }).join(' · ') + ' (천간과 지지의 본기 기준)',
        '올해 세운과 일간의 관계: ' + (interp.yearGroup ? SAJU_GROUP_LABEL[interp.yearGroup] + ' 묶음' : '계산하지 않음'),
        '입춘 기준 연주와 절기 기준 월주로 명식을 계산했고, 같은 생년월일시면 같은 달 안에서는 언제 봐도 같은 문장이 나옵니다. 올해 세운 문장은 해가 바뀌면, 지금 계절에 맞춘 돌봄 문장은 달이 바뀌면 달라질 수 있어요.'
      ]) + renderResultLinks('saju');
    const accToggle = summaryEl.querySelector('.saju-acc-toggle');
    if (accToggle) {
      accToggle.addEventListener('click', function () {
        const all = Array.prototype.slice.call(summaryEl.querySelectorAll('.saju-sec'));
        const open = all.some(function (d) { return !d.open; });
        all.forEach(function (d) { d.open = open; });
        accToggle.textContent = open ? '모두 접기' : '모두 펼치기';
      });
    }
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
    setShareState(heading, [], null);
    shareButton.classList.remove('hidden');
  }

  function saveSajuReading(input, saju) {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'saju',
      calendarType: selectedCalendarType,
      birthDate: input.year + '-' + String(input.month).padStart(2, '0') + '-' + String(input.day).padStart(2, '0'),
      birthTime: input.timeUnknown ? null : (String(input.hour).padStart(2, '0') + ':' + String(input.minute).padStart(2, '0')),
      timeUnknown: input.timeUnknown,
      gender: selectedGender,
      dayIlganName: getIlganByIndex(saju.day.stemIdx).name_kr,
      category: selectedCategory,
      period: selectedPeriod,
      subChoice: selectedSubChoice,
      cards: []
    };
    currentEntryId = saveReading(storage, entry)[0].id;
  }

  function pickFactorTexts(factors, field) {
    return factors.map(function (f) { return COMPAT_FACTOR_TEXT[f.key][field]; }).join(' ');
  }

  // 궁합 본문 네 부분을 두 사람(같은 두 사람이면 같은 결과)의 유형과 관계 요소로 조립한다.
  function buildCompatibilityParts(tierInfo, detail) {
    const text = COMPAT_SECTION_TEXT[detail.tier];
    const extra = COMPAT_SECTION_EXTRA[detail.tier];
    const summary = pickRandom(text.summary);
    const keywordGroups = detail.people.map(function (p) { return pickKeywords(p.keywords, 2).join('·'); });
    const keywordLine = pickRandom(COMPAT_KEYWORD_LINE).replace('{a}', '‘' + keywordGroups[0] + '’').replace('{b}', '‘' + keywordGroups[1] + '’');
    const overview = tierInfo.text + ' ' + pickRandom(text.overview) + ' ' + pickFactorTexts(detail.factors, 'overview') + ' ' + keywordLine;
    const sameKind = detail.people[0].key === detail.people[1].key;
    // 사람별 문단: 기질 풀이와 관계 속 모습(대인관계 풀이의 기존 문장). 같은 별자리·띠·일간끼리는 한 사람의 풀이만 있으므로
    // 새 인연과 기존 관계 문장을 모두 쓴다.
    const personParagraphs = (sameKind ? [detail.people[0]] : detail.people).map(function (p, i) {
      const relations = sameKind ? [p.categories.relationships.existing, p.categories.relationships.new] : [p.categories.relationships.existing];
      return {
        label: sameKind ? detail.labels[0] + ', ' + detail.labels[1] : detail.labels[i],
        text: resolveMeaningText(p.trait) + ' ' + relations.map(resolveMeaningText).join(' ')
      };
    });
    const chemistry = pickRandom(text.chemistry) + ' ' + pickRandom(extra.signal);
    const conflict = pickRandom(text.conflict) + ' ' + pickFactorTexts(detail.factors, 'conflict') + ' ' + pickRandom(extra.trap);
    const resolve = pickRandom(text.resolve);
    const ownAdvice = sameKind ? [pickAdvice(detail.people[0].advice)] : detail.people.map(function (p) { return pickAdvice(p.advice); });
    const keep = pickAdvice(tierInfo.advice) + ' ' + pickRandom(text.keep) + ' ' + pickRandom(extra.practice) + (ownAdvice.length ? ' ' + ownAdvice.join(' ') : '');
    return { summary: summary, overview: overview, persons: personParagraphs, chemistry: chemistry, conflict: conflict, resolve: resolve, keep: keep };
  }

  function showCompatibilitySummary(label1, label2, tierInfo, saju1, saju2, detail) {
    activeRng = createRng(['compat', selectedCompatSubtype, label1, label2]);
    const heading = label1 + ' × ' + label2 + ' 궁합';
    const parts = buildCompatibilityParts(tierInfo, detail);
    const chartsHtml = saju1 && saju2 ?
      '<h5 class="table-label">사람 1</h5>' + renderMyeongsikDetailTable(saju1) +
      '<h5 class="table-label">사람 2</h5>' + renderMyeongsikDetailTable(saju2) : '';
    const voiceKey = [selectedCompatSubtype, label1, label2].join('|');
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' + renderOwnerIntro('compat', voiceKey) +
      '<p class="compat-tier-label">' + tierInfo.tierLabel + '</p>' +
      '<div class="reading-detail compat-day">' +
      '<p class="reading-lead-label">두 사람의 관계를 한 줄로</p><p class="reading-lead">' + escapeHtml(parts.summary) + '</p>' +
      '<h4>개요</h4><p class="reading-body">' + escapeHtml(parts.overview) + '</p>' +
      '<h4>성격 상성</h4>' + parts.persons.map(function (p) { return '<p class="reading-body"><strong>' + escapeHtml(p.label) + '</strong> ' + escapeHtml(p.text) + '</p>'; }).join('') +
      '<p class="reading-body">' + escapeHtml(parts.chemistry) + '</p>' +
      '<h4>갈등의 원인과 해결</h4><p class="reading-body">' + escapeHtml(parts.conflict) + '</p><p class="reading-body">' + escapeHtml(parts.resolve) + '</p>' +
      '<h4>관계를 오래 이어 가려면</h4><p class="card-advice">' + escapeHtml(parts.keep) + '</p>' +
      '</div>' + chartsHtml + renderOwnerOutro(voiceKey) + renderEvidence(
        ['비교한 두 사람: ' + label1 + ' × ' + label2,
          '관계 유형: ' + tierInfo.tierLabel]
          .concat(detail.factors.map(function (f) { return '관계 요소: ' + f.label; }))
          .concat(detail.notes || [])
          .concat(['점수나 순위를 매기지 않고, 위 유형과 요소에 맞는 문장을 골라 보여 줘요.', '같은 두 사람이면 언제 봐도 같은 결과가 나옵니다.'])
      ) + renderResultLinks('compat');
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
    setShareState(heading.replace(/\d{4}년생 /g, ''), [], null);
    shareButton.classList.remove('hidden');
  }

  function saveCompatibilityReading(subtype, label1, label2, tierInfo) {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'compatibility',
      subtype: subtype,
      person1Label: label1,
      person2Label: label2,
      tierLabel: tierInfo.tierLabel,
      cards: []
    };
    currentEntryId = saveReading(storage, entry)[0].id;
  }

  function renderCards(draw) {
    cardsContainer.innerHTML = '';

    draw.forEach(function (item) {
      const cardEl = document.createElement('div');
      cardEl.className = 'card';
      cardEl.setAttribute('tabindex', '0');
      cardEl.setAttribute('role', 'button');
      cardEl.setAttribute('aria-label', '카드 뒤집기');

      const orientationLabel = item.orientation === 'upright' ? '정방향' : '역방향';
      const imgClass = item.orientation === 'reversed' ? 'reversed' : '';

      cardEl.innerHTML =
        '<div class="card-inner">' +
          '<div class="card-back"></div>' +
          '<div class="card-front">' +
            '<img class="' + imgClass + '" src="' + item.card.image + '" alt="' + item.card.name + '" ' +
              'onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">' +
            '<div class="card-fallback">' + item.card.name + '</div>' +
            '<p class="card-name">' + item.card.name + ' (' + orientationLabel + ')</p>' +
          '</div>' +
        '</div>';

      function flipCard() {
        if (cardEl.classList.contains('flipped')) return;
        cardEl.classList.add('flipped');
        flippedCount += 1;

        if (flippedCount === draw.length && !historySaved) {
          showSummary(draw);
          saveCurrentReading(draw);
          setupPromiseBox();
          historySaved = true;
        }
      }

      cardEl.addEventListener('click', flipCard);
      cardEl.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          flipCard();
        }
      });

      cardsContainer.appendChild(cardEl);
    });
  }

  function showSummary(draw) {
    activeRng = createRng(['tarot', currentTarotSeed]);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = (category ? CATEGORY_LABELS[category] : '운세') + ' 리딩 요약';

    const useThreeCard = draw.length === 3 && typeof TAROT_ONECARD !== 'undefined' && typeof THREECARD_FRAMES !== 'undefined' &&
      draw.every(function (item) { return TAROT_ONECARD[item.card.cardId]; });
    const details = useThreeCard ? renderThreeCardDetails(draw, category) : draw.map(function (item) {
      if (draw.length === 1 && typeof TAROT_ONECARD !== 'undefined' && TAROT_ONECARD[item.card.cardId]) {
        return renderOneCardDetail(item, category, getSensitiveReading(category, selectedSubChoice, item.card.keywords && item.card.keywords[item.orientation]));
      }
      const orientationLabel = item.orientation === 'upright' ? '정방향' : '역방향';
      const categoryReading = category && item.card.categories && item.card.categories[category];
      const baseMeaning = categoryReading
        ? resolveMeaningText(resolveSubchoiceValue(category, categoryReading[item.orientation], selectedSubChoice))
        : resolveMeaningText(item.orientation === 'upright' ? item.card.upright : item.card.reversed);
      const meaning = getSensitiveReading(category, selectedSubChoice, item.card.keywords && item.card.keywords[item.orientation]) || baseMeaning;

      const keywordsList = item.card.keywords && item.card.keywords[item.orientation];
      const adviceText = item.card.advice && item.card.advice[item.orientation];
      const extraHtml = renderKeywordsAdviceHtml(keywordsList, adviceText);
      const slug = (typeof TAROT_SLUGS !== 'undefined') ? TAROT_SLUGS[item.card.cardId] : null;
      const detailLinkHtml = slug
        ? '<a class="card-detail-link" href="tarot/' + slug + '.html">이 카드 자세히 보기 →</a>'
        : '';

      return '<div class="reading-detail">' +
        '<h4>' + item.card.name + ' (' + orientationLabel + ')</h4>' +
        renderReadingMeaning(meaning) +
        extraHtml +
        detailLinkHtml +
        '</div>';
    });
    const tarotEvidence = renderEvidence(
      draw.map(function (item) {
        return '뽑힌 카드: ' + item.card.name + ' (' + (item.orientation === 'upright' ? '정방향' : '역방향') + ')';
      }).concat(['카드는 78장 덱에서 무작위로 뽑았고, 정방향과 역방향은 각각 절반의 확률입니다. 다시 뽑으면 새 카드가 나옵니다.'])
    );
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' + renderOwnerIntro('tarot', currentTarotSeed) + renderQuestionQuote() + details.join('') + renderPracticePlan() + renderOwnerOutro(currentTarotSeed) + tarotEvidence + renderResultLinks(draw.length === 3 ? 'tarot3' : 'tarot1', draw);
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
    setShareState(heading, draw.map(function (item) { return { src: item.card.image, reversed: item.orientation === 'reversed' }; }), {
      kind: 'tarot',
      cards: draw.map(function (item) { return item.card.cardId + '.' + (item.orientation === 'upright' ? 'u' : 'r'); }).join(','),
      c: selectedCategory, b: linkSubChoice(), p: selectedPeriod, d: todayKey(), k: currentTarotSeed
    });
    shareButton.classList.remove('hidden');
  }

  function saveCurrentReading(draw) {
    if (!storage || sharedView) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'tarot',
      question: currentQuestion || undefined,
      category: selectedCategory,
      period: selectedPeriod,
      subChoice: selectedSubChoice,
      spreadType: String(selectedSpread),
      cards: draw.map(function (item) {
        return { name: item.card.name, orientation: item.orientation };
      })
    };
    currentEntryId = saveReading(storage, entry)[0].id;
  }

  const SHARE_SELECTOR = 'h3, h4, .compat-tier-label, .reading-lead, .reading-body, .card-keywords, .card-advice, .card-action, .practice-plan p, .owner-outro p';
  const SITE_URL = 'https://nwb010118.github.io/tarot-reading/';
  const SHARE_BUTTON_LABEL = '공유하기';

  function buildShareText() {
    const parts = Array.prototype.map.call(
      summaryEl.querySelectorAll(SHARE_SELECTOR),
      function (el) { return el.textContent.trim(); }
    );
    return parts.join('\n\n') + '\n\n가만점방에서 나도 운세 보러 가기\n' + SITE_URL;
  }

  function copyShareText(text) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function () {
      shareButton.textContent = '복사했어요!';
      setTimeout(function () { shareButton.textContent = SHARE_BUTTON_LABEL; }, 1500);
    }).catch(function () {
      shareButton.textContent = '복사에 실패했어요';
      setTimeout(function () { shareButton.textContent = SHARE_BUTTON_LABEL; }, 1500);
    });
  }

  function shareCurrentReading() {
    const text = buildShareText();
    if (navigator.share) {
      navigator.share({ text: text }).catch(function (err) {
        if (err && err.name === 'AbortError') return;
        copyShareText(text);
      });
    } else {
      copyShareText(text);
    }
  }

  shareButton.addEventListener('click', shareCurrentReading);

  function flashButton(button, text, label) {
    button.textContent = text;
    setTimeout(function () { button.textContent = label; }, 1500);
  }

  // 이미지 카드를 만들어 모바일은 공유 시트로, 그 외에는 PNG 다운로드로 내보낸다
  function shareImageCard(spec, link, button) {
    const label = button.textContent;
    button.disabled = true;
    return renderShareCard(spec).then(function (blob) {
      const file = new File([blob], 'jeomjip-' + todayKey() + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], text: '가만점방에서 나도 운세 보기', url: link }).catch(function (err) {
          if (!err || err.name !== 'AbortError') throw err;
        });
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      flashButton(button, '이미지를 저장했어요!', label);
    }).catch(function () {
      flashButton(button, '이미지를 만들지 못했어요', label);
    }).then(function () { button.disabled = false; });
  }

  function cardSpec(title, lead, images) {
    return { title: title, lead: lead, images: images, dateText: readingDay().replace(/-/g, '. '), siteText: SITE_URL.replace('https://', '') };
  }

  shareImageButton.addEventListener('click', function () {
    if (!shareState) return;
    const link = shareState.params ? SITE_URL + buildShareHash(shareState.params) : SITE_URL;
    shareImageCard(cardSpec(shareState.title, shareState.lead, shareState.images), link, shareImageButton);
  });

  shareLinkButton.addEventListener('click', function () {
    if (!shareState || !shareState.params || !navigator.clipboard) return;
    navigator.clipboard.writeText(SITE_URL + buildShareHash(shareState.params)).then(function () {
      flashButton(shareLinkButton, '링크를 복사했어요!', '링크 복사');
    }).catch(function () {
      flashButton(shareLinkButton, '복사에 실패했어요', '링크 복사');
    });
  });

  newReadingButton.addEventListener('click', function () {
    if (sharedView) {
      sharedView = false;
      readingDateOverride = null;
      variantOverride = null;
      sharedBanner.classList.add('hidden');
      newReadingButton.textContent = '새 리딩 시작';
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    }
    questionInput.value = '';
    currentQuestion = '';
    questionIntent = null;
    lastAppliedIntent = '';
    questionChip.classList.add('hidden');
    hideQuestionSuggest();
    questionSafety.classList.add('hidden');
    screenReading.classList.add('hidden');
    screenStart.classList.remove('hidden');
    categoryButtons.forEach(function (b) { b.classList.remove('selected'); });
    categoryButtons[0].classList.add('selected');
    selectedCategory = null;
    renderSubChoices();
    updatePeriodLock();
    zodiacButtons.forEach(function (b) { b.classList.remove('selected'); });
    zodiacButtons[0].classList.add('selected');
    selectedZodiac = 'aries';
    updateZodiacResult();
    birthYearInput.value = '';
    birthDateInput.value = '';
    selectedDdiNote = '';
    ddiResultEl.classList.add('hidden');
    selectedBirthYear = null;
    calendarTypeButtons.forEach(function (b) { b.classList.remove('selected'); });
    calendarTypeButtons[0].classList.add('selected');
    selectedCalendarType = 'solar';
    intercalationSelect.classList.add('hidden');
    intercalationCheckbox.checked = false;
    selectedIntercalation = false;
    sajuDateSolarGroup.classList.remove('hidden');
    sajuDateLunarGroup.classList.add('hidden');
    sajuDateInput.value = '';
    sajuLunarDateInput.value = '';
    sajuTimeInput.value = '';
    sajuTimeInput.disabled = false;
    timeUnknownCheckbox.checked = false;
    selectedTimeUnknown = false;
    genderButtons.forEach(function (b) { b.classList.remove('selected'); });
    genderButtons[0].classList.add('selected');
    selectedGender = 'male';
    sajuErrorEl.classList.add('hidden');
    compatSubtypeButtons.forEach(function (b) { b.classList.remove('selected'); });
    compatSubtypeButtons[0].classList.add('selected');
    selectedCompatSubtype = 'zodiac';
    compatZodiacGroup.classList.remove('hidden');
    compatDdiGroup.classList.add('hidden');
    compatSajuGroup.classList.add('hidden');
    compatZodiac1Buttons.forEach(function (b) { b.classList.remove('selected'); });
    compatZodiac1Buttons[0].classList.add('selected');
    selectedCompatZodiac1 = 'aries';
    compatZodiac2Buttons.forEach(function (b) { b.classList.remove('selected'); });
    compatZodiac2Buttons[0].classList.add('selected');
    selectedCompatZodiac2 = 'aries';
    compatDdiYear1Input.value = '';
    compatDdiDate1Input.value = '';
    compatDdiDate2Input.value = '';
    compatDdiYear2Input.value = '';
    compatCalendarTypeButtons.forEach(function (b) { b.classList.remove('selected'); });
    compatCalendarTypeButtons[0].classList.add('selected');
    selectedCompatCalendarType = 'solar';
    compatSajuDate1SolarGroup.classList.remove('hidden');
    compatSajuDate1LunarGroup.classList.add('hidden');
    compatSajuDate2SolarGroup.classList.remove('hidden');
    compatSajuDate2LunarGroup.classList.add('hidden');
    compatSajuDate1Input.value = '';
    compatSajuLunarDate1Input.value = '';
    compatSajuDate2Input.value = '';
    compatSajuLunarDate2Input.value = '';
    compatIntercalation1Checkbox.checked = false;
    compatIntercalation2Checkbox.checked = false;
    compatErrorEl.classList.add('hidden');
  });

  historyOpenButton.addEventListener('click', function () {
    renderHistory();
    historyModal.classList.remove('hidden');
  });

  function closeHistoryModal() {
    historyModal.classList.add('hidden');
  }

  historyCloseButton.addEventListener('click', closeHistoryModal);

  historyModal.addEventListener('click', function (event) {
    if (event.target === historyModal) closeHistoryModal();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !historyModal.classList.contains('hidden')) {
      closeHistoryModal();
    }
  });

  clearHistoryButton.addEventListener('click', function () {
    if (!storage) return;
    clearHistory(storage);
    renderHistory();
  });

  const PROMISE_STATUS_LABELS = { pending: '⏳ 확인 대기', done: '✓ 했어요', partial: '△ 조금 했어요', skipped: '✗ 못 했어요' };

  function renderHistoryPromise(entry) {
    if (!entry.promise) return '';
    return '<p class="history-promise">약속: ' + escapeHtml(entry.promise.text) +
      ' <span class="promise-status">' + (PROMISE_STATUS_LABELS[entry.promise.status] || '') + '</span></p>';
  }

  function renderHistory() {
    if (!storage) {
      historyList.innerHTML = '<p>이 브라우저에서는 기록 저장을 사용할 수 없습니다.</p>';
      return;
    }

    const history = getHistory(storage);

    if (history.length === 0) {
      historyList.innerHTML = '<p>저장된 기록이 없습니다.</p>';
      return;
    }

    historyList.innerHTML = history.map(function (entry, index) {
      let cardsText;
      if (entry.mode === 'zodiac') {
        cardsText = ZODIAC_LABELS[entry.zodiac] || '별자리';
      } else if (entry.mode === 'ddi') {
        cardsText = entry.birthYear ? entry.birthYear + '년생 ' + getDdiByYear(entry.birthYear).name_kr : '띠운세';
      } else if (entry.mode === 'saju') {
        cardsText = escapeHtml(entry.birthDate + ' ' + (entry.timeUnknown ? '(시간 모름)' : entry.birthTime) + ' · ' + entry.dayIlganName + ' 일간');
      } else if (entry.mode === 'compatibility') {
        cardsText = escapeHtml(entry.person1Label + ' × ' + entry.person2Label);
      } else {
        cardsText = entry.cards.map(function (c) {
          return c.name + '(' + (c.orientation === 'upright' ? '정' : '역') + ')';
        }).join(', ');
      }
      const dateText = new Date(entry.date).toLocaleString('ko-KR');
      const periodLabel = entry.period && PERIOD_LABELS[entry.period] ? PERIOD_LABELS[entry.period] : '오늘';
      const categoryLabel = entry.category && CATEGORY_LABELS[entry.category] ? CATEGORY_LABELS[entry.category] : '운세';
      const topicText = entry.mode === 'compatibility'
        ? escapeHtml(COMPAT_SUBTYPE_LABELS[entry.subtype] + ' · ' + entry.tierLabel)
        : escapeHtml(categoryLabel + ' · 실천 기간: ' + periodLabel);

      return '<div class="history-item">' +
        '<p class="history-date">' + dateText + '</p>' +
        '<p class="history-question">' + topicText + '</p>' +
        '<p class="history-cards">' + cardsText + '</p>' +
        (entry.mode === 'tarot' && entry.question ? '<p class="history-asked">질문: ' + escapeHtml(entry.question) + '</p>' : '') +
        renderHistoryPromise(entry) +
        '<button type="button" class="history-delete-button" data-index="' + index + '">삭제</button>' +
        '</div>';
    }).join('');

    historyList.querySelectorAll('.history-delete-button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deleteReading(storage, Number(btn.dataset.index));
        renderHistory();
      });
    });
  }

  // 오늘의 한 장: 기기 ID와 날짜가 같으면 하루 종일 같은 카드가 나온다 (기록에는 저장하지 않음)
  function renderDailyCard(shared) {
    const body = document.getElementById('daily-card-body');
    if (!body) return;
    const day = shared ? shared.d : todayKey();
    const owner = shared ? shared.k : getDeviceId(storage);
    if (!shared) recordVisit(storage, day);
    const streak = shared ? 0 : getStreak(storage, day);
    const rng = createRng(['daily', owner, day]);
    const item = drawCards(deck, 1, rng)[0];
    const orientation = item.orientation;
    const label = orientation === 'upright' ? '정방향' : '역방향';
    activeRng = rng;
    const keywords = pickKeywords(item.card.keywords && item.card.keywords[orientation]);
    const advice = pickAdvice(item.card.advice && item.card.advice[orientation]);
    activeRng = Math.random;
    const slug = (typeof TAROT_SLUGS !== 'undefined') ? TAROT_SLUGS[item.card.cardId] : null;
    // 한 화면을 차지하지 않도록 이름·한 줄 조언만 보이고 나머지는 접어 둔다
    body.innerHTML =
      '<img class="daily-card-img' + (orientation === 'reversed' ? ' reversed' : '') + '" src="' + item.card.image + '" alt="' + escapeHtml(item.card.name) + '" width="64" height="110">' +
      '<div class="daily-card-text"><h3>' + escapeHtml(item.card.name) + ' <small>(' + label + ')</small></h3>' +
      '<p class="owner-intro">' + escapeHtml(getVoiceLine('daily', createRng(['voice-intro', 'daily', owner, day]))) + '</p>' +
      (advice ? '<p class="daily-advice">' + escapeHtml(advice) + '</p>' : '') +
      (streak >= 2 ? '<p class="streak">' + streak + '일 연속 방문 중이에요.</p>' : '') +
      '<details class="daily-more"><summary>키워드와 자세한 설명</summary>' +
      (keywords ? '<p>키워드: ' + escapeHtml(keywords.join(' · ')) + '</p>' : '') +
      (slug ? '<a class="card-detail-link" href="tarot/' + slug + '.html">이 카드 자세히 보기 →</a>' : '') +
      (shared ? '<p class="streak">친구가 공유한 오늘의 한 장이에요.</p>' : '<p class="editorial-meta">오늘 날짜와 이 기기를 기준으로 뽑았어요. 오늘은 계속 같은 카드이고, 내일이면 새 카드가 나옵니다.</p>') +
      '</details>' +
      '<button type="button" class="daily-share">이미지로 공유</button></div>';
    const dailyShare = body.querySelector('.daily-share');
    dailyShare.addEventListener('click', function () {
      const lead = (keywords ? '키워드: ' + keywords.join(' · ') + '. ' : '') + (advice || '');
      const spec = cardSpec(item.card.name + ' (' + label + ')', lead, [{ src: item.card.image, reversed: orientation === 'reversed' }]);
      spec.dateText = day.replace(/-/g, '. ');
      shareImageCard(spec, SITE_URL + buildShareHash({ kind: 'daily', k: owner, d: day }), dailyShare);
    });
  }

  // 결과 화면의 실천 안내 아래에 "약속하기"를 붙인다 (저장소를 못 쓰거나 실천 안내가 없으면 생략)
  function setupPromiseBox() {
    if (!storage || !currentEntryId || sharedView) return;
    const plan = summaryEl.querySelector('.practice-plan');
    if (!plan) return;
    const entryId = currentEntryId;
    const period = selectedPeriod;
    const defaultText = getPracticePlan(period, selectedCategory).focus;
    const days = PROMISE_DUE_DAYS[period] || 1;
    const box = document.createElement('div');
    box.className = 'promise-box';
    box.innerHTML = '<button type="button" class="promise-open">이 실천을 약속할게요</button>';
    plan.appendChild(box);
    box.querySelector('.promise-open').addEventListener('click', function () {
      box.innerHTML = '<label for="promise-input">나의 한 줄 약속</label>' +
        '<input type="text" id="promise-input" maxlength="80">' +
        '<button type="button" class="promise-save">약속하기</button>';
      const input = box.querySelector('input');
      input.value = defaultText;
      input.focus();
      box.querySelector('.promise-save').addEventListener('click', function () {
        const text = input.value.trim() || defaultText;
        updateReading(storage, entryId, {
          promise: { text: text, status: 'pending', dueDate: dueDateFor(period, todayKey()), answeredAt: null }
        });
        box.innerHTML = '<p class="promise-done">약속했어요 ✓ ' + (days === 1 ? '내일 ' : days + '일 뒤에 ') + '어땠는지 물어볼게요.</p>';
        renderPromiseCheck();
      });
    });
  }

  // 홈 화면: 확인일이 지난 약속을 묻는다
  function renderPromiseCheck() {
    const el = document.getElementById('promise-check');
    if (!el) return;
    const due = storage ? getDueEntries(getHistory(storage), todayKey()) : [];
    if (!due.length) {
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }
    el.classList.remove('hidden');
    el.innerHTML = '<p class="eyebrow">약속 확인</p><h2>지난번 약속, 해봤나요?</h2>' +
      due.map(function (entry) {
        return '<div class="promise-item" data-id="' + escapeHtml(entry.id) + '">' +
          '<p class="promise-text">“' + escapeHtml(entry.promise.text) + '”</p>' +
          '<div class="promise-actions">' +
          '<button type="button" data-status="done">했어요</button>' +
          '<button type="button" data-status="partial">조금 했어요</button>' +
          '<button type="button" data-status="skipped">못 했어요</button>' +
          '</div></div>';
      }).join('');
    el.querySelectorAll('.promise-item').forEach(function (item) {
      item.querySelectorAll('button').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const entry = getHistory(storage).find(function (e) { return e.id === item.dataset.id; });
          if (!entry || !entry.promise) return;
          updateReading(storage, entry.id, {
            promise: Object.assign({}, entry.promise, { status: btn.dataset.status, answeredAt: todayKey() })
          });
          item.innerHTML = '<p class="promise-reply">' + escapeHtml(PROMISE_REPLIES[btn.dataset.status]) + '</p>';
        });
      });
    });
  }

  // 공유 링크로 들어온 경우: 검증을 통과한 값으로만 같은 결과를 읽기 전용으로 보여준다
  function buildShareContext() {
    const ddiKeys = new Set();
    DDI_DATA.forEach(function (d) { ddiKeys.add(d.key); });
    const cardIds = new Set();
    deck.forEach(function (c) { cardIds.add(c.cardId); });
    return {
      cardIds: cardIds, categories: CATEGORY_LABELS, subchoices: CATEGORY_SUBCHOICES, periods: PERIOD_LABELS,
      zodiacKeys: new Set(Object.keys(ZODIAC_LABELS)), ddiKeys: ddiKeys
    };
  }

  function showSharedReading(shared) {
    selectedCategory = shared.c || null;
    selectedSubChoice = shared.b || null;
    selectedPeriod = shared.p;
    readingDateOverride = shared.d;
    variantOverride = shared.v === undefined ? null : shared.v;
    sharedView = true;
    currentQuestion = '';
    questionIntent = null;
    sharedBanner.classList.remove('hidden');
    newReadingButton.textContent = '나도 운세 보기';
    screenStart.classList.add('hidden');
    screenReading.classList.remove('hidden');
    cardsContainer.innerHTML = '';
    if (shared.kind === 'zodiac') {
      selectedZodiac = shared.z;
      showZodiacSummary();
    } else if (shared.kind === 'ddi') {
      let year = 2000;
      while (getDdiByYear(year).key !== shared.a) year += 1;
      selectedBirthYear = year;
      showDdiSummary();
    } else {
      currentTarotSeed = shared.k;
      selectedSpread = shared.cards.length;
      flippedCount = 0;
      historySaved = false;
      const draw = shared.cards.map(function (c) {
        return { card: deck.find(function (d) { return d.cardId === c.cardId; }), orientation: c.orientation };
      });
      renderCards(draw);
      cardsContainer.querySelectorAll('.card').forEach(function (el) { el.click(); });
    }
  }

  renderPromiseCheck();
  const sharedReading = parseShareHash(location.hash, buildShareContext());
  if (sharedReading && sharedReading.kind === 'daily') {
    renderDailyCard(sharedReading);
    document.getElementById('daily-card').scrollIntoView();
  } else {
    renderDailyCard();
    if (sharedReading) showSharedReading(sharedReading);
  }
})();
