const HISTORY_KEY = 'tarot_history';

function getHistory(storage) {
  const raw = storage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function newEntryId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function saveReading(storage, entry) {
  const history = getHistory(storage);
  if (!entry.id) entry.id = newEntryId();
  history.unshift(entry);
  storage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

function updateReading(storage, id, patch) {
  const history = getHistory(storage);
  const target = history.find(function (item) { return item.id === id; });
  if (!target) return history;
  Object.assign(target, patch);
  storage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

function deleteReading(storage, index) {
  const history = getHistory(storage);
  history.splice(index, 1);
  storage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

function clearHistory(storage) {
  storage.setItem(HISTORY_KEY, JSON.stringify([]));
  return [];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getHistory, saveReading, updateReading, deleteReading, clearHistory, HISTORY_KEY };
}
