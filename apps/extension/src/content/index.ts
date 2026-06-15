/**
 * Main content script — runs on job board pages (LinkedIn, Indeed, Reed, TotalJobs, Glassdoor).
 * Orchestrates detection, extraction, badge injection, and message handling.
 */

import { detectBoard, isJobPage } from './detector';
import { extractWithRetry }       from './extractor';
import { injectBadge, updateBadgeScore, removeBadge } from './badge';
import { MSG }                    from '../shared/messages';

// ─── Main entry point ─────────────────────────────────────────────────────────

async function main() {
  const board = detectBoard();

  if (!isJobPage()) {
    // Not a job listing page — nothing to do
    return;
  }

  console.log(`[JobIN] Detected job board: ${board}`);

  // Inject loading badge immediately so the user sees activity
  injectBadge({ score: null });

  // Extract job data (with retry for SPAs that render asynchronously)
  const job = await extractWithRetry(board);

  if (!job) {
    console.warn('[JobIN] Extraction failed — removing badge');
    removeBadge();
    return;
  }

  console.log('[JobIN] Extracted job:', job.jobTitle, '@', job.companyName);

  // Notify the background service worker
  chrome.runtime.sendMessage({ type: MSG.JOB_DETECTED, payload: job }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('[JobIN] BG not available:', chrome.runtime.lastError.message);
    }
  });

  // Keep badge in loading state — score will be computed on-demand when user opens popup/panel
  // The badge just signals the page was detected
  injectBadge({
    score: null,
    onOpen: () => {
      // Badge click already handled inside badge.ts (sends OPEN_SIDE_PANEL)
    },
  });
}

// ─── Listen for messages from the background / side panel ─────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MSG.AUTOFILL_FORM) {
    // Autofill is handled by the separate autofill content script
    // This message is forwarded from background to the page
    sendResponse({ ok: true });
    return true;
  }
});

// ─── SPA navigation handling ──────────────────────────────────────────────────
// LinkedIn and Indeed use pushState navigation, so we need to re-run on URL change

let lastUrl = location.href;

function onUrlChange() {
  const currentUrl = location.href;
  if (currentUrl === lastUrl) return;
  lastUrl = currentUrl;
  removeBadge();
  // Re-run after a short delay to allow the new page content to render
  setTimeout(main, 1000);
}

// Observe pushState navigation
const observer = new MutationObserver(onUrlChange);
observer.observe(document.body, { childList: true, subtree: true });

// Also hook into history API
const origPushState    = history.pushState.bind(history);
const origReplaceState = history.replaceState.bind(history);
history.pushState    = (...args) => { origPushState(...args);    onUrlChange(); };
history.replaceState = (...args) => { origReplaceState(...args); onUrlChange(); };
window.addEventListener('popstate', onUrlChange);

// ─── Bootstrap ────────────────────────────────────────────────────────────────

main().catch(err => console.error('[JobIN Content]', err));
