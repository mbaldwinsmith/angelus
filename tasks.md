# Angelus — Task List

## 1. Prayer History Calendar

- [x] Add `getHistory()` to `streaks.js` — return an object keyed by ISO date string with a boolean value
- [x] Update `recordPrayer()` to write each prayed date into the history object
- [x] Add `renderCalendar()` to `app.js` — build a month grid from the current month's dates
- [x] Mark each day cell as prayed, missed, or future using CSS classes
- [x] Add navigation (prev/next month) with state tracked in `app.js`
- [x] Insert the calendar below the streak pill; show/hide via a toggle button
- [x] Add calendar styles to `style.css` (grid layout, day cell variants)

---

## 6. Triduum (Good Friday & Holy Saturday)

- [x] Add `'triduum'` to `SEASON_LABELS` in `prayers.js`
- [x] Add Triduum detection in `getSeason()` — Easter −2 through Easter −1, checked before Lent
- [x] Add `renderTriduum()` to `app.js` — solemn display with an act of adoration; no Angelus text
- [x] Update `renderPrayer()` to branch on `'triduum'` before Eastertide/Angelus
- [x] Silence `toggleAudio()` during the Triduum (no prayer text to narrate)
- [x] Add `body[data-season="triduum"]` muted grey accent to `style.css`
- [x] Add `.triduum-text` styles to `style.css`

---

## 2. Liturgical Season Awareness

- [x] Extend `prayers.js` — add `getSeason()` returning `'advent' | 'lent' | 'eastertide' | 'ordinary'`
- [x] Implement Advent detection (4 Sundays before Dec 25) and Lent detection (Ash Wednesday to Holy Saturday)
- [x] Replace bare `isEastertide()` calls in `app.js` with `getSeason()`
- [x] Add a `seasonAccent` CSS custom property per season in `style.css` (e.g. purple for Lent, blue for Advent)
- [x] Update `renderHeader()` to show the correct season subtitle and apply the accent class to `<body>` or `#app`
- [x] Add Lent and Advent subtitle strings to `prayers.js`

---

## 3. Daily Intention

- [x] Add `getIntention(dateStr)` and `saveIntention(dateStr, text)` helpers to a new `intentions.js` module
- [x] Add `renderIntention()` to `app.js` — textarea pre-filled with today's saved intention
- [x] Auto-save on `input` event (debounced 500ms) with no explicit save button
- [x] Show the intention below the "Mark as Prayed" button, above the streak pill
- [x] Add intention styles to `style.css` (textarea sizing, placeholder color, focus ring)
- [x] Prune intentions older than 90 days on load to keep localStorage tidy

---

## 4. Service Worker Improvements

- [x] Rewrite `sw.js` cache strategy: cache-first for static assets, network-first for `index.html`
- [x] Add an explicit cache version constant; bump it to bust stale caches on deploy
- [x] Add an `activate` handler that deletes old cache versions
- [x] Implement a `fetch` handler with a catch that serves a cached offline shell if the network fails
- [x] Register a `periodicsync` event listener in `sw.js` for `'angelus-bell'` tag (fires background notifications when supported)
- [x] Update `notifications.js` — after permission granted, attempt to register periodic background sync; fall back to existing `setTimeout` approach if unsupported
- [ ] Test offline load by disabling network in DevTools — manual step

---

## 5. Accessibility Pass

- [x] Trap focus inside the settings panel when open (`panel-overlay`); release on close
- [x] Add `Escape` key listener to `closePanel()`
- [x] Make mode tabs keyboard-navigable with arrow keys (standard `role="tablist"` pattern)
- [x] Give each V./R. sigil `aria-label="Versicle"` / `aria-label="Response"` and wrap verse blocks in `<section>` with a descriptive `aria-label`
- [x] Ensure the streak pill has `role="status"` so screen readers announce updates
- [x] Audit color contrast for all theme variants against WCAG AA (4.5:1 for text)
- [x] Add `prefers-reduced-motion` media query to `style.css` — disable transitions/animations when set
