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

function saveReading(storage, entry) {
  const history = getHistory(storage);
  history.unshift(entry);
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
  module.exports = { getHistory, saveReading, deleteReading, clearHistory, HISTORY_KEY };
}
