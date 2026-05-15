// intentions.js — Per-day prayer intentions

const KEY = 'angelus_intentions';

export function getIntention(dateStr) {
  return load()[dateStr] || '';
}

export function saveIntention(dateStr, text) {
  const data = load();
  if (text) {
    data[dateStr] = text;
  } else {
    delete data[dateStr];
  }
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function pruneIntentions() {
  const data = load();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const pruned = Object.fromEntries(
    Object.entries(data).filter(([date]) => date >= cutoffStr)
  );
  localStorage.setItem(KEY, JSON.stringify(pruned));
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch { return {}; }
}
