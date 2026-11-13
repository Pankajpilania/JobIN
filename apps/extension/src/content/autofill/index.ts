/**
 * Autofill content script entry point.
 * Runs on supported Greenhouse and Lever application pages. The candidate chooses
 * when to fill, and remains responsible for reviewing and submitting the form.
 */

import { detectBoard } from '../detector';
import { autofillGreenhouse } from './greenhouse';
import { autofillLever } from './lever';
import { MSG } from '../../shared/messages';
import type { UserProfile, AutofillSettings } from '../../shared/types';

// ─── Listen for autofill trigger ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== MSG.AUTOFILL_FORM) return;

  const { profile, settings } = message.payload as {
    profile: UserProfile;
    settings: AutofillSettings;
  };

  if (!settings?.enabled) {
    sendResponse({ ok: false, reason: 'Autofill disabled in settings' });
    return;
  }

  const board = detectBoard();
  const opts = {
    fillName: settings.fillName,
    fillEmail: settings.fillEmail,
    fillPhone: settings.fillPhone,
    fillWorkHistory: settings.fillWorkHistory,
    fillEducation: settings.fillEducation,
    fillVisaSponsorship: settings.fillVisaSponsorship,
    workAuthorisation: settings.fillVisaSponsorship ? settings.workAuthorisation : undefined,
  };

  if (board === 'greenhouse') {
    autofillGreenhouse(profile, opts)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // async
  }

  if (board === 'lever') {
    autofillLever(profile, opts)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // async
  }

  sendResponse({ ok: false, reason: `Unsupported ATS: ${board}` });
});

// ─── Show a user-triggered autofill card when the application form is present ──

const board = detectBoard();
if (board === 'greenhouse' || board === 'lever') {
  const FORM_SELECTOR =
    'form#application_form, form.application-form, form[action*="apply" i], [data-qa="application-form"]';
  const ROOT_ID = 'jobin-autofill-root';

  const showAutofillCard = () => {
    if (!document.querySelector(FORM_SELECTOR) || document.getElementById(ROOT_ID)) return;
    const host = document.createElement('div');
    host.id = ROOT_ID;
    Object.assign(host.style, { position: 'fixed', right: '20px', bottom: '20px', zIndex: '2147483647' });
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing:border-box }
      .card { width:280px; padding:16px; border:1px solid #d7e9dc; border-radius:18px; background:#fff; color:#142019; box-shadow:0 16px 48px #12271d30; font:14px/1.45 system-ui,sans-serif }
      .top { display:flex; align-items:center; gap:10px; margin-bottom:7px }
      .mark { display:grid; place-items:center; width:34px; height:34px; border-radius:11px; background:#e8f8e7; color:#187247; font-weight:800 }
      h2 { margin:0; font-size:14px; line-height:1.2 }
      p { margin:0 0 13px; color:#5f6f64; font-size:12px }
      button { width:100%; min-height:40px; border:0; border-radius:11px; background:#101713; color:#fff; font:700 13px system-ui,sans-serif; cursor:pointer }
      button:disabled { opacity:.6; cursor:wait }
      .status { min-height:16px; margin-top:9px; color:#476253; font-size:11px }
      .close { position:absolute; top:9px; right:10px; width:auto; min-height:0; padding:3px 6px; background:transparent; color:#69786d; font-size:16px }
    `;
    const card = document.createElement('div');
    card.className = 'card';
    const header = document.createElement('div');
    header.className = 'top';
    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.textContent = 'J';
    const title = document.createElement('h2');
    title.textContent = 'JobIN application helper';
    header.append(mark, title);
    const description = document.createElement('p');
    description.textContent = 'Fill details from your profile, then review every answer before you submit.';
    const button = document.createElement('button');
    button.textContent = 'Fill application details';
    const status = document.createElement('div');
    status.className = 'status';
    status.setAttribute('role', 'status');
    const close = document.createElement('button');
    close.className = 'close';
    close.setAttribute('aria-label', 'Close JobIN application helper');
    close.textContent = '×';
    close.addEventListener('click', () => host.remove());
    button.addEventListener('click', () => {
      button.disabled = true;
      button.textContent = 'Filling your profile…';
      status.textContent = 'Review the filled fields before submitting.';
      chrome.runtime.sendMessage({ type: MSG.START_AUTOFILL }, (response) => {
        button.disabled = false;
        button.textContent = 'Fill application details';
        if (chrome.runtime.lastError) {
          status.textContent = 'Could not reach JobIN. Reload and try again.';
          return;
        }
        if (response?.error) {
          status.textContent = response.error;
          return;
        }
        const result = response?.result as { filled?: number; failed?: string[] } | undefined;
        status.textContent = result
          ? `Filled ${result.filled ?? 0} fields. Please review before submitting.`
          : 'Some fields may need to be completed manually.';
      });
    });
    card.append(close, header, description, button, status);
    shadow.append(style, card);
    document.body.appendChild(host);
  };

  showAutofillCard();
  const formObserver = new MutationObserver(showAutofillCard);
  formObserver.observe(document.documentElement, { childList: true, subtree: true });
}
