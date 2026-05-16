// app.js — Main application module (no build, vanilla ES modules)
import { angelus, reginaCoeli, getSeason, SEASON_LABELS, PRAYER_MODES } from './prayers.js';
import { recordPrayer, getStreak, hasPrayedToday, getHistory, migrateHistoryFromStreak } from './streaks.js';
import { requestPermission, getPermission, getSchedule, saveSchedule, scheduleSessionAlarms, clearTimers } from './notifications.js';
import { speak, speakLatin, stop, isSupported as audioSupported, isSpeaking } from './audio.js';
import { getIntention, saveIntention, pruneIntentions } from './intentions.js';

// ── State ──────────────────────────────────────────
const state = {
  mode: localStorage.getItem('angelus_mode') || 'traditional',
  theme: localStorage.getItem('angelus_theme') || 'system',
  bellPopupOpen: false,
  audioOn: false,
  timers: [],
  calendarOpen: false,
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  installPrompt: null,
};

// ── DOM refs ───────────────────────────────────────
const $ = id => document.getElementById(id);
const app = $('app');

// ── Bell popup management ──────────────────────────
let _bellCloseHandler = null;
let _bellKeyHandler = null;

// ── PWA install prompt ─────────────────────────────
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  state.installPrompt = e;
  renderControls();
});
window.addEventListener('appinstalled', () => {
  state.installPrompt = null;
  renderControls();
});

function isIosSafari() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    && !navigator.userAgent.includes('CriOS') && !navigator.userAgent.includes('FxiOS');
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
}

async function triggerInstall() {
  if (!state.installPrompt) return;
  state.installPrompt.prompt();
  const { outcome } = await state.installPrompt.userChoice;
  if (outcome === 'accepted') { state.installPrompt = null; renderControls(); }
}

// ── Init ───────────────────────────────────────────
function init() {
  migrateHistoryFromStreak();
  pruneIntentions();
  applyTheme(state.theme);
  renderHeader();
  renderControls();
  renderPrayer();
  renderIntention();
  renderStreak();
  renderCalendar();
  refreshNotificationTimers();
  // Service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function refreshNotificationTimers() {
  clearTimers(state.timers);
  state.timers = scheduleSessionAlarms(() => {
    renderHeader(); // refresh time badge
  });
}

// ── Theme ──────────────────────────────────────────
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

function getResolvedTheme() {
  if (state.theme === 'light') return 'light';
  if (state.theme === 'dark') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function toggleTheme() {
  state.theme = getResolvedTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem('angelus_theme', state.theme);
  applyTheme(state.theme);
  renderControls();
}

// ── Header ─────────────────────────────────────────
function renderHeader() {
  let el = $('main-header');
  if (!el) { el = document.createElement('header'); el.id = 'main-header'; app.prepend(el); }
  const h = new Date().getHours();
  const timeLabel = h < 12 ? 'Morning · 6am' : h < 17 ? 'Midday · 12pm' : 'Evening · 6pm';
  const season = getSeason();
  document.body.dataset.season = season;
  el.innerHTML = `
    <div class="header-rule"><span>✦</span></div>
    <h1>Angelus</h1>
    <p class="subtitle">${SEASON_LABELS[season]}</p>
    <span class="time-badge">${timeLabel}</span>
  `;
}

// ── Controls bar ───────────────────────────────────
function renderControls() {
  let el = $('controls-bar');
  if (!el) { el = document.createElement('div'); el.id = 'controls-bar'; el.className = 'controls'; app.appendChild(el); }
  const audioBtn = audioSupported()
    ? `<button class="icon-btn${state.audioOn ? ' active' : ''}" id="btn-audio" title="Toggle narration" aria-label="Toggle audio narration">${state.audioOn ? '🔊' : '🔈'}</button>`
    : '';
  const showInstall = !isInStandaloneMode() && (state.installPrompt || isIosSafari());
  const installBtn = showInstall
    ? `<button class="icon-btn" id="btn-install" title="Install app" aria-label="Install app">⊕</button>`
    : '';
  el.innerHTML = `
    <div class="mode-tabs" role="tablist" aria-label="Prayer mode">
      ${PRAYER_MODES.map(m => `
        <button class="mode-tab${m === state.mode ? ' active' : ''}" role="tab"
          aria-selected="${m === state.mode}" data-mode="${m}">
          ${m === 'latin' ? 'Latin' : m === 'contemporary' ? 'Contemporary' : 'Traditional'}
        </button>`).join('')}
    </div>
    <div class="icon-btns">
      ${audioBtn}
      <button class="icon-btn" id="btn-theme" title="Toggle theme" aria-label="Toggle colour theme">${getResolvedTheme() === 'dark' ? '🌛' : '🌞'}</button>
      <button class="icon-btn${state.bellPopupOpen ? ' active' : ''}" id="btn-bell" title="Set reminders" aria-label="Set bell reminders">${getSchedule().enabled ? '🔔' : '🔕'}</button>
      ${installBtn}
    </div>
  `;
  const modeTabs = Array.from(el.querySelectorAll('.mode-tab'));
  modeTabs.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      localStorage.setItem('angelus_mode', state.mode);
      renderControls();
      renderPrayer();
    });
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { modeTabs[(i + 1) % modeTabs.length].focus(); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { modeTabs[(i - 1 + modeTabs.length) % modeTabs.length].focus(); e.preventDefault(); }
    });
  });
  const audioEl = $('btn-audio');
  if (audioEl) audioEl.addEventListener('click', toggleAudio);
  $('btn-theme').addEventListener('click', toggleTheme);
  $('btn-bell').addEventListener('click', toggleBellPopup);
  const installEl = $('btn-install');
  if (installEl) {
    if (isIosSafari() && !state.installPrompt) {
      installEl.addEventListener('click', () => {
        alert('To install: tap the Share button, then "Add to Home Screen".');
      });
    } else {
      installEl.addEventListener('click', triggerInstall);
    }
  }
}

