// app.js — Main application module (no build, vanilla ES modules)
import { angelus, reginaCoeli, getSeason, SEASON_LABELS, PRAYER_MODES } from './prayers.js?v=7';
import { recordPrayer, getStreak, hasPrayedToday, getHistory, migrateHistoryFromStreak } from './streaks.js?v=7';
import { requestPermission, getPermission, getSchedule, saveSchedule, scheduleSessionAlarms, clearTimers } from './notifications.js?v=7';
import { speak, speakLatin, stop, isSupported as audioSupported, isSpeaking } from './audio.js?v=7';

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
  view: localStorage.getItem('angelus_view') || 'full',
  guidedStep: 0,
  textSize: localStorage.getItem('angelus_text_size') || 'medium',
  settingsOpen: false,
  completionMessage: '',
  showRepeatedPrayers: localStorage.getItem('angelus_repeat_full') === 'true',
};

// ── DOM refs ───────────────────────────────────────
const $ = id => document.getElementById(id);
const app = $('app');
const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const ICONS = {
  audio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
};

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
  applyTheme(state.theme);
  applyTextSize(state.textSize);
  renderHeader();
  renderControls();
  renderPrayer();
  renderStreak();
  renderCalendar();
  refreshNotificationTimers();
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.settingsOpen) {
      state.settingsOpen = false;
      renderControls();
      $('btn-settings')?.focus();
    }
  });
  document.addEventListener('click', e => {
    const controls = $('controls-bar');
    if (state.settingsOpen && controls && !controls.contains(e.target)) {
      state.settingsOpen = false;
      renderControls();
    }
  });
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

