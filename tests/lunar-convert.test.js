global.LUNAR_TABLE_DATA = require('../data/lunar-table.js').LUNAR_TABLE_DATA;

const assert = require('assert');
const { lunarToSolar, parseLunarDateText, getLunarLeapMonth } = require('../js/lunar-convert.js');

// 공개적으로 알려진 설날(음력 1월 1일, 평달) 양력 날짜와 대조
assert.deepStrictEqual(lunarToSolar(2024, 1, 1, false), { year: 2024, month: 2, day: 10 });
assert.deepStrictEqual(lunarToSolar(2026, 1, 1, false), { year: 2026, month: 2, day: 17 });

// 범위 밖(1000년 이전 base year 밖) 입력은 null
assert.strictEqual(lunarToSolar(999, 1, 1, false), null);
assert.strictEqual(lunarToSolar(2051, 1, 1, false), null);

// 2023년은 윤2월이 있는 해: 평2월과 윤2월은 다른 양력 날짜로 변환되어야 함
assert.deepStrictEqual(lunarToSolar(2023, 2, 15, false), { year: 2023, month: 3, day: 6 });
assert.deepStrictEqual(lunarToSolar(2023, 2, 15, true), { year: 2023, month: 4, day: 5 });

// 실제 존재하지 않는 음력 날짜(그 달의 실제 일수를 초과)는 null
assert.strictEqual(lunarToSolar(2024, 1, 31, false), null); // 2024년 음력 1월은 30일까지만 있음

// 음력 입력 글자: 아이폰 숫자 키패드에는 '-'가 없으므로 숫자만, 점, 빗금, 공백도 받는다
[['1990-02-15', [1990, 2, 15]], ['19900215', [1990, 2, 15]], ['1990.2.15', [1990, 2, 15]], ['1990. 2. 15.', [1990, 2, 15]],
  ['1990/02/05', [1990, 2, 5]], ['1990 2 5', [1990, 2, 5]], [' 1990년 2월 5일 ', [1990, 2, 5]]].forEach(function (c) {
  assert.deepStrictEqual(parseLunarDateText(c[0]), { year: c[1][0], month: c[1][1], day: c[1][2] }, c[0]);
});
['', '1990', '199002', '1990-2', 'abcd-ef-gh', '1990215', '90-02-15'].forEach(function (t) {
  assert.strictEqual(parseLunarDateText(t), null, 'reject ' + t);
});

// 그 해의 윤달 (없으면 0)
assert.strictEqual(getLunarLeapMonth(2023), 2);
assert.strictEqual(getLunarLeapMonth(2024), 0);
assert.strictEqual(getLunarLeapMonth(2025), 6);
assert.strictEqual(getLunarLeapMonth(2051), 0);

console.log('All lunar-convert tests passed');