// ── Prayer renderer ────────────────────────────────
function renderPrayer() {
  let el = $('prayer-area');
  if (!el) { el = document.createElement('div'); el.id = 'prayer-area'; app.appendChild(el); }

  const season = getSeason();
  const prayedToday = hasPrayedToday();

  if (season === 'triduum') {
    el.innerHTML = renderTriduum(prayedToday);
  } else {
    const data = season === 'eastertide' ? reginaCoeli[state.mode] : angelus[state.mode];
    el.innerHTML = season === 'eastertide' ? renderRegina(data, prayedToday) : renderAngelus(data, prayedToday);
  }

  const btn = $('btn-complete');
  if (btn && !prayedToday) {
    btn.addEventListener('click', () => {
      const s = recordPrayer();
      btn.textContent = 'Prayed ✦';
      btn.classList.add('done');
      renderStreak(s);
      renderCalendar();
    });
  }
}

function renderAngelus(data, prayedToday) {
  const verses = data.verses.map((v, i) => `
    <section class="verse-block" aria-label="Verse ${i + 1}">
      <div class="versicle-line">
        <span class="sigil" aria-label="Versicle">V.</span>
        <span class="versicle-text">${v.versicle}</span>
      </div>
      <div class="versicle-line">
        <span class="sigil" aria-label="Response">R.</span>
        <span class="response-text">${v.response}</span>
      </div>
      <div class="sub-prayer" aria-label="${v.prayer.title}">
        <div class="sub-prayer-title">${v.prayer.title}</div>
        <div class="sub-prayer-text">${v.prayer.text}</div>
      </div>
    </section>
    ${i < data.verses.length - 1 ? '<div class="ornament">· · ·</div>' : ''}
  `).join('');

  return `
    <div class="prayer-container" aria-live="polite">
      <div class="prayer-title">${data.title}</div>
      <div class="prayer-subtitle">${data.subtitle}</div>
      ${verses}
      <div class="collect-section">
        <div class="versicle-line">
          <span class="sigil">V.</span>
          <span class="versicle-text">${data.collectVersicle}</span>
        </div>
        <div class="versicle-line">
          <span class="sigil">R.</span>
          <span class="response-text">${data.collectResponse}</span>
        </div>
        <div class="collect-label" style="margin-top:1rem">${data.collectTitle}</div>
        <p class="collect-text">${data.collect}</p>
        <p class="closing-text">${data.closing}</p>
      </div>
      <button class="btn-complete${prayedToday ? ' done' : ''}" id="btn-complete">
        ${prayedToday ? 'Prayed ✦' : 'Mark as Prayed'}
      </button>
    </div>
  `;
}

function renderRegina(data, prayedToday) {
  const lines = data.body.map(l => `
    <div class="versicle-line" style="margin-bottom:0.4rem">
      <span class="sigil" aria-label="Versicle">V.</span>
      <span class="versicle-text">${l.versicle}</span>
    </div>
    <div class="versicle-line" style="margin-bottom:0.8rem">
      <span class="sigil" aria-label="Response">R.</span>
      <span class="response-text">${l.response}</span>
    </div>
  `).join('');

  return `
    <div class="prayer-container" aria-live="polite">
      <div class="prayer-title">${data.title}</div>
      <div class="prayer-subtitle">${data.subtitle}</div>
      ${lines}
      <div class="collect-section">
        <div class="collect-label">${data.collectTitle}</div>
        <p class="collect-text">${data.collect}</p>
      </div>
      <button class="btn-complete${prayedToday ? ' done' : ''}" id="btn-complete">
        ${prayedToday ? 'Prayed ✦' : 'Mark as Prayed'}
      </button>
    </div>
  `;
}

