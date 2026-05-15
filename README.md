# Angelus

A no-build progressive web app for the Angelus and Regina Caeli — the traditional Catholic prayer of the Incarnation, prayed at 6am, noon, and 6pm.

## Features

- **Three prayer modes** — Traditional, Contemporary, and Latin
- **Full liturgical calendar** — automatically serves the correct prayer for every season:
  - Ordinary time → the Angelus
  - Advent → Angelus with Advent framing
  - Lent → Angelus with Lenten framing
  - Good Friday & Holy Saturday (Triduum) → solemn display; bells are silent
  - Easter Sunday through Pentecost (Eastertide) → Regina Caeli
- **Bell reminders** — optional push notifications at 6am, 12pm, and 6pm; configurable per time slot; background delivery via Periodic Background Sync where supported
- **Audio narration** — reads the prayer aloud via the Web Speech API, with a Latin voice for Latin mode
- **Streak tracking** — records daily prayer with a running streak and total count
- **Prayer history calendar** — month grid showing prayed, missed, and future days; navigate back month by month
- **Daily intention** — a per-day text field, auto-saved to localStorage, pruned after 90 days
- **Offline support** — service worker caches all assets; network-first for HTML, cache-first for everything else
- **Dark / light theme** — follows system preference by default; toggle in the nav bar
- **Installable** — full PWA manifest with icons; install to home screen on iOS and Android

## Getting Started

No build step, no package manager, no dependencies.

```bash
git clone https://github.com/mbaldwinsmith/angelus.git
cd angelus
```

Then serve the directory with any static file server. For example:

```bash
# Python
python -m http.server 8000

# Node (npx)
npx serve .
```

Open `http://localhost:8000`. The service worker requires a secure origin (`https://` or `localhost`) to register.

To use as a PWA, deploy to any static host (GitHub Pages, Netlify, Cloudflare Pages, etc.) over HTTPS and install from the browser's prompt.

## Project Structure

```
angelus/
├── index.html        # Shell — single div, no framework
├── app.js            # Main module: state, rendering, event wiring
├── prayers.js        # All prayer text + liturgical season logic
├── streaks.js        # Daily prayer tracking and history
├── intentions.js     # Per-day prayer intention (localStorage)
├── notifications.js  # Push notification scheduling
├── audio.js          # Web Speech API narration
├── sw.js             # Service worker — caching and background sync
├── manifest.json     # PWA manifest
└── style.css         # All styles — no preprocessor
```

## Liturgical Calendar

Dates are calculated dynamically on each load — no hardcoded years or lookup tables.

**Easter** is derived using the anonymous Gregorian algorithm (Meeus/Jones/Butcher), accurate for any year from 1583 onward. Everything else follows from it:

| Season | Dates |
|--------|-------|
| Lent | Ash Wednesday (Easter − 46) through Holy Saturday |
| Triduum | Good Friday (Easter − 2) and Holy Saturday (Easter − 1) |
| Eastertide | Easter Sunday through Pentecost (Easter + 49) |
| Advent | First Sunday of Advent (Sunday between Nov 27–Dec 3) through Dec 24 |

The app transitions between seasons automatically at midnight.

## Browser Support

Requires a modern browser with ES module support. Full feature availability:

| Feature | Requirement |
|---------|-------------|
| Core prayer | Any modern browser |
| Service worker / offline | Chrome, Firefox, Safari 16+ |
| Push notifications | Chrome, Firefox (not Safari on iOS) |
| Periodic Background Sync | Chrome on Android |
| Audio narration | Any browser with Web Speech API |

## Prayer Texts

The prayer texts were included in the initial build. They have not been independently verified against a definitive magisterial source. Before relying on this app liturgically, cross-reference the texts — particularly the Contemporary mode — against a trusted missal or the USCCB's published forms. All text lives in [`prayers.js`](prayers.js) and is straightforward to correct.

## Storage

All data is stored in `localStorage` under the following keys:

| Key | Contents |
|-----|----------|
| `angelus_mode` | Selected prayer mode |
| `angelus_theme` | Theme override (`light` or `dark`) |
| `angelus_streak` | Streak count, last date, total prayers |
| `angelus_history` | Prayer history (date → boolean) |
| `angelus_intentions` | Daily intentions (date → string, pruned at 90 days) |
| `angelus_notif` | Notification schedule |

No data leaves the device.

## License

[GNU General Public License v3.0](LICENSE)
