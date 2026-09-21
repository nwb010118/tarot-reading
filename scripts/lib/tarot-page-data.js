// CATEGORY_LABELS / CATEGORY_SUBCHOICES의 유일한 출처는 data/category-labels.js (Step 0a).
// js/app.js도 동일한 파일을 전역으로 로드해서 쓴다 — 여기서 사본을 만들지 않는다.
const { CATEGORY_LABELS, CATEGORY_SUBCHOICES } = require('../../data/category-labels.js');

const SITE_BASE = 'https://nwb010118.github.io/tarot-reading/';

const CATEGORY_ORDER = [
  'love', 'money', 'career', 'workplace', 'business',
  'study', 'health', 'relationships', 'honor', 'moving', 'children'
];

const SUIT_LABEL_KR = { major: '메이저 아르카나', wands: '완드', cups: '컵', swords: '소드', pentacles: '펜타클' };

function slugifyMajorName(nameEn) {
  return nameEn
    .replace(/^The\s+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function slugify(deckCard) {
  if (deckCard.type === 'major') {
    const id = deckCard.cardId.split('_')[1];
    return 'major-' + id + '-' + slugifyMajorName(deckCard.nameEn);
  }
  const parts = deckCard.cardId.split('_');
  const suit = parts[0];
  const rank = parts[1];
  return suit + '-' + rank.toLowerCase();
}

function resolveCanonical(value) {
  if (typeof value === 'string') return value;
  return value.a[0] + ' ' + value.b[0];
}

function suitKeyOf(deckCard) {
  if (deckCard.type === 'major') return 'major';
  return deckCard.cardId.split('_')[0];
}

function buildOrientationView(entity, orientation) {
  const categories = CATEGORY_ORDER.map(function (categoryKey) {
    const catObj = entity.categories[categoryKey];
    const raw = catObj[orientation];
    const subchoices = CATEGORY_SUBCHOICES[categoryKey];
    const items = subchoices
      ? subchoices.map(function (sc) {
          return { subLabel: sc.label, text: resolveCanonical(raw[sc.key]) };
        })
      : [{ subLabel: null, text: resolveCanonical(raw) }];
    return { label: CATEGORY_LABELS[categoryKey], items: items };
  });

  return {
    keywords: entity.keywords[orientation],
    advice: entity.advice[orientation][0],
    categories: categories
  };
}

function buildCardViewModel(deckCard) {
  const suitKey = suitKeyOf(deckCard);
  const slug = slugify(deckCard);
  const titleName = deckCard.type === 'major' ? (deckCard.name + ' (' + deckCard.nameEn + ')') : deckCard.name;
  const upKeywordsPreview = deckCard.keywords.upright.slice(0, 3).join(', ');

  return {
    slug: slug,
    cardId: deckCard.cardId,
    type: deckCard.type,
    suitKey: suitKey,
    suitLabel: SUIT_LABEL_KR[suitKey],
    name: deckCard.name,
    nameEn: deckCard.type === 'major' ? deckCard.nameEn : null,
    image: deckCard.image,
    title: titleName + ' 카드 의미 — 정방향·역방향 키워드와 운세 | 점집',
    description: '타로 ' + deckCard.name + ' 카드의 정방향·역방향 의미와 키워드(' + upKeywordsPreview + '), 조언, 연애·재물·직장 등 상황별 운세를 확인해보세요.',
    upright: buildOrientationView(deckCard, 'upright'),
    reversed: buildOrientationView(deckCard, 'reversed'),
    canonicalUrl: SITE_BASE + 'tarot/' + slug + '.html'
  };
}

module.exports = {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CATEGORY_SUBCHOICES,
  SUIT_LABEL_KR,
  SITE_BASE,
  slugify,
  resolveCanonical,
  buildCardViewModel
};
