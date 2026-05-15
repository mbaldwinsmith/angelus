// app.js — Main application module (no build, vanilla ES modules)
import { angelus, reginaCoeli, isEastertide, PRAYER_MODES } from './prayers.js';
import { recordPrayer, getStreak, hasPrayedToday } from './streaks.js';
import { requestPermission, getPermission, getSchedule, saveSchedule, scheduleSessionAlarms } from './notifications.js';
import { speak, speakLatin, stop, isSupported as audioSupported, isSpeaking } from './audio.js';

// ── State ──────────────────────────────────────────
const state = {
  mode: localStorage.getItem('angelus_mode') || 'traditional',
  theme: localStorage.getItem('angelus_theme') || 'system',
  panelOpen: false,
  audioOn: false,
  timers: []
};

// ── DOM refs ───────────────────────────────────────
const $ = id => document.getElementById(id);
const app = $('app');

// ── Init ───────────────────────────────────────────
function init() {
  applyTheme(state.theme);
  renderHeader();
  renderControls();
  renderPrayer();
  renderStreak();
  renderPanel();
  state.timers = scheduleSessionAlarms((h) => {
    renderHeader(); // refresh time badge
  });
  // Service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
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
  const eastertide = isEastertide();
  el.innerHTML = `
    <div class="header-rule"><span>✦</span></div>
    <h1>Angelus</h1>
    <p class="subtitle">${eastertide ? 'Regina Caeli · Eastertide' : 'The Incarnation · Thrice Daily'}</p>
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
  el.querySelectorAll('.mode-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      localStorage.setItem('angelus_mode', state.mode);
      renderControls();
      renderPrayer();
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

  const eastertide = isEastertide();
  const data = eastertide ? reginaCoeli[state.mode] : angelus[state.mode];
  const prayedToday = hasPrayedToday();

  if (eastertide) {
    el.innerHTML = renderRegina(data, prayedToday);
  } else {
    el.innerHTML = renderAngelus(data, prayedToday);
  }

  const btn = $('btn-complete');
  if (btn && !prayedToday) {
    btn.addEventListener('click', () => {
      const s = recordPrayer();
      btn.textContent = 'Prayed ✦';
      btn.classList.add('done');
      renderStreak(s);
    });
  }
}

function renderAngelus(data, prayedToday) {
  const verses = data.verses.map((v, i) => `
    <div class="verse-block">
      <div class="versicle-line">
        <span class="sigil">V.</span>
        <span class="versicle-text">${v.versicle}</span>
      </div>
      <div class="versicle-line">
        <span class="sigil">R.</span>
        <span class="response-text">${v.response}</span>
      </div>
      <div class="sub-prayer" aria-label="${v.prayer.title}">
        <div class="sub-prayer-title">${v.prayer.title}</div>
        <div class="sub-prayer-text">${v.prayer.text}</div>
      </div>
    </div>
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
      <span class="sigil">V.</span>
      <span class="versicle-text">${l.versicle}</span>
    </div>
    <div class="versicle-line" style="margin-bottom:0.8rem">
      <span class="sigil">R.</span>
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

// ── Streak display ─────────────────────────────────
function renderStreak(data) {
  let el = $('streak-display');
  if (!el) { el = document.createElement('div'); el.id = 'streak-display'; el.className = 'streak-pill'; app.appendChild(el); }
  const s = data || getStreak();
  if (s.streak < 1) { el.classList.remove('visible'); return; }
  const flames = s.streak >= 30 ? '🔥🔥🔥' : s.streak >= 7 ? '🔥🔥' : '🔥';
  el.innerHTML = `<span class="streak-flame">${flames}</span> ${s.streak} day${s.streak !== 1 ? 's' : ''} ·  ${s.total} total`;
  el.classList.add('visible');
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
      <div class="setting-row" style="flex-direction:column;align-items:flex-start;gap:0.6rem">
        <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
          <div>
            <div class="setting-label">Bell Notifications</div>
            <div class="setting-sublabel">${perm === 'denied' ? 'Blocked in browser settings' : '6am · 12pm · 6pm'}</div>
          </div>
          <label class="toggle" aria-label="Enable notifications">
            <input type="checkbox" id="notif-toggle" ${schedule.enabled ? 'checked' : ''} ${perm === 'denied' ? 'disabled' : ''}>
            <span class="toggle-track"></span>
          </label>
        </div>
        ${schedule.enabled ? `
        <div class="bell-checks">
          ${[6,12,18].map(h => {
            const label = h === 6 ? '6am' : h === 12 ? '12pm' : '6pm';
            return `<label class="bell-check">
              <input type="checkbox" data-hour="${h}" class="bell-hour" ${schedule.hours.includes(h) ? 'checked' : ''}>
              ${label}
            </label>`;
          }).join('')}
        </div>` : ''}
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
        saveSchedule({ enabled: true, hours: schedule.hours.length ? schedule.hours : [6,12,18] });
      } else {
        saveSchedule({ ...schedule, enabled: false });
      }
      renderPanel();
    });
  }

  document.querySelectorAll('.bell-hour').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = [...document.querySelectorAll('.bell-hour:checked')].map(c => parseInt(c.dataset.hour));
      saveSchedule({ ...schedule, hours: checked });
    });
  });
}

function openPanel() {
  state.panelOpen = true;
  renderPanel();
  $('panel-overlay').classList.add('open');
}

function closePanel() {
  state.panelOpen = false;
  $('panel-overlay').classList.remove('open');
}

// ── Audio toggle ───────────────────────────────────
function toggleAudio() {
  if (isSpeaking()) { stop(); state.audioOn = false; renderControls(); return; }
  state.audioOn = true;
  renderControls();
  const eastertide = isEastertide();
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