// ── Triduum display ────────────────────────────────
function renderTriduum(prayedToday) {
  return `
    <div class="prayer-container" aria-live="polite">
      <div class="prayer-title">The Sacred Triduum</div>
      <div class="prayer-subtitle">Good Friday &amp; Holy Saturday</div>
      <p class="triduum-text">
        The Angelus bell is silent from Good Friday until the Easter Vigil.<br>
        The Church keeps watch at the tomb in prayer, fasting, and adoration.
      </p>
      <div class="collect-section">
        <div class="collect-label">An Act of Adoration</div>
        <p class="collect-text">
          We adore you, O Christ, and we bless you,<br>
          because by your holy Cross you have redeemed the world.
        </p>
      </div>
      <button class="btn-complete${prayedToday ? ' done' : ''}" id="btn-complete">
        ${prayedToday ? 'Prayed ✦' : 'Mark as Prayed'}
      </button>
    </div>
  `;
}

// ── Daily intention ────────────────────────────────
function renderIntention() {
  let el = $('intention-wrap');
  if (!el) {
    el = document.createElement('div');
    el.id = 'intention-wrap';
    app.appendChild(el);
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  const saved = getIntention(todayStr);
  el.innerHTML = `
    <label class="intention-label" for="intention-input">Today's Intention</label>
    <textarea id="intention-input" class="intention-input"
      placeholder="Offer this prayer for…"
      maxlength="280"
      aria-label="Prayer intention for today"
    >${saved}</textarea>
  `;
  let debounceTimer;
  $('intention-input').addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => saveIntention(todayStr, e.target.value.trim()), 500);
  });
}

// ── Streak display ─────────────────────────────────
function renderStreak(data) {
  let el = $('streak-display');
  if (!el) { el = document.createElement('div'); el.id = 'streak-display'; el.className = 'streak-pill'; el.setAttribute('role', 'status'); app.appendChild(el); }
  const s = data || getStreak();
  if (s.streak < 1) { el.classList.remove('visible'); return; }
  const flames = s.streak >= 30 ? '🔥🔥🔥' : s.streak >= 7 ? '🔥🔥' : '🔥';
  el.innerHTML = `<span class="streak-flame">${flames}</span> ${s.streak} day${s.streak !== 1 ? 's' : ''} · ${s.total} total <button class="cal-toggle" id="btn-calendar" aria-label="Toggle prayer history calendar">◈ History</button>`;
  el.classList.add('visible');
  $('btn-calendar').addEventListener('click', toggleCalendar);
}

// ── Prayer history calendar ─────────────────────────
function toggleCalendar() {
  state.calendarOpen = !state.calendarOpen;
  if (state.calendarOpen) {
    const now = new Date();
    state.calendarYear = now.getFullYear();
    state.calendarMonth = now.getMonth();
  }
  renderCalendar();
}

function renderCalendar() {
  let wrap = $('calendar-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'calendar-wrap';
    app.appendChild(wrap);
  }

  if (!state.calendarOpen) { wrap.innerHTML = ''; return; }

  const history = getHistory();
  const { calendarYear: year, calendarMonth: month } = state;
  const todayStr = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay();
  const monthLabel = firstDay.toLocaleString('default', { month: 'long', year: 'numeric' });

  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();

  let cells = ['S','M','T','W','T','F','S'].map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < startDow; i++) cells += '<div class="cal-day cal-empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    const prayed = history[dateStr];
    let cls = 'cal-day';
    if (isFuture)      cls += ' cal-future';
    else if (prayed)   cls += ' cal-prayed';
    else               cls += ' cal-missed';
    if (isToday)       cls += ' cal-today';
    cells += `<div class="${cls}">${d}</div>`;
  }

  wrap.innerHTML = `
    <div class="calendar">
      <div class="cal-header">
        <button class="cal-nav" id="cal-prev" aria-label="Previous month">‹</button>
        <span class="cal-month">${monthLabel}</span>
        <button class="cal-nav" id="cal-next" aria-label="Next month" ${isCurrentMonth ? 'disabled' : ''}>›</button>
      </div>
      <div class="cal-grid">${cells}</div>
    </div>
  `;

  $('cal-prev').addEventListener('click', () => {
    state.calendarMonth--;
    if (state.calendarMonth < 0) { state.calendarMonth = 11; state.calendarYear--; }
    renderCalendar();
  });
  $('cal-next').addEventListener('click', () => {
    if (isCurrentMonth) return;
    state.calendarMonth++;
    if (state.calendarMonth > 11) { state.calendarMonth = 0; state.calendarYear++; }
    renderCalendar();
  });
}

