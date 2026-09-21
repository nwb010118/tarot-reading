/* Progressive enhancement: the original form remains usable without this layer. */
(function () {
  const app = document.getElementById('app');
  const choice = document.getElementById('flow-choice');
  const details = document.getElementById('flow-details');
  const modes = Array.from(document.querySelectorAll('.mode-btn'));
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'flow-next';
  choice.appendChild(next);
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
  const options = document.createElement('details');
  options.className = 'reading-options';
  const optionSummary = document.createElement('summary');
  options.appendChild(optionSummary);
  const period = document.getElementById('period-section');
  const spread = document.getElementById('spread-select');
  period.before(options);
  options.append(period, spread);
  const periodHint = document.createElement('p');
  periodHint.className = 'option-hint';
  periodHint.textContent = '오늘의 운은 오늘 기준으로 봅니다. 다른 주제를 고르면 기간도 바꿀 수 있어요.';
  period.prepend(periodHint);
  function syncOptions() {
    const mode = selected().dataset.mode;
    const periodLabel = document.querySelector('#period-select .selected').textContent;
    const spreadLabel = document.querySelector('#spread-select .selected').textContent;
    optionSummary.textContent = '추가 설정 · ' + periodLabel + (mode === 'tarot' ? ' · ' + spreadLabel : '');
    options.hidden = mode === 'compatibility';
    periodHint.hidden = Boolean(document.querySelector('#category-select .selected').dataset.category);
  }
  function selected() { return modes.find(button => button.classList.contains('selected')); }
  function syncMode() {
    const button = selected();
    const name = button.querySelector('strong').textContent;
    next.textContent = name + ' 보러 가기';
    title.textContent = name + ' · 나의 이야기';
    hint.textContent = button.dataset.mode === 'compatibility'
      ? '두 사람의 정보를 선택하고, 서로의 흐름을 만나보세요.'
      : '궁금한 주제를 골라주세요. 고민이 없다면 오늘의 운으로 시작해도 좋아요.';
    modes.forEach(mode => mode.setAttribute('aria-pressed', String(mode === button)));
    options.open = false;
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
  modes.forEach(button => button.addEventListener('click', syncMode));
  document.querySelectorAll('#category-select button, #period-select button, #spread-select button').forEach(button => button.addEventListener('click', syncOptions));
  next.addEventListener('click', () => setStep(true, true));
  back.addEventListener('click', () => setStep(false, true));
  document.getElementById('new-reading-button').addEventListener('click', () => setStep(false, true));
  syncMode();
  setStep(false, false);
})();
