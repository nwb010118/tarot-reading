// 공유 링크 만들기/해석/검증과 이미지 카드용 줄바꿈. DOM에 의존하지 않는다.
const SHARE_KINDS = ['tarot', 'zodiac', 'ddi', 'daily'];
const SHARE_SAFE_TOKEN = /^[A-Za-z0-9_-]{1,40}$/;
const SHARE_DATE = /^\d{4}-\d{2}-\d{2}$/;

function buildShareHash(params) {
  const search = new URLSearchParams();
  Object.keys(params).forEach(function (key) {
    const value = params[key];
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value));
  });
  return '#share=' + encodeURIComponent(params.kind) + '&' + search.toString().replace(/(^|&)kind=[^&]*&?/, '$1').replace(/&$/, '');
}

// 검증된 값만 돌려준다. 하나라도 허용 목록에 없으면 null.
// ctx: { cardIds:Set, categories:{}, subchoices:{}, periods:{}, zodiacKeys:Set, ddiKeys:Set }
function parseShareHash(hash, ctx) {
  if (!hash || hash.charAt(0) !== '#') return null;
  const search = new URLSearchParams(hash.slice(1));
  const kind = search.get('share');
  if (SHARE_KINDS.indexOf(kind) === -1) return null;

  const date = search.get('d');
  if (!date || !SHARE_DATE.test(date)) return null;
  const result = { kind: kind, d: date };

  if (kind === 'daily') {
    const k = search.get('k');
    if (!k || !SHARE_SAFE_TOKEN.test(k)) return null;
    result.k = k;
    return result;
  }

  const category = search.get('c');
  if (category) {
    if (!Object.prototype.hasOwnProperty.call(ctx.categories, category)) return null;
    result.c = category;
  } else {
    result.c = null;
  }
  const sub = search.get('b');
  if (sub) {
    const options = ctx.subchoices[result.c];
    if (!options || !options.some(function (o) { return o.key === sub; })) return null;
    result.b = sub;
  } else {
    result.b = null;
  }
  const period = search.get('p');
  if (!period || !Object.prototype.hasOwnProperty.call(ctx.periods, period)) return null;
  result.p = period;

  if (kind === 'zodiac') {
    const z = search.get('z');
    if (!z || !ctx.zodiacKeys.has(z)) return null;
    result.z = z;
  } else if (kind === 'ddi') {
    const a = search.get('a');
    if (!a || !ctx.ddiKeys.has(a)) return null;
    result.a = a;
  } else {
    const k = search.get('k');
    if (!k || !SHARE_SAFE_TOKEN.test(k)) return null;
    result.k = k;
    const raw = (search.get('cards') || '').split(',');
    if (raw.length < 1 || raw.length > 3) return null;
    const cards = [];
    for (let i = 0; i < raw.length; i += 1) {
      const parts = raw[i].split('.');
      if (parts.length !== 2 || !ctx.cardIds.has(parts[0]) || (parts[1] !== 'u' && parts[1] !== 'r')) return null;
      cards.push({ cardId: parts[0], orientation: parts[1] === 'u' ? 'upright' : 'reversed' });
    }
    result.cards = cards;
  }
  return result;
}

// measure(text) => 픽셀 폭. 한글은 글자 단위로 자르고, 넘치면 마지막 줄을 말줄임표로 닫는다.
function wrapText(measure, text, maxWidth, maxLines) {
  const lines = [];
  let line = '';
  const chars = Array.from(String(text).replace(/\s+/g, ' ').trim());
  for (let i = 0; i < chars.length; i += 1) {
    const next = line + chars[i];
    if (line && measure(next) > maxWidth) {
      lines.push(line.trim());
      line = chars[i] === ' ' ? '' : chars[i];
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trim());
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last.length > 1 && measure(last + '…') > maxWidth) last = last.slice(0, -1);
  kept[maxLines - 1] = last + '…';
  return kept;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildShareHash, parseShareHash, wrapText, SHARE_KINDS };
}