// ── Bell popup ─────────────────────────────────────
function toggleBellPopup() {
  if (state.bellPopupOpen) { closeBellPopup(); return; }
  state.bellPopupOpen = true;
  renderControls();
  renderBellPopup();
  _bellKeyHandler = e => { if (e.key === 'Escape') closeBellPopup(); };
  _bellCloseHandler = e => {
    const popup = $('bell-popup');
    const btn = $('btn-bell');
    if (popup && !popup.contains(e.target) && btn && !btn.contains(e.target)) closeBellPopup();
  };
  document.addEventListener('keydown', _bellKeyHandler);
  setTimeout(() => document.addEventListener('click', _bellCloseHandler), 0);
}

function closeBellPopup() {
  state.bellPopupOpen = false;
  const popup = $('bell-popup');
  if (popup) popup.remove();
  if (_bellKeyHandler)   { document.removeEventListener('keydown', _bellKeyHandler);   _bellKeyHandler = null; }
  if (_bellCloseHandler) { document.removeEventListener('click',   _bellCloseHandler); _bellCloseHandler = null; }
  renderControls();
}

function renderBellPopup() {
  if (!('Notification' in window)) return;
  let popup = $('bell-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'bell-popup';
    popup.className = 'bell-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Bell reminder settings');
    document.body.appendChild(popup);
  }
  const ctrl = $('controls-bar');
  if (ctrl) {
    const rect = ctrl.getBoundingClientRect();
    popup.style.top = `${rect.bottom + 6}px`;
    popup.style.right = `${window.innerWidth - rect.right}px`;
  }
  const schedule = getSchedule();
  const perm = getPermission();
  const selectedHours = Array.isArray(schedule.hours) ? schedule.hours : [6, 12, 18];
  const notificationsOn = schedule.enabled && selectedHours.length > 0;
  const bellOptions = [{ hour: 6, label: '6am' }, { hour: 12, label: '12pm' }, { hour: 18, label: '6pm' }];

  popup.innerHTML = `
    <div class="bell-popup-title">Bell Reminders</div>
    <div class="bell-popup-row">
      <span class="setting-sublabel">${perm === 'denied' ? 'Blocked in browser' : notificationsOn ? 'On' : 'Off'}</span>
      <label class="toggle" aria-label="Enable bell reminders">
        <input type="checkbox" id="bell-toggle" ${notificationsOn ? 'checked' : ''} ${perm === 'denied' ? 'disabled' : ''}>
        <span class="toggle-track"></span>
      </label>
    </div>
    <div class="bell-checks">
      ${bellOptions.map(({ hour, label }) =>
        `<label class="bell-check">
          <input type="checkbox" data-hour="${hour}" class="bell-hour"
            ${notificationsOn && selectedHours.includes(hour) ? 'checked' : ''}
            ${perm === 'denied' ? 'disabled' : ''}>
          ${label}
        </label>`
      ).join('')}
    </div>
  `;

  $('bell-toggle').addEventListener('change', async e => {
    if (e.target.checked) {
      const result = await requestPermission();
      if (result !== 'granted') { e.target.checked = false; return; }
      saveSchedule({ enabled: true, hours: selectedHours.length ? selectedHours : [6, 12, 18] });
    } else {
      saveSchedule({ ...schedule, enabled: false, hours: selectedHours });
    }
    refreshNotificationTimers();
    renderBellPopup();
  });

  popup.querySelectorAll('.bell-hour').forEach(cb => {
    cb.addEventListener('change', async e => {
      if (e.target.checked) {
        const result = await requestPermission();
        if (result !== 'granted') { e.target.checked = false; renderBellPopup(); return; }
      }
      const checked = [...popup.querySelectorAll('.bell-hour:checked')].map(c => parseInt(c.dataset.hour));
      saveSchedule({ enabled: checked.length > 0, hours: checked });
      refreshNotificationTimers();
      renderBellPopup();
    });
  });
}

// ── Audio toggle ───────────────────────────────────
function toggleAudio() {
  if (isSpeaking()) { stop(); state.audioOn = false; renderControls(); return; }
  state.audioOn = true;
  renderControls();
  const season = getSeason();
  if (season === 'triduum') { state.audioOn = false; renderControls(); return; }
  const eastertide = season === 'eastertide';
  const data = eastertide ? reginaCoeli[state.mode] : angelus[state.mode];
  const isLatin = state.mode === 'latin';
  let text = '';
  if (!eastertide) {
    const a = data;
    a.verses.forEach(v => {
      text += `${v.versicle} ${v.response}. ${v.prayer.text} `;
    });
    text += `${a.collectVersicle} ${a.collectResponse}. ${a.collectTitle} ${a.collect}`;
  } else {
    data.body.forEach(l => { text += `${l.versicle} ${l.response} `; });
    text += `${data.collectTitle} ${data.collect}`;
  }
  const speakFn = isLatin ? speakLatin : speak;
  speakFn(text, { onEnd: () => { state.audioOn = false; renderControls(); } });
}

// ── Start ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
