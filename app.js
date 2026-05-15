// app.js — Main application module (no build, vanilla ES modules)
import { angelus, reginaCoeli, getSeason, SEASON_LABELS, PRAYER_MODES } from './prayers.js';
import { recordPrayer, getStreak, hasPrayedToday, getHistory } from './streaks.js';
import { requestPermission, getPermission, getSchedule, saveSchedule, scheduleSessionAlarms, clearTimers } from './notifications.js';
import { speak, speakLatin, stop, isSupported as audioSupported, isSpeaking } from './audio.js';
import { getIntention, saveIntention, pruneIntentions } from './intentions.js';

// ── State ──────────────────────────────────────────
const state = {
  mode: localStorage.getItem('angelus_mode') || 'traditional',
  theme: localStorage.getItem('angelus_theme') || 'system',
  panelOpen: false,
  audioOn: false,
  timers: [],
  calendarOpen: false,
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
};

// ── DOM refs ───────────────────────────────────────
const $ = id => document.getElementById(id);
const app = $('app');

// ── Panel focus management ─────────────────────────
let _panelTrapHandler = null;
let _panelPrevFocus = null;

// ── Init ───────────────────────────────────────────
function init() {
  pruneIntentions();
  applyTheme(state.theme);
  renderHeader();
  renderControls();
  renderPrayer();
  renderIntention();
  renderStreak();
  renderCalendar();
  renderPanel();
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
    ? `<button class="icon-btn${state.audioOn ? ' active' : ''}" id="btn-audio" title="Toggle narration" aria-label="Toggle audio narration">🔊</button>`
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
      <button class="icon-btn" id="btn-settings" title="Settings" aria-label="Open settings">⚙</button>
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
  $('btn-settings').addEventListener('click', openPanel);
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

// ── Settings panel ─────────────────────────────────
function renderPanel() {
  let overlay = $('panel-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'panel-overlay';
    overlay.className = 'panel-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closePanel(); });
  }

  const schedule = getSchedule();
  const perm = getPermission();
  const notifSupported = 'Notification' in window;
  const selectedHours = Array.isArray(schedule.hours) ? schedule.hours : [6, 12, 18];
  const notificationsOn = schedule.enabled && selectedHours.length > 0;
  const bellOptions = [
    { hour: 6, label: '6am' },
    { hour: 12, label: '12pm' },
    { hour: 18, label: '6pm' }
  ];

  overlay.innerHTML = `
    <div class="panel" role="dialog" aria-modal="true" aria-label="Settings">
      <div class="panel-handle"></div>
      <h2>Settings</h2>

      <div class="setting-row">
        <div>
          <div class="setting-label">Appearance</div>
        </div>
        <select class="theme-select" id="theme-sel" aria-label="Colour theme">
          <option value="system"${state.theme === 'system' ? ' selected' : ''}>System</option>
          <option value="dark"${state.theme === 'dark' ? ' selected' : ''}>Dark</option>
          <option value="light"${state.theme === 'light' ? ' selected' : ''}>Light</option>
        </select>
      </div>

      ${notifSupported ? `
      <div class="setting-row notification-setting">
        <div class="setting-row-main">
          <div>
            <div class="setting-label">Bell Notifications</div>
            <div class="setting-sublabel">${perm === 'denied' ? 'Blocked in browser settings' : notificationsOn ? 'Choose one or more times' : 'Off'}</div>
          </div>
          <label class="toggle" aria-label="Enable notifications">
            <input type="checkbox" id="notif-toggle" ${notificationsOn ? 'checked' : ''} ${perm === 'denied' ? 'disabled' : ''}>
            <span class="toggle-track"></span>
          </label>
        </div>
        <div class="bell-checks">
          ${bellOptions.map(({ hour, label }) => {
            return `<label class="bell-check">
              <input type="checkbox" data-hour="${hour}" class="bell-hour" ${notificationsOn && selectedHours.includes(hour) ? 'checked' : ''} ${perm === 'denied' ? 'disabled' : ''}>
              ${label}
            </label>`;
          }).join('')}
        </div>
      </div>` : ''}

      <div class="setting-row">
        <div>
          <div class="setting-label">Streak</div>
          <div class="setting-sublabel">${getStreak().streak} day streak · ${getStreak().total} total prayers</div>
        </div>
      </div>
    </div>
  `;

  $('theme-sel').addEventListener('change', e => {
    state.theme = e.target.value;
    localStorage.setItem('angelus_theme', state.theme);
    applyTheme(state.theme);
    renderPanel();
  });

  const notifToggle = $('notif-toggle');
  if (notifToggle) {
    notifToggle.addEventListener('change', async e => {
      if (e.target.checked) {
        const result = await requestPermission();
        if (result !== 'granted') { e.target.checked = false; return; }
        saveSchedule({ enabled: true, hours: selectedHours.length ? selectedHours : [6,12,18] });
      } else {
        saveSchedule({ ...schedule, enabled: false, hours: selectedHours });
      }
      refreshNotificationTimers();
      renderPanel();
    });
  }

  document.querySelectorAll('.bell-hour').forEach(cb => {
    cb.addEventListener('change', async e => {
      if (e.target.checked) {
        const result = await requestPermission();
        if (result !== 'granted') {
          e.target.checked = false;
          renderPanel();
          return;
        }
      }
      const checked = [...document.querySelectorAll('.bell-hour:checked')].map(c => parseInt(c.dataset.hour));
      saveSchedule({ enabled: checked.length > 0, hours: checked });
      refreshNotificationTimers();
      renderPanel();
    });
  });
}

function openPanel() {
  _panelPrevFocus = document.activeElement;
  state.panelOpen = true;
  renderPanel();
  const overlay = $('panel-overlay');
  overlay.classList.add('open');
  const panel = overlay.querySelector('.panel');
  const firstFocusable = panel.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (firstFocusable) firstFocusable.focus();
  _panelTrapHandler = e => {
    if (e.key === 'Escape') { closePanel(); return; }
    if (e.key !== 'Tab') return;
    const focusable = [...panel.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { last.focus(); e.preventDefault(); }
    } else {
      if (document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  };
  document.addEventListener('keydown', _panelTrapHandler);
}

function closePanel() {
  state.panelOpen = false;
  $('panel-overlay').classList.remove('open');
  if (_panelTrapHandler) { document.removeEventListener('keydown', _panelTrapHandler); _panelTrapHandler = null; }
  if (_panelPrevFocus)   { _panelPrevFocus.focus(); _panelPrevFocus = null; }
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
