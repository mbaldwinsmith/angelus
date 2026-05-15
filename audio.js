// audio.js — Stretch goal: audio narration scaffold
// Uses Web Speech API (SpeechSynthesis) — no external assets needed

let utterance = null;
let speaking = false;

export function isSupported() {
  return 'speechSynthesis' in window;
}

export function speak(text, { lang = 'en-GB', rate = 0.88, pitch = 0.95, onEnd } = {}) {
  if (!isSupported()) return;
  stop();
  utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = pitch;
  // Prefer a calm, clear voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Moira'))
  ) || voices.find(v => v.lang.startsWith('en')) || null;
  if (preferred) utterance.voice = preferred;
  utterance.onend = () => { speaking = false; if (onEnd) onEnd(); };
  utterance.onerror = () => { speaking = false; };
  speaking = true;
  window.speechSynthesis.speak(utterance);
}

export function speakLatin(text, opts = {}) {
  speak(text, { lang: 'la', rate: 0.8, pitch: 0.9, ...opts });
}

export function stop() {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();
  speaking = false;
}

export function isSpeaking() { return speaking; }
