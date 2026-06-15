/**
 * JobIN Copilot — Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 * 1. Listen to messages from content scripts, popup, and side panel
 * 2. Route API calls to the JobIN backend (authenticated with stored JWT)
 * 3. Cache API responses in chrome.storage.session
 * 4. Handle side panel lifecycle
 * 5. Relay autofill instructions to content scripts
 */

import { MSG } from '../shared/messages';
import {
  getAuth, getSettings, setSettings, getCachedResumes, setCachedResumes,
  getDetectedJob, setDetectedJob,
} from '../shared/storage';
import {
  listResumes, tailorResume, generateCoverLetter,
  saveApplication, ApiError,
} from '../shared/api';

// ─── Extension install / update ───────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  try {
    // Force enable auto-open on detect so it runs automatically
    await setSettings({ openSidePanelOnDetect: true });
  } catch (err) {
    console.error('Failed to set default settings on install/update:', err);
  }

  if (reason === 'install') {
    // Open options page on first install so user can configure their token
    chrome.runtime.openOptionsPage();
  }
});

// ─── Action click — open side panel on the current tab ───────────────────────

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  await chrome.sidePanel.open({ tabId: tab.id });
});

// ─── Side panel per-tab configuration ────────────────────────────────────────
// Allow the side panel to open on every tab by default
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {
  // Not all Chrome versions support this API — safe to ignore
});

// ─── Message routing ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // keep channel open for async sendResponse
});

async function handleMessage(
  message: { type: string; payload?: any },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
): Promise<void> {
  try {
    switch (message.type) {
      // ── Content script detected a job listing ──────────────────────────────
      case MSG.JOB_DETECTED: {
        const tabId = sender.tab?.id;
        if (!tabId) break;
        await setDetectedJob(tabId, message.payload);

        const settings = await getSettings();
        if (settings.openSidePanelOnDetect) {
          await chrome.sidePanel.open({ tabId });
        }

        // Update the extension badge to show a dot
        await chrome.action.setBadgeText({ text: '✓', tabId });
        await chrome.action.setBadgeBackgroundColor({ color: '#6366f1', tabId });
        sendResponse({ ok: true });
        break;
      }

      // ── Get current auth state ─────────────────────────────────────────────
      case MSG.GET_AUTH: {
        const auth = await getAuth();
        sendResponse({ auth });
        break;
      }

      // ── Get settings ───────────────────────────────────────────────────────
      case MSG.GET_SETTINGS: {
        const settings = await getSettings();
        sendResponse({ settings });
        break;
      }

      // ── Get detected job for a tab ─────────────────────────────────────────
      case MSG.GET_DETECTED_JOB: {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab?.id) { sendResponse({ job: null }); break; }
        const job = await getDetectedJob(activeTab.id);
        sendResponse({ job });
        break;
      }

      // ── Get resume list (cached or fresh) ──────────────────────────────────
      case MSG.GET_RESUMES: {
        try {
          // Try cache first (5-minute TTL)
          const cached = await getCachedResumes();
          if (cached) { sendResponse({ resumes: cached }); break; }

          const resumes = await listResumes();
          await setCachedResumes(resumes);
          sendResponse({ resumes });
        } catch (err: any) {
          sendResponse({ resumes: [], error: err.message });
        }
        break;
      }

      // ── Tailor resume ──────────────────────────────────────────────────────
      case MSG.TAILOR_RESUME: {
        const { resumeId, jobDescription, jobTitle, companyName } = message.payload;
        try {
          const result = await tailorResume(resumeId, jobDescription, jobTitle, companyName);
          sendResponse({ result });
        } catch (err: any) {
          sendResponse({ error: err.message });
        }
        break;
      }

      // ── Generate cover letter ──────────────────────────────────────────────
      case MSG.GENERATE_COVER_LETTER: {
        try {
          const result = await generateCoverLetter(message.payload);
          sendResponse({ result });
        } catch (err: any) {
          sendResponse({ error: err.message });
        }
        break;
      }

      // ── Save job application ───────────────────────────────────────────────
      case MSG.SAVE_APPLICATION: {
        try {
          const result = await saveApplication(message.payload);
          sendResponse({ result });
        } catch (err: any) {
          sendResponse({ error: err.message });
        }
        break;
      }

      // ── Open side panel ───────────────────────────────────────────────────
      case MSG.OPEN_SIDE_PANEL: {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          await chrome.sidePanel.open({ tabId: activeTab.id });
          sendResponse({ ok: true });
        }
        break;
      }

      // ── Trigger autofill on current tab ───────────────────────────────────
      case MSG.START_AUTOFILL: {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab?.id) { sendResponse({ error: 'No active tab' }); break; }
        chrome.tabs.sendMessage(activeTab.id, {
          type:    MSG.AUTOFILL_FORM,
          payload: message.payload,
        }, (res) => sendResponse(res));
        break;
      }

      default:
        sendResponse({ error: `Unknown message type: ${message.type}` });
    }
  } catch (err: any) {
    console.error('[JobIN BG]', err);
    sendResponse({ error: err.message ?? 'Background error' });
  }
}

// ─── Tab cleanup ──────────────────────────────────────────────────────────────

chrome.tabs.onRemoved.addListener(async (tabId) => {
  // Clean up session storage for the closed tab
  await chrome.storage.session.remove(`jobin_detected_job_${tabId}`);
  await chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
});

console.log('[JobIN BG] Service worker started');
