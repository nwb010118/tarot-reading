// 시드 기반 난수: 같은 parts면 같은 수열을 돌려준다. 브라우저 전역과 Node 모두에서 쓴다.
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(parts) {
  let state = hashString(parts.map(function (p) { return String(p); }).join('|'));
  return function () {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function todayKey(now) {
  const d = now || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const DEVICE_ID_KEY = 'jeomjip_device_id';
let memoryDeviceId = null;

function getDeviceId(storage) {
  try {
    if (storage) {
      const saved = storage.getItem(DEVICE_ID_KEY);
      if (saved) return saved;
    }
  } catch (e) { /* 저장소를 못 읽으면 임시 ID로 대체 */ }
  if (!memoryDeviceId) {
    memoryDeviceId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  try {
    if (storage) storage.setItem(DEVICE_ID_KEY, memoryDeviceId);
  } catch (e) { /* 저장 실패는 무시 */ }
  return memoryDeviceId;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hashString, createRng, todayKey, getDeviceId, DEVICE_ID_KEY };
}
