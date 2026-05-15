// streaks.js — Subtle streak tracking via localStorage

const KEY = 'angelus_streak';
const HISTORY_KEY = 'angelus_history';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function recordPrayer() {
  const data = load();
  const t = today();
  if (data.lastDate === t) return data; // already prayed today
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  data.streak = data.lastDate === yStr ? data.streak + 1 : 1;
  data.lastDate = t;
  data.total = (data.total || 0) + 1;
  save(data);
  saveHistory(t);
  return data;
}

export function getStreak() {
  return load();
}

export function hasPrayedToday() {
  return load().lastDate === today();
}

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
  } catch { return {}; }
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { streak: 0, lastDate: null, total: 0 };
  } catch { return { streak: 0, lastDate: null, total: 0 }; }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function saveHistory(dateStr) {
  const h = getHistory();
  h[dateStr] = true;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}
