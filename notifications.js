// notifications.js — Push notification scheduling for 6am, 12pm, 6pm

export const BELL_HOURS = [6, 12, 18];

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') {
    await tryRegisterPeriodicSync();
    return 'granted';
  }
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  if (result === 'granted') await tryRegisterPeriodicSync();
  return result;
}

async function tryRegisterPeriodicSync() {
  if (!('serviceWorker' in navigator)) return;
  if (!('periodicSync' in ServiceWorkerRegistration.prototype)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    // minInterval: 6 hours — browser may fire less frequently
    await reg.periodicSync.register('angelus-bell', { minInterval: 6 * 60 * 60 * 1000 });
  } catch { /* permission denied or not supported — setTimeout path handles it */ }
}

export function getPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function getSchedule() {
  try {
    const schedule = JSON.parse(localStorage.getItem('angelus_notif'));
    if (!schedule) return { enabled: false, hours: [...BELL_HOURS] };
    const hours = Array.isArray(schedule.hours)
      ? schedule.hours.filter(hour => BELL_HOURS.includes(hour))
      : [...BELL_HOURS];
    return { enabled: Boolean(schedule.enabled), hours };
  } catch { return { enabled: false, hours: [...BELL_HOURS] }; }
}

export function saveSchedule(schedule) {
  localStorage.setItem('angelus_notif', JSON.stringify(schedule));
}

// Schedule via periodic background sync or fallback to setTimeout for current session
export function scheduleSessionAlarms(onBell) {
  const schedule = getSchedule();
  if (!schedule.enabled) return [];
  const timers = [];
  const scheduleHour = hour => {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const ms = next - now;
    const id = setTimeout(() => {
      showNotification(hour);
      if (onBell) onBell(hour);
      scheduleHour(hour);
    }, ms);
    timers.push(id);
  };
  schedule.hours.forEach(scheduleHour);
  return timers;
}

export function showNotification(hour) {
  if (Notification.permission !== 'granted') return;
  const labels = { 6: 'Morning Angelus', 12: 'Midday Angelus', 18: 'Evening Angelus' };
  const label = labels[hour] || 'Angelus';
  new Notification(label, {
    body: 'The angel of the Lord declared unto Mary…',
    icon: './icons/icon-192.png',
    badge: './icons/badge-72.png',
    tag: `angelus-bell-${hour}`,
    renotify: true,
    silent: false
  });
}

export function clearTimers(timers = []) {
  timers.forEach(id => clearTimeout(id));
}
