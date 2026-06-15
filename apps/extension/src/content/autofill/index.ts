/**
 * Autofill content script entry point.
 * Runs on: boards.greenhouse.io, jobs.lever.co
 * Waits for messages from the background service worker to trigger autofill.
 */

import { detectBoard } from '../detector';
import { autofillGreenhouse } from './greenhouse';
import { autofillLever }      from './lever';
import { MSG }                from '../../shared/messages';
import type { UserProfile, AutofillSettings } from '../../shared/types';

// ─── Listen for autofill trigger ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== MSG.AUTOFILL_FORM) return;

  const { profile, settings } = message.payload as {
    profile:  UserProfile;
    settings: AutofillSettings;
  };

  if (!settings?.enabled) {
    sendResponse({ ok: false, reason: 'Autofill disabled in settings' });
    return;
  }

  const board = detectBoard();
  const opts  = {
    fillWorkHistory: settings.fillWorkHistory,
    fillEducation:   settings.fillEducation,
    workAuthorisation: settings.workAuthorisation,
  };

  if (board === 'greenhouse') {
    autofillGreenhouse(profile, opts)
      .then(result => sendResponse({ ok: true, result }))
      .catch(err  => sendResponse({ ok: false, error: err.message }));
    return true; // async
  }

  if (board === 'lever') {
    autofillLever(profile, opts)
      .then(result => sendResponse({ ok: true, result }))
      .catch(err  => sendResponse({ ok: false, error: err.message }));
    return true; // async
  }

  sendResponse({ ok: false, reason: `Unsupported ATS: ${board}` });
});

// ─── Show a subtle "JobIN ready" indicator on ATS pages ──────────────────────

const board = detectBoard();
if (board === 'greenhouse' || board === 'lever') {
  const tip = document.createElement('div');
  Object.assign(tip.style, {
    position:        'fixed',
    bottom:          '12px',
    right:           '12px',
    background:      'linear-gradient(135deg,#0f0f1a,#1a1a2e)',
    border:          '1px solid rgba(99,102,241,0.4)',
    borderRadius:    '12px',
    padding:         '8px 14px',
    color:           'rgba(255,255,255,0.85)',
    fontSize:        '12px',
    fontFamily:      'system-ui, sans-serif',
    fontWeight:      '600',
    zIndex:          '2147483647',
    cursor:          'pointer',
    boxShadow:       '0 4px 16px rgba(0,0,0,0.4)',
    transition:      'opacity 0.3s ease',
    display:         'flex',
    alignItems:      'center',
    gap:             '8px',
  });
  tip.innerHTML = `<span style="font-size:16px">⚡</span> JobIN Autofill ready`;
  tip.title     = 'Click to open JobIN and autofill this form';
  tip.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: MSG.OPEN_SIDE_PANEL });
  });
  document.body.appendChild(tip);

  // Auto-hide after 5 seconds
  setTimeout(() => { tip.style.opacity = '0'; setTimeout(() => tip.remove(), 300); }, 5000);
}
