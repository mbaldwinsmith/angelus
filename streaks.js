// streaks.js — Subtle streak tracking via localStorage

const KEY = 'angelus_streak';

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
  return data;
}

export function getStreak() {
  return load();
}

export function hasPrayedToday() {
  return load().lastDate === today();
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { streak: 0, lastDate: null, total: 0 };
  } catch { return { streak: 0, lastDate: null, total: 0 }; }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
