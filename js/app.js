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

  const CATEGORY_KEYWORDS = {
    love: ['연애', '사랑', '썸', '짝사랑', '고백', '이별', '결혼', '남자친구', '여자친구', '소개팅', '연인', '이성'],
    money: ['재물', '돈', '금전', '재정', '투자', '로또', '수입', '재테크', '사업자금', '지출', '용돈'],
    career: ['취업', '이직', '직장', '면접', '승진', '커리어', '사업', '일자리', '회사', '창업'],
    study: ['학업', '시험', '공부', '성적', '합격', '수능', '대학', '학점', '자격증'],
    health: ['건강', '컨디션', '다이어트', '병원', '몸살', '체력', '질병', '수술']
  };
  const CATEGORY_LABELS = { love: '연애운', money: '재물운', career: '취업운', study: '학업운', health: '건강운' };

  function detectCategory(text) {
    if (!text) return null;
    const found = Object.keys(CATEGORY_KEYWORDS).find(function (key) {
      return CATEGORY_KEYWORDS[key].some(function (kw) { return text.indexOf(kw) !== -1; });
    });
    return found || null;
  }

  const storage = getStorage();
  const deck = getFullDeck();
  let selectedSpread = 1;
  let flippedCount = 0;
  let historySaved = false;

  const screenStart = document.getElementById('screen-start');
  const screenReading = document.getElementById('screen-reading');
  const questionInput = document.getElementById('question-input');
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

  spreadButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      spreadButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedSpread = Number(btn.dataset.spread);
    });
  });

  drawButton.addEventListener('click', function () {
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
    const category = detectCategory(questionInput.value.trim());
    const heading = category ? CATEGORY_LABELS[category] + ' 리딩 요약' : '오늘의 리딩 요약';

    const details = draw.map(function (item) {
      const orientationLabel = item.orientation === 'upright' ? '정방향' : '역방향';
      const categoryReading = category && item.card.categories && item.card.categories[category];
      const meaning = categoryReading
        ? categoryReading[item.orientation]
        : (item.orientation === 'upright' ? item.card.upright : item.card.reversed);
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
      question: questionInput.value.trim(),
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
    questionInput.value = '';
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
      const cardsText = entry.cards.map(function (c) {
        return c.name + '(' + (c.orientation === 'upright' ? '정' : '역') + ')';
      }).join(', ');
      const dateText = new Date(entry.date).toLocaleString('ko-KR');
      const questionText = entry.question ? escapeHtml(entry.question) : '(질문 없음)';

      return '<div class="history-item">' +
        '<p class="history-date">' + dateText + '</p>' +
        '<p class="history-question">' + questionText + '</p>' +
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