function applyTextSize(size) {
  document.documentElement.dataset.textSize = size;
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
    <div class="header-meta">
      <span class="subtitle">${SEASON_LABELS[season]}</span>
      <span class="meta-separator" aria-hidden="true">•</span>
      <span class="time-badge">${timeLabel}</span>
    </div>
  `;
}

// ── Controls bar ───────────────────────────────────
function renderControls() {
  let el = $('controls-bar');
  if (!el) { el = document.createElement('div'); el.id = 'controls-bar'; el.className = 'controls'; app.appendChild(el); }
  const audioBtn = audioSupported()
    ? `<button class="icon-btn${state.audioOn ? ' active' : ''}" id="btn-audio" title="${state.audioOn ? 'Stop narration' : 'Read prayer aloud'}" aria-label="${state.audioOn ? 'Stop narration' : 'Read prayer aloud'}">${state.audioOn ? ICONS.stop : ICONS.audio}</button>`
    : '';
  const showInstall = !isInStandaloneMode() && (state.installPrompt || isIosSafari());
  el.innerHTML = `
    <div class="mode-tabs" role="tablist" aria-label="Prayer language">
      ${PRAYER_MODES.map(m => `
        <button class="mode-tab${m === state.mode ? ' active' : ''}" role="tab"
          aria-selected="${m === state.mode}" tabindex="${m === state.mode ? '0' : '-1'}" data-mode="${m}">
          ${m === 'latin' ? 'Latin' : m === 'contemporary' ? 'Contemporary' : 'Traditional'}
        </button>`).join('')}
    </div>
    <div class="icon-btns">
      ${audioBtn}
      <button class="icon-btn${state.settingsOpen ? ' active' : ''}" id="btn-settings" title="Prayer settings" aria-label="Prayer settings" aria-expanded="${state.settingsOpen}" aria-controls="settings-menu">${ICONS.settings}</button>
    </div>
    ${state.settingsOpen ? `
      <div class="settings-menu" id="settings-menu" role="dialog" aria-label="Prayer settings">
        <div class="settings-section">
          <span class="settings-label">Reading view</span>
          <div class="setting-segments" role="group" aria-label="Reading view">
            <button data-view="full" aria-pressed="${state.view === 'full'}" class="setting-choice${state.view === 'full' ? ' active' : ''}">Full text</button>
            <button data-view="guided" aria-pressed="${state.view === 'guided'}" class="setting-choice${state.view === 'guided' ? ' active' : ''}">Guided</button>
          </div>
        </div>
        <div class="settings-section">
          <span class="settings-label">Text size</span>
          <div class="setting-segments" role="group" aria-label="Text size">
            ${['small', 'medium', 'large'].map((size, i) => `<button data-size="${size}" aria-pressed="${state.textSize === size}" class="setting-choice text-size-choice size-${size}${state.textSize === size ? ' active' : ''}" aria-label="${size} text">A</button>`).join('')}
          </div>
        </div>
        <label class="setting-check"><input type="checkbox" id="repeat-prayers" ${state.showRepeatedPrayers ? 'checked' : ''}><span>Show every Hail Mary in full</span></label>
        <div class="settings-actions">
          <button class="settings-action" id="btn-theme">${getResolvedTheme() === 'dark' ? ICONS.sun : ICONS.moon}<span>${getResolvedTheme() === 'dark' ? 'Light theme' : 'Dark theme'}</span></button>
          <button class="settings-action" id="btn-bell" aria-expanded="${state.bellPopupOpen}" aria-controls="bell-popup">${ICONS.bell}<span>Reminders</span></button>
          ${showInstall ? `<button class="settings-action" id="btn-install">${ICONS.download}<span>Install app</span></button>` : ''}
        </div>
      </div>` : ''}
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
      let next = null;
      if (e.key === 'ArrowRight') next = modeTabs[(i + 1) % modeTabs.length];
      if (e.key === 'ArrowLeft') next = modeTabs[(i - 1 + modeTabs.length) % modeTabs.length];
      if (next) { next.focus(); next.click(); e.preventDefault(); }
    });
  });
  const audioEl = $('btn-audio');
  if (audioEl) audioEl.addEventListener('click', toggleAudio);
  $('btn-settings').addEventListener('click', () => { state.settingsOpen = !state.settingsOpen; renderControls(); });
  const themeEl = $('btn-theme');
  if (themeEl) themeEl.addEventListener('click', toggleTheme);
  const bellEl = $('btn-bell');
  if (bellEl) bellEl.addEventListener('click', toggleBellPopup);
  el.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    state.view = btn.dataset.view;
    state.guidedStep = 0;
    state.settingsOpen = false;
    localStorage.setItem('angelus_view', state.view);
    renderControls();
    renderPrayer();
  }));
  el.querySelectorAll('[data-size]').forEach(btn => btn.addEventListener('click', () => {
    state.textSize = btn.dataset.size;
    localStorage.setItem('angelus_text_size', state.textSize);
    applyTextSize(state.textSize);
    renderControls();
  }));
  const repeatEl = $('repeat-prayers');
  if (repeatEl) repeatEl.addEventListener('change', e => {
    state.showRepeatedPrayers = e.target.checked;
    localStorage.setItem('angelus_repeat_full', String(state.showRepeatedPrayers));
    renderPrayer();
  });
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
    if (state.view === 'guided') {
      el.innerHTML = renderGuided(data, season === 'eastertide', prayedToday);
    } else {
      el.innerHTML = season === 'eastertide' ? renderRegina(data, prayedToday) : renderAngelus(data, prayedToday);
    }
  }

  const btn = $('btn-complete');
  if (btn && !prayedToday) btn.addEventListener('click', completePrayer);

  const guidedPrev = $('guided-prev');
  const guidedNext = $('guided-next');
  if (guidedPrev) guidedPrev.addEventListener('click', () => { state.guidedStep--; renderPrayer(); });
  if (guidedNext) guidedNext.addEventListener('click', () => { state.guidedStep++; renderPrayer(); });
}

function completePrayer() {
  const s = recordPrayer();
  state.completionMessage = `Prayer recorded. ${s.streak} day streak.`;
  renderPrayer();
  renderStreak(s);
  renderCalendar();
  const status = $('completion-status');
  if (status) status.focus();
}

