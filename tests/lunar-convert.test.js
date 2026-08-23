require('../data/lunar-table.js');
global.LUNAR_TABLE_DATA = require('../data/lunar-table.js').LUNAR_TABLE_DATA;

const assert = require('assert');
const { lunarToSolar } = require('../js/lunar-convert.js');

// 공개적으로 알려진 설날(음력 1월 1일, 평달) 양력 날짜와 대조
assert.deepStrictEqual(lunarToSolar(2024, 1, 1, false), { year: 2024, month: 2, day: 10 });
assert.deepStrictEqual(lunarToSolar(2026, 1, 1, false), { year: 2026, month: 2, day: 17 });

// 범위 밖(1000년 이전 base year 밖) 입력은 null
assert.strictEqual(lunarToSolar(999, 1, 1, false), null);
assert.strictEqual(lunarToSolar(2051, 1, 1, false), null);

console.log('All lunar-convert tests passed');
