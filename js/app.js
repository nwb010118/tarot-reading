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
    today: '오늘', week: '이번주', month: '이번달', month3: '3개월', month6: '6개월', year: '1년'
  };

  const ZODIAC_LABELS = {};
  getZodiacList().forEach(function (z) { ZODIAC_LABELS[z.key] = z.name_kr; });

  const COMPAT_SUBTYPE_LABELS = { zodiac: '별자리 궁합', ddi: '띠 궁합', saju: '사주 궁합' };

  const MODE_BUTTON_LABELS = { tarot: '카드 뽑기', zodiac: '운세 보기', ddi: '운세 보기', saju: '운세 보기', compatibility: '궁합 보기' };

  const storage = getStorage();
  const deck = getFullDeck();
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

  birthYearInput.addEventListener('input', function () {
    const year = Number(birthYearInput.value);
    if (!year || year < 1900 || year > 2100) {
      selectedBirthYear = null;
      ddiResultEl.classList.add('hidden');
      return;
    }
    selectedBirthYear = year;
    const ddi = getDdiByYear(year);
    ddiResultEl.textContent = year + '년생 → ' + ddi.name_kr;
    ddiResultEl.classList.remove('hidden');
  });

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

  function resolveSubchoiceValue(category, value, selectedSubChoice) {
    return (CATEGORY_SUBCHOICES[category] && typeof value === 'object')
      ? value[selectedSubChoice]
      : value;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function resolveMeaningText(value) {
    return (typeof value === 'string') ? value : (pickRandom(value.a) + ' ' + pickRandom(value.b));
  }

  function pickKeywords(keywordsPool, count) {
    count = count || 3;
    if (!keywordsPool || keywordsPool.length <= count) return keywordsPool;
    const shuffled = keywordsPool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
    }
    return shuffled.slice(0, count);
  }

  function pickAdvice(advicePool) {
    return Array.isArray(advicePool) ? pickRandom(advicePool) : advicePool;
  }

  function resolveCategoryMeaning(entity, category, period, selectedSubChoice) {
    const sensitive = getSensitiveReading(category, selectedSubChoice, entity.keywords);
    if (sensitive) return sensitive;
    if (category && entity.categories[category]) {
      const readingText = resolveSubchoiceValue(category, entity.categories[category], selectedSubChoice);
      return resolveMeaningText(readingText);
    }
    return resolveMeaningText(entity.trait);
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
      return;
    }

    if (selectedMode === 'ddi') {
      if (!selectedBirthYear) {
        birthYearInput.focus();
        return;
      }
      cardsContainer.innerHTML = '';
      screenStart.classList.add('hidden');
      screenReading.classList.remove('hidden');
      showDdiSummary();
      saveDdiReading();
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
      return;
    }

    if (selectedMode === 'compatibility') {
      let label1, label2, tier;
      let saju1, saju2;
      if (selectedCompatSubtype === 'zodiac') {
        label1 = getZodiacByKey(selectedCompatZodiac1).name_kr;
        label2 = getZodiacByKey(selectedCompatZodiac2).name_kr;
        tier = getZodiacCompatibility(selectedCompatZodiac1, selectedCompatZodiac2);
      } else if (selectedCompatSubtype === 'ddi') {
        const input = resolveCompatDdiInput();
        if (!input) return;
        label1 = input.year1 + '년생 ' + getDdiByYear(input.year1).name_kr;
        label2 = input.year2 + '년생 ' + getDdiByYear(input.year2).name_kr;
        tier = getDdiCompatibility(input.year1, input.year2);
      } else {
        const input = resolveCompatSajuInput();
        if (!input) return;
        const sajuResult = getSajuCompatibility(input.date1, input.date2);
        label1 = sajuResult.ilganName1 + ' 일간';
        label2 = sajuResult.ilganName2 + ' 일간';
        tier = sajuResult.tier;
        saju1 = sajuResult.saju1;
        saju2 = sajuResult.saju2;
      }
      const tierInfo = getCompatTierInfo(tier, label1, label2);
      cardsContainer.innerHTML = '';
      screenStart.classList.add('hidden');
      screenReading.classList.remove('hidden');
      showCompatibilitySummary(label1, label2, tierInfo, saju1, saju2);
      saveCompatibilityReading(selectedCompatSubtype, label1, label2, tierInfo);
      return;
    }

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
  });

  function renderReadingMeaning(meaning) {
    const boundary = meaning.search(/[.!?](?:\s|$)/);
    const lead = boundary < 0 ? meaning : meaning.slice(0, boundary + 1);
    const rest = boundary < 0 ? '' : meaning.slice(boundary + 1).trim();
    return '<p class="reading-lead-label">이번 리딩의 한마디</p>' +
      '<p class="reading-lead">' + escapeHtml(lead) + '</p>' +
      (rest ? '<p class="reading-body">' + escapeHtml(rest) + '</p>' : '');
  }

  function renderPracticePlan() {
    const plan = getPracticePlan(selectedPeriod, selectedCategory);
    return '<aside class="practice-plan"><h4>' + escapeHtml(plan.label) + ' 실천 안내</h4><p>' +
      escapeHtml(plan.focus) + '</p><p>' + escapeHtml(plan.schedule) +
      '</p><p class="editorial-meta">선택한 기간은 실천과 회고를 위한 기간입니다. 사건이 일어날 시점을 예측하지 않습니다. 리딩 문장은 준비된 해석 중 무작위로 선택됩니다.</p></aside>';
  }

  function showZodiacSummary() {
    const zodiac = getZodiacByKey(selectedZodiac);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = zodiac.name_kr + ' · ' + (category ? CATEGORY_LABELS[category] : '운세') + ' 리딩';

    const meaning = resolveCategoryMeaning(zodiac, category, period, selectedSubChoice);
    const extraHtml = renderKeywordsAdviceHtml(zodiac.keywords, zodiac.advice);

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail">' + renderReadingMeaning(meaning) + '</div>' +
      extraHtml + renderPracticePlan();
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
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
    saveReading(storage, entry);
  }

  function showDdiSummary() {
    const ddi = getDdiByYear(selectedBirthYear);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = ddi.name_kr + ' · ' + (category ? CATEGORY_LABELS[category] : '운세') + ' 리딩';

    const meaning = resolveCategoryMeaning(ddi, category, period, selectedSubChoice);
    const extraHtml = renderKeywordsAdviceHtml(ddi.keywords, ddi.advice);

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail">' + renderReadingMeaning(meaning) + '</div>' +
      extraHtml + renderPracticePlan();
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
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
    saveReading(storage, entry);
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
    const year1 = Number(compatDdiYear1Input.value);
    const year2 = Number(compatDdiYear2Input.value);
    if (!compatDdiYear1Input.value || !year1 || year1 < 1900 || year1 > 2100) {
      compatErrorEl.textContent = '사람 1의 태어난 연도를 1900~2100년 사이로 입력해주세요.';
      compatErrorEl.classList.remove('hidden');
      return null;
    }
    if (!compatDdiYear2Input.value || !year2 || year2 < 1900 || year2 > 2100) {
      compatErrorEl.textContent = '사람 2의 태어난 연도를 1900~2100년 사이로 입력해주세요.';
      compatErrorEl.classList.remove('hidden');
      return null;
    }
    return { year1: year1, year2: year2 };
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

  function showSajuSummary(input, saju) {
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
    const meaning = resolveCategoryMeaning(ilgan, category, period, selectedSubChoice) + ' ' + balanceText;

    const extraHtml = renderKeywordsAdviceHtml(ilgan.keywords, ilgan.advice);

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail">' + renderReadingMeaning(meaning) + '</div>' +
      myeongsikHtml + elementHtml +
      (daeunHtml ? '<details class="fortune-tables"><summary>대운 · 세운 · 월운 자세히 보기</summary>' + daeunHtml + seunHtml + wolunHtml + '</details>' : '') +
      extraHtml + renderPracticePlan();
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
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
    saveReading(storage, entry);
  }

  function showCompatibilitySummary(label1, label2, tierInfo, saju1, saju2) {
    const heading = label1 + ' × ' + label2 + ' 궁합';
    const extraHtml = renderKeywordsAdviceHtml(tierInfo.keywords, tierInfo.advice);
    const chartsHtml = saju1 && saju2 ?
      '<h5 class="table-label">사람 1</h5>' + renderMyeongsikDetailTable(saju1) +
      '<h5 class="table-label">사람 2</h5>' + renderMyeongsikDetailTable(saju2) : '';
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<p class="compat-score">' + tierInfo.score + '%</p>' +
      '<p class="compat-tier-label">' + tierInfo.tierLabel + '</p>' +
      '<div class="reading-detail">' + renderReadingMeaning(tierInfo.text) + '</div>' +
      extraHtml + chartsHtml;
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
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
      score: tierInfo.score,
      cards: []
    };
    saveReading(storage, entry);
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
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = (category ? CATEGORY_LABELS[category] : '운세') + ' 리딩 요약';

    const details = draw.map(function (item) {
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
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' + details.join('') + renderPracticePlan();
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
    shareButton.classList.remove('hidden');
  }

  function saveCurrentReading(draw) {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'tarot',
      category: selectedCategory,
      period: selectedPeriod,
      subChoice: selectedSubChoice,
      spreadType: String(selectedSpread),
      cards: draw.map(function (item) {
        return { name: item.card.name, orientation: item.orientation };
      })
    };
    saveReading(storage, entry);
  }

  const SHARE_SELECTOR = 'h3, h4, .compat-score, .compat-tier-label, .reading-lead, .reading-body, .card-keywords, .card-advice, .practice-plan p';
  const SITE_URL = 'https://nwb010118.github.io/tarot-reading/';
  const SHARE_BUTTON_LABEL = '공유하기';

  function buildShareText() {
    const parts = Array.prototype.map.call(
      summaryEl.querySelectorAll(SHARE_SELECTOR),
      function (el) { return el.textContent.trim(); }
    );
    return parts.join('\n\n') + '\n\n점집에서 나도 운세 보러 가기\n' + SITE_URL;
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

  newReadingButton.addEventListener('click', function () {
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
        cardsText = escapeHtml(entry.person1Label + ' × ' + entry.person2Label + ' · ' + entry.score + '%');
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
})();
