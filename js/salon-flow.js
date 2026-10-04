/* Progressive enhancement: the original form remains usable without this layer. */
(function () {
  const app = document.getElementById('app');
  const choice = document.getElementById('flow-choice');
  const details = document.getElementById('flow-details');
  const modes = Array.from(document.querySelectorAll('.mode-btn'));
  const showcase = document.querySelector('.reading-showcase');
  const hero = document.querySelector('.free-hero');
  const mobile = window.matchMedia('(max-width: 700px)');
  function placeShowcase() {
    if (mobile.matches) document.getElementById('screen-start').after(showcase);
    else hero.appendChild(showcase);
  }
  mobile.addEventListener('change', placeShowcase);
  placeShowcase();
  const heading = document.createElement('div');
  heading.className = 'flow-heading';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'flow-back';
  back.textContent = '← 운세 다시 선택';
  const title = document.createElement('h2');
  title.tabIndex = -1;
  const hint = document.createElement('p');
  heading.append(back, title, hint);
  details.prepend(heading);
  // 실천 기간·스프레드를 고를 수 있다는 걸 알 수 있도록 접지 않고 항상 펼쳐 둔다
  const options = document.createElement('div');
  options.className = 'reading-options';
  const optionSummary = document.createElement('p');
  optionSummary.className = 'reading-options-title';
  options.appendChild(optionSummary);
  const period = document.getElementById('period-section');
  const spread = document.getElementById('spread-select');
  period.before(options);
  options.append(period, spread);
  const periodHint = document.createElement('p');
  periodHint.className = 'option-hint';
  periodHint.textContent = '기본 리딩은 오늘의 실천 안내를 제공합니다. 주제를 고르면 실천 기간도 바꿀 수 있어요.';
  period.prepend(periodHint);
  function syncOptions() {
    const mode = selected().dataset.mode;
    const periodLabel = document.querySelector('#period-select .selected').textContent;
    const spreadLabel = document.querySelector('#spread-select .selected').textContent;
    optionSummary.textContent = '실천 기간 · ' + periodLabel + (mode === 'tarot' ? ' · ' + spreadLabel : '');
    options.hidden = mode === 'compatibility';
    periodHint.hidden = Boolean(document.querySelector('#category-select .selected').dataset.category);
  }
  function selected() { return modes.find(button => button.classList.contains('selected')); }
  function syncMode() {
    const button = selected();
    const name = button.querySelector('strong').textContent;
    title.textContent = name + ' · 나의 이야기';
    hint.textContent = button.dataset.mode === 'compatibility'
      ? '두 사람의 정보를 선택하고, 서로의 흐름을 만나보세요.'
      : '궁금한 주제를 골라주세요. 고민이 없다면 오늘의 운으로 시작해도 좋아요.';
    modes.forEach(mode => mode.setAttribute('aria-pressed', String(mode === button)));
    syncOptions();
  }
  function setStep(detail, focus) {
    choice.hidden = detail;
    details.hidden = !detail;
    app.classList.toggle('in-consultation', detail);
    if (focus) {
      (detail ? title : selected()).focus();
      document.getElementById('screen-start').scrollIntoView({block: 'start', behavior: 'instant'});
    }
  }
  // 한 페이지 안의 화면 전환(선택 → 입력 → 결과)을 브라우저 기록에 남겨 뒤로 가기가 직전 화면으로 가게 한다.
  // gmDepth는 이 페이지가 쌓은 기록 수라서, 처음 화면으로 돌아갈 때 그만큼만 되감는다.
  const screenStart = document.getElementById('screen-start');
  const reading = document.getElementById('screen-reading');
  function depth() { return (history.state && history.state.gmDepth) || 0; }
  function pushScreen(screen) {
    history.pushState({ gmScreen: screen, gmDepth: depth() + 1 }, '');
  }
  function rewindToStart() {
    if (depth() > 0) history.go(-depth());
  }
  function showScreen(screen) {
    const hasResult = document.getElementById('summary').innerHTML || document.getElementById('cards-container').innerHTML;
    const canShowReading = screen === 'reading' && Boolean(hasResult);
    reading.classList.toggle('hidden', !canShowReading);
    screenStart.classList.toggle('hidden', Boolean(canShowReading));
    if (!canShowReading) setStep(screen === 'details' || screen === 'reading', false);
    (canShowReading ? reading : screenStart).scrollIntoView({block: 'start', behavior: 'instant'});
  }
  window.addEventListener('popstate', event => showScreen(event.state && event.state.gmScreen));
  modes.forEach(button => button.addEventListener('click', () => {
    syncMode();
    setStep(true, true);
    pushScreen('details');
  }));
  document.querySelectorAll('#category-select button, #period-select button, #spread-select button').forEach(button => button.addEventListener('click', syncOptions));
  back.addEventListener('click', () => {
    setStep(false, true);
    rewindToStart();
  });
  document.getElementById('new-reading-button').addEventListener('click', () => {
    setStep(false, true);
    rewindToStart();
  });
  // 결과는 항상 맨 위부터 보여준다 (입력 오류로 결과 화면이 안 열렸으면 그대로 둔다)
  document.getElementById('draw-button').addEventListener('click', () => {
    if (reading.classList.contains('hidden')) return;
    pushScreen('reading');
    reading.scrollIntoView({block: 'start', behavior: 'instant'});
  });
  const actions = document.createElement('div');
  actions.className = 'reading-top-actions';
  [['공유하기', 'share-button'], ['새 리딩 시작', 'new-reading-button']].forEach(([label, id]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => document.getElementById(id).click());
    actions.appendChild(button);
    if (id === 'share-button') {
      button.setAttribute('aria-live', 'polite');
      const source = document.getElementById(id);
      new MutationObserver(() => { button.textContent = source.textContent; })
        .observe(source, { childList: true, characterData: true, subtree: true });
    }
  });
  reading.prepend(actions);
  syncMode();
  setStep(false, false);
})();
