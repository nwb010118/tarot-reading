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

  const CATEGORY_LABELS = {
    love: '연애운', money: '재물운', career: '취업운', workplace: '직장운', business: '사업운',
    study: '학업운', health: '건강운', relationships: '대인관계운', honor: '명예운',
    moving: '이사운', children: '자식운'
  };

  const PERIOD_LABELS = {
    today: '오늘', week: '이번주', month: '이번달', month3: '3개월', month6: '6개월', year: '1년'
  };

  const PERIOD_PREFIXES = {
    today: '오늘은',
    week: '이번 주 안에는',
    month: '이번 달 동안은',
    month3: '앞으로 3개월간은',
    month6: '앞으로 6개월간은',
    year: '올 한 해 동안은'
  };

  const ZODIAC_LABELS = {};
  getZodiacList().forEach(function (z) { ZODIAC_LABELS[z.key] = z.name_kr; });

  const MODE_BUTTON_LABELS = { tarot: '카드 뽑기', zodiac: '운세 보기', ddi: '운세 보기', saju: '운세 보기' };

  const storage = getStorage();
  const deck = getFullDeck();
  let selectedSpread = 1;
  let selectedCategory = null;
  let selectedPeriod = 'today';
  let selectedMode = 'tarot';
  let selectedZodiac = 'aries';
  let selectedBirthYear = null;
  let flippedCount = 0;
  let historySaved = false;
  let selectedCalendarType = 'solar';
  let selectedIntercalation = false;
  let selectedGender = 'male';
  let selectedTimeUnknown = false;

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
  const sajuDateInput = document.getElementById('saju-date-input');
  const sajuTimeInput = document.getElementById('saju-time-input');
  const timeUnknownCheckbox = document.getElementById('time-unknown-checkbox');
  const genderButtons = document.querySelectorAll('#gender-select .gender-btn');
  const sajuErrorEl = document.getElementById('saju-error');
  const categoryButtons = document.querySelectorAll('#category-select .category-btn');
  const periodButtons = document.querySelectorAll('#period-select .category-btn');
  const spreadSelect = document.getElementById('spread-select');
  const spreadButtons = document.querySelectorAll('.spread-btn');
  const drawButton = document.getElementById('draw-button');
  const cardsContainer = document.getElementById('cards-container');
  const summaryEl = document.getElementById('summary');
  const newReadingButton = document.getElementById('new-reading-button');
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
      spreadSelect.classList.toggle('hidden', selectedMode !== 'tarot');
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

  spreadButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      spreadButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedSpread = Number(btn.dataset.spread);
    });
  });

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

    const currentDraw = drawCards(deck, selectedSpread);
    flippedCount = 0;
    historySaved = false;

    renderCards(currentDraw);

    screenStart.classList.add('hidden');
    screenReading.classList.remove('hidden');
    summaryEl.classList.add('hidden');
    summaryEl.innerHTML = '';
    newReadingButton.classList.add('hidden');
  });

  function showZodiacSummary() {
    const zodiac = getZodiacByKey(selectedZodiac);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = zodiac.name_kr + ' · ' + PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩';

    const meaning = category && zodiac.categories[category]
      ? PERIOD_PREFIXES[period] + ' ' + zodiac.categories[category]
      : zodiac.trait;

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail"><p>' + meaning + '</p></div>';
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }

  function saveZodiacReading() {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'zodiac',
      zodiac: selectedZodiac,
      category: selectedCategory,
      period: selectedPeriod,
      cards: []
    };
    saveReading(storage, entry);
  }

  function showDdiSummary() {
    const ddi = getDdiByYear(selectedBirthYear);
    const category = selectedCategory;
    const period = selectedPeriod;
    const heading = ddi.name_kr + ' · ' + PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩';

    const meaning = category && ddi.categories[category]
      ? PERIOD_PREFIXES[period] + ' ' + ddi.categories[category]
      : ddi.trait;

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      '<div class="reading-detail"><p>' + meaning + '</p></div>';
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }

  function saveDdiReading() {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'ddi',
      birthYear: selectedBirthYear,
      category: selectedCategory,
      period: selectedPeriod,
      cards: []
    };
    saveReading(storage, entry);
  }

  // 입력을 검증하고 calculateSaju에 넘길 형태로 정규화. 실패 시 null을 반환하고 에러 메시지를 표시.
  function resolveSajuInput() {
    sajuErrorEl.classList.add('hidden');

    if (!sajuDateInput.value) {
      sajuErrorEl.textContent = '생년월일을 입력해주세요.';
      sajuErrorEl.classList.remove('hidden');
      return null;
    }
    if (!selectedTimeUnknown && !sajuTimeInput.value) {
      sajuErrorEl.textContent = '태어난 시각을 입력하거나 "시간을 몰라요"를 선택해주세요.';
      sajuErrorEl.classList.remove('hidden');
      return null;
    }

    const dateParts = sajuDateInput.value.split('-').map(Number);
    let year = dateParts[0];
    let month = dateParts[1];
    let day = dateParts[2];

    if (year < 1900 || year > 2050) {
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

  function pillarText(pillar) {
    return CHEONGAN[pillar.stemIdx] + JIJI[pillar.branchIdx];
  }

  function showSajuSummary(input, saju) {
    const category = selectedCategory;
    const period = selectedPeriod;
    const ilgan = getIlganByIndex(saju.day.stemIdx);
    const heading = ilgan.name_kr + ' 일간 · ' + PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩';

    const myeongsikRows = [
      { label: '년주', text: pillarText(saju.year) },
      { label: '월주', text: pillarText(saju.month) },
      { label: '일주', text: pillarText(saju.day) },
      { label: '시주', text: saju.hour ? pillarText(saju.hour) : '모름' }
    ];
    const myeongsikHtml = '<div class="myeongsik-table">' +
      myeongsikRows.map(function (row) {
        return '<div class="myeongsik-col"><span class="myeongsik-label">' + row.label + '</span><span class="myeongsik-value">' + row.text + '</span></div>';
      }).join('') +
      '</div>';

    const counts = getElementCounts(saju);
    const elementHtml = '<p class="element-summary">' +
      ['목', '화', '토', '금', '수'].map(function (el) { return el + counts[el]; }).join(' ') +
      '</p>';

    let daeunHtml = '';
    if (saju.hour) {
      const direction = getDaeunDirection(saju.year.stemIdx, selectedGender);
      const startAge = getDaeunStartAge(saju.instant, saju.monthOffset, direction);
      const daeunList = getDaeunList(saju.month.stemIdx, saju.month.branchIdx, direction, startAge);
      const today = new Date();
      const currentAge = today.getFullYear() - input.year + 1;
      daeunHtml = '<div class="daeun-table">' +
        daeunList.map(function (d) {
          const isCurrent = currentAge >= d.startAge && currentAge <= d.endAge;
          return '<div class="daeun-col' + (isCurrent ? ' current' : '') + '"><span class="daeun-ganji">' + CHEONGAN[d.stemIdx] + JIJI[d.branchIdx] + '</span><span class="daeun-age">' + d.startAge + '~' + d.endAge + '세</span></div>';
        }).join('') +
        '</div>';
    }

    const balance = classifyElementBalance(counts);
    const balanceText = getElementBalanceText(balance);
    const baseMeaning = category && ilgan.categories[category]
      ? PERIOD_PREFIXES[period] + ' ' + ilgan.categories[category]
      : ilgan.trait;
    const meaning = baseMeaning + ' ' + balanceText;

    summaryEl.innerHTML = '<h3>' + heading + '</h3>' +
      myeongsikHtml + elementHtml + daeunHtml +
      '<div class="reading-detail"><p>' + meaning + '</p></div>';
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
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
    const heading = PERIOD_LABELS[period] + ' ' + (category ? CATEGORY_LABELS[category] : '오늘의운') + ' 리딩 요약';

    const details = draw.map(function (item) {
      const orientationLabel = item.orientation === 'upright' ? '정방향' : '역방향';
      const categoryReading = category && item.card.categories && item.card.categories[category];
      const baseMeaning = categoryReading
        ? categoryReading[item.orientation]
        : (item.orientation === 'upright' ? item.card.upright : item.card.reversed);
      const meaning = PERIOD_PREFIXES[period] + ' ' + baseMeaning;
      return '<div class="reading-detail">' +
        '<h4>' + item.card.name + ' (' + orientationLabel + ')</h4>' +
        '<p>' + meaning + '</p>' +
        '</div>';
    });
    summaryEl.innerHTML = '<h3>' + heading + '</h3>' + details.join('');
    summaryEl.classList.remove('hidden');
    newReadingButton.classList.remove('hidden');
  }

  function saveCurrentReading(draw) {
    if (!storage) return;
    const entry = {
      date: new Date().toISOString(),
      mode: 'tarot',
      category: selectedCategory,
      period: selectedPeriod,
      spreadType: String(selectedSpread),
      cards: draw.map(function (item) {
        return { name: item.card.name, orientation: item.orientation };
      })
    };
    saveReading(storage, entry);
  }

  newReadingButton.addEventListener('click', function () {
    screenReading.classList.add('hidden');
    screenStart.classList.remove('hidden');
    categoryButtons.forEach(function (b) { b.classList.remove('selected'); });
    categoryButtons[0].classList.add('selected');
    selectedCategory = null;
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
    sajuDateInput.value = '';
    sajuTimeInput.value = '';
    sajuTimeInput.disabled = false;
    timeUnknownCheckbox.checked = false;
    selectedTimeUnknown = false;
    genderButtons.forEach(function (b) { b.classList.remove('selected'); });
    genderButtons[0].classList.add('selected');
    selectedGender = 'male';
    sajuErrorEl.classList.add('hidden');
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
        cardsText = entry.birthDate + ' ' + (entry.timeUnknown ? '(시간 모름)' : entry.birthTime) + ' · ' + entry.dayIlganName + ' 일간';
      } else {
        cardsText = entry.cards.map(function (c) {
          return c.name + '(' + (c.orientation === 'upright' ? '정' : '역') + ')';
        }).join(', ');
      }
      const dateText = new Date(entry.date).toLocaleString('ko-KR');
      const periodLabel = entry.period && PERIOD_LABELS[entry.period] ? PERIOD_LABELS[entry.period] : '오늘';
      const categoryLabel = entry.category && CATEGORY_LABELS[entry.category] ? CATEGORY_LABELS[entry.category] : '오늘의운';
      const topicText = escapeHtml(periodLabel + ' ' + categoryLabel);

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
