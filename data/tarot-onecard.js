// 원카드 타로 보강 문구를 한 객체로 합친다. 슈트별 파일(tarot-onecard-*.js)을 먼저 불러온 뒤 로드한다.
const TAROT_ONECARD = Object.assign({}, TAROT_ONECARD_MAJOR, TAROT_ONECARD_WANDS, TAROT_ONECARD_CUPS, TAROT_ONECARD_SWORDS, TAROT_ONECARD_PENTACLES);
