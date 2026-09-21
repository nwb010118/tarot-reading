const CATEGORY_LABELS = {
  love: '연애운', money: '재물운', career: '취업운', workplace: '직장운', business: '사업운',
  study: '학업운', health: '건강운', relationships: '대인관계운', honor: '명예운',
  moving: '이사운', children: '자식운'
};

const CATEGORY_SUBCHOICES = {
  love: [{ key: 'solo', label: '솔로' }, { key: 'couple', label: '커플' }],
  money: [{ key: 'consumption', label: '소비' }, { key: 'invest', label: '투자' }],
  career: [{ key: 'jobseek', label: '구직' }, { key: 'switch', label: '이직' }],
  business: [{ key: 'startup', label: '창업준비' }, { key: 'running', label: '운영중' }],
  study: [{ key: 'exam', label: '시험준비' }, { key: 'path', label: '진로고민' }],
  health: [{ key: 'body', label: '신체' }, { key: 'mind', label: '정신' }],
  relationships: [{ key: 'new', label: '새로운 인연' }, { key: 'existing', label: '기존 관계' }],
  workplace: [{ key: 'team', label: '팀워크' }, { key: 'personal', label: '개인성과' }]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CATEGORY_LABELS, CATEGORY_SUBCHOICES };
}
