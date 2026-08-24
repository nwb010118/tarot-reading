global.LUNAR_TABLE_DATA = require('../data/lunar-table.js').LUNAR_TABLE_DATA;

const assert = require('assert');
const { lunarToSolar } = require('../js/lunar-convert.js');

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

console.log('All lunar-convert tests passed');