function renderGuided(data, eastertide, prayedToday) {
  const steps = eastertide
    ? [
        ...data.body.map((line, i) => ({ label: `Verse ${i + 1}`, versicle: line.versicle, response: line.response })),
        { label: data.collectTitle, collect: data.collect },
      ]
    : [
        ...data.verses.map((verse, i) => ({ label: `Verse ${i + 1}`, ...verse })),
        { label: data.collectTitle, versicle: data.collectVersicle, response: data.collectResponse, collect: data.collect, closing: data.closing },
      ];
  state.guidedStep = Math.max(0, Math.min(state.guidedStep, steps.length - 1));
  const step = steps[state.guidedStep];
  const isLast = state.guidedStep === steps.length - 1;
  return `
    <article class="prayer-container guided-prayer" aria-live="polite">
      <div class="guided-heading">
        <div>
          <h2 class="prayer-title">${data.title}</h2>
          <p class="prayer-subtitle">${step.label}</p>
        </div>
        <span class="guided-count">${state.guidedStep + 1} of ${steps.length}</span>
      </div>
      <div class="guided-progress" role="progressbar" aria-label="Prayer progress" aria-valuemin="1" aria-valuemax="${steps.length}" aria-valuenow="${state.guidedStep + 1}"><span style="width:${((state.guidedStep + 1) / steps.length) * 100}%"></span></div>
      <section class="guided-card" aria-label="${step.label}">
        ${step.versicle ? `<div class="versicle-line"><span class="sigil" aria-label="Versicle">V.</span><p class="versicle-text">${step.versicle}</p></div>` : ''}
        ${step.response ? `<div class="versicle-line"><span class="sigil" aria-label="Response">R.</span><p class="response-text">${step.response}</p></div>` : ''}
        ${step.prayer ? `<div class="sub-prayer"><h3 class="sub-prayer-title">${step.prayer.title}</h3><p class="sub-prayer-text">${step.prayer.text}</p></div>` : ''}
        ${step.collect ? `<div class="guided-collect"><p class="collect-text">${step.collect}</p>${step.closing ? `<p class="closing-text">${step.closing}</p>` : ''}</div>` : ''}
      </section>
      <div class="guided-actions">
        <button class="btn-secondary" id="guided-prev" ${state.guidedStep === 0 ? 'disabled' : ''}>Back</button>
        ${isLast ? `<button class="btn-primary${prayedToday ? ' done' : ''}" id="btn-complete" ${prayedToday ? 'disabled' : ''}>${prayedToday ? 'Prayed ✦' : 'Mark as Prayed'}</button>` : '<button class="btn-primary" id="guided-next">Continue</button>'}
      </div>
      <p class="completion-status" id="completion-status" role="status" tabindex="-1">${state.completionMessage}</p>
    </article>`;
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
      ${i === 0 || state.showRepeatedPrayers ? `
        <div class="sub-prayer" aria-label="${v.prayer.title}">
          <h3 class="sub-prayer-title">${v.prayer.title}</h3>
          <p class="sub-prayer-text">${v.prayer.text}</p>
        </div>` : `
        <details class="sub-prayer repeated-prayer">
          <summary>${v.prayer.title} <span>Show words</span></summary>
          <p class="sub-prayer-text">${v.prayer.text}</p>
        </details>`}
    </section>
    ${i < data.verses.length - 1 ? '<div class="ornament">· · ·</div>' : ''}
  `).join('');

  return `
    <article class="prayer-container" aria-live="polite">
      <h2 class="prayer-title">${data.title}</h2>
      <p class="prayer-subtitle">${data.subtitle}</p>
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
        <h3 class="collect-label" style="margin-top:1rem">${data.collectTitle}</h3>
        <p class="collect-text">${data.collect}</p>
        ${data.closing ? `<p class="closing-text">${data.closing}</p>` : ''}
      </div>
      <button class="btn-complete${prayedToday ? ' done' : ''}" id="btn-complete" ${prayedToday ? 'disabled' : ''}>
        ${prayedToday ? 'Prayed ✦' : 'Mark as Prayed'}
      </button>
      <p class="completion-status" id="completion-status" role="status" tabindex="-1">${state.completionMessage}</p>
    </article>
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
    <article class="prayer-container" aria-live="polite">
      <h2 class="prayer-title">${data.title}</h2>
      <p class="prayer-subtitle">${data.subtitle}</p>
      ${lines}
      <div class="collect-section">
        <h3 class="collect-label">${data.collectTitle}</h3>
        <p class="collect-text">${data.collect}</p>
      </div>
      <button class="btn-complete${prayedToday ? ' done' : ''}" id="btn-complete" ${prayedToday ? 'disabled' : ''}>
        ${prayedToday ? 'Prayed ✦' : 'Mark as Prayed'}
      </button>
      <p class="completion-status" id="completion-status" role="status" tabindex="-1">${state.completionMessage}</p>
    </article>
  `;
}

// ── Triduum display ────────────────────────────────
function renderTriduum(prayedToday) {
  return `
    <div class="prayer-container" aria-live="polite">
      <h2 class="prayer-title">The Sacred Triduum</h2>
      <p class="prayer-subtitle">Holy Thursday Evening · Good Friday · Holy Saturday</p>
      <p class="triduum-text">
        The Angelus bell is silent from Good Friday until the Easter Vigil.<br>
        The Church keeps watch at the tomb in prayer, fasting, and adoration.
      </p>
      <div class="collect-section">
        <h3 class="collect-label">An Act of Adoration</h3>
        <p class="collect-text">
          We adore you, O Christ, and we bless you,<br>
          because by your holy Cross you have redeemed the world.
        </p>
      </div>
      <button class="btn-complete${prayedToday ? ' done' : ''}" id="btn-complete" ${prayedToday ? 'disabled' : ''}>
        ${prayedToday ? 'Prayed ✦' : 'Mark as Prayed'}
      </button>
      <p class="completion-status" id="completion-status" role="status" tabindex="-1">${state.completionMessage}</p>
    </div>
  `;
}


// ── Streak display ─────────────────────────────────
function renderStreak(data) {
  let el = $('streak-display');
  if (!el) { el = document.createElement('section'); el.id = 'streak-display'; el.className = 'completion-card'; el.setAttribute('aria-label', 'Prayer progress'); app.appendChild(el); }
  const s = data || getStreak();
  const prayed = hasPrayedToday();
  el.innerHTML = `
    <div class="completion-icon" aria-hidden="true">${prayed ? '✦' : '○'}</div>
    <div class="completion-copy">
      <strong>${prayed ? 'Prayed today' : 'Ready when you are'}</strong>
      <span>${s.streak} day streak · ${s.total || 0} prayer${s.total === 1 ? '' : 's'} total</span>
    </div>
    <button class="cal-toggle" id="btn-calendar" aria-label="${state.calendarOpen ? 'Hide' : 'Show'} prayer history" aria-expanded="${state.calendarOpen}" aria-controls="calendar-wrap">${ICONS.history}<span>History</span></button>`;
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
  renderStreak();
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
  const todayStr = dateKey();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay();
  const monthLabel = firstDay.toLocaleString('default', { month: 'long', year: 'numeric' });

  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();

  let cells = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="cal-dow" role="columnheader" aria-label="${d}">${d.slice(0, 1)}</div>`).join('');
  for (let i = 0; i < startDow; i++) cells += '<div class="cal-day cal-empty" role="gridcell" aria-hidden="true"></div>';

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
    const dateLabel = new Date(year, month, d).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const stateLabel = isFuture ? 'future date' : prayed ? 'prayer recorded' : 'no prayer recorded';
    cells += `<div class="${cls}" role="gridcell" aria-label="${dateLabel}, ${stateLabel}">${d}</div>`;
  }

  wrap.innerHTML = `
    <div class="calendar" aria-label="Prayer history for ${monthLabel}">
      <div class="cal-header">
        <button class="cal-nav" id="cal-prev" aria-label="Previous month">‹</button>
        <span class="cal-month">${monthLabel}</span>
        <button class="cal-nav" id="cal-next" aria-label="Next month" ${isCurrentMonth ? 'disabled' : ''}>›</button>
      </div>
      <div class="cal-grid" role="grid">${cells}</div>
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
  state.settingsOpen = false;
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
  let guidedTotal = 0;
  if (state.view === 'guided') {
    const guidedSteps = eastertide
      ? [...data.body.map(l => `${l.versicle} ${l.response}`), `${data.collectTitle} ${data.collect}`]
      : [...data.verses.map(v => `${v.versicle} ${v.response}. ${v.prayer.text}`), `${data.collectVersicle} ${data.collectResponse}. ${data.collectTitle} ${data.collect} ${data.closing || ''}`];
    guidedTotal = guidedSteps.length;
    text = guidedSteps[state.guidedStep];
  } else if (!eastertide) {
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
  speakFn(text, { onEnd: () => {
    state.audioOn = false;
    if (state.view === 'guided' && state.guidedStep < guidedTotal - 1) {
      state.guidedStep++;
      renderPrayer();
    }
    renderControls();
  } });
}

// ── Start ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
