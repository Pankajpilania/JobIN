import type { UserProfile } from '../../shared/types';
import { findInputByLabel } from '../extractor';

// ─── Greenhouse ATS Autofill ───────────────────────────────────────────────────
// Target: https://boards.greenhouse.io/*

/** Set value on an input element and fire all required React / Vue events */
function setInputValue(el: HTMLElement | null, value: string): boolean {
  if (!el) return false;
  const input = el as HTMLInputElement;
  try {
    // Native setter override — needed for React-controlled inputs
    const nativeInputSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value',
    )?.set;
    nativeInputSetter?.call(input, value);

    // Fire events React / Vue / Angular expect
    input.dispatchEvent(new Event('input',  { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur',   { bubbles: true }));
    return true;
  } catch {
    input.value = value;
    return true;
  }
}

function setSelectValue(el: HTMLElement | null, value: string): boolean {
  if (!el) return false;
  const select = el as HTMLSelectElement;
  // Try exact match first, then case-insensitive
  const opt = Array.from(select.options).find(
    o => o.value.toLowerCase() === value.toLowerCase() ||
         o.text.toLowerCase()  === value.toLowerCase(),
  );
  if (!opt) return false;
  select.value = opt.value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function getInput(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}

// ─── Field fillers ────────────────────────────────────────────────────────────

function fillNameFields(profile: UserProfile): number {
  let filled = 0;
  const nameParts = profile.fullName.split(' ');
  const firstName = nameParts[0] ?? '';
  const lastName  = nameParts.slice(1).join(' ') || firstName;

  const firstEl = getInput(['input[name="first_name"]', '#first_name']) ??
    findInputByLabel(/first\s*name/i);
  if (setInputValue(firstEl, firstName)) filled++;

  const lastEl = getInput(['input[name="last_name"]', '#last_name']) ??
    findInputByLabel(/last\s*name|surname/i);
  if (setInputValue(lastEl, lastName)) filled++;

  return filled;
}

function fillEmailField(profile: UserProfile): number {
  const el = getInput(['input[name="email"]', '#email', 'input[type="email"]']) ??
    findInputByLabel(/email/i);
  return setInputValue(el, profile.email) ? 1 : 0;
}

function fillPhoneField(profile: UserProfile): number {
  if (!profile.phone) return 0;
  const el = getInput(['input[name="phone"]', '#phone', 'input[type="tel"]']) ??
    findInputByLabel(/phone|mobile|telephone/i);
  return setInputValue(el, profile.phone) ? 1 : 0;
}

function fillLinkedInField(profile: UserProfile): number {
  if (!profile.linkedin) return 0;
  const el = getInput(['input[name="job_application[answers_attributes][0][text_value]"]']) ??
    findInputByLabel(/linkedin/i);
  return setInputValue(el, profile.linkedin) ? 1 : 0;
}

function fillWebsiteField(profile: UserProfile): number {
  if (!profile.website) return 0;
  const el = getInput(['input[name="website"]']) ??
    findInputByLabel(/website|portfolio|github/i);
  return setInputValue(el, profile.website) ? 1 : 0;
}

function fillWorkAuthorization(workAuth: string): number {
  // Greenhouse uses a select for visa/work authorisation
  const el = getInput(['select[name*="visa"]', 'select[name*="sponsor"]']) as HTMLSelectElement ??
    findInputByLabel(/visa|work authorization|right to work/i) as HTMLSelectElement;
  if (!el) return 0;
  return setSelectValue(el, workAuth) ? 1 : 0;
}

function fillCoverLetterField(text: string): number {
  const el = getInput(['textarea[name*="cover"]']) ??
    findInputByLabel(/cover letter/i);
  return setInputValue(el, text) ? 1 : 0;
}

// ─── Main autofill function ────────────────────────────────────────────────────

export interface AutofillResult {
  platform: 'greenhouse';
  filled: number;
  failed: string[];
}

export async function autofillGreenhouse(
  profile: UserProfile,
  options: { fillWorkHistory?: boolean; fillEducation?: boolean; workAuthorisation?: string } = {},
): Promise<AutofillResult> {
  let filled  = 0;
  const failed: string[] = [];

  // ── Personal info ─────────────────────────────────────────────────────────
  filled += fillNameFields(profile);
  filled += fillEmailField(profile);
  filled += fillPhoneField(profile);
  filled += fillLinkedInField(profile);
  filled += fillWebsiteField(profile);

  if (options.workAuthorisation) {
    const n = fillWorkAuthorization(options.workAuthorisation);
    if (n === 0) failed.push('Work authorisation');
    else filled += n;
  }

  // ── Work history ──────────────────────────────────────────────────────────
  if (options.fillWorkHistory && profile.workHistory?.length) {
    // Greenhouse typically has a single text area for additional info
    // Some custom forms have multiple work history fields
    const workSummary = profile.workHistory.map(w => {
      const dates = `${w.startDate} – ${w.current ? 'Present' : w.endDate}`;
      return `${w.title} at ${w.company} (${dates})\n${w.bullets.join('\n')}`;
    }).join('\n\n');

    const el = getInput(['textarea[name*="work"]', 'textarea[name*="history"]']) ??
      findInputByLabel(/work\s*history|experience/i);
    if (setInputValue(el, workSummary)) filled++;
    else failed.push('Work history');
  }

  // ── Education ─────────────────────────────────────────────────────────────
  if (options.fillEducation && profile.education?.length) {
    const edu = profile.education[0]; // Fill with most recent
    const schoolEl = getInput(['input[name*="school"]']) ?? findInputByLabel(/school|university|institution/i);
    if (setInputValue(schoolEl, edu.institution)) filled++;

    const degreeEl = getInput(['input[name*="degree"]']) ?? findInputByLabel(/degree|qualification/i);
    if (setInputValue(degreeEl, edu.degree)) filled++;
  }

  console.log(`[JobIN Autofill Greenhouse] Filled ${filled} fields, failed: ${failed.join(', ') || 'none'}`);

  return { platform: 'greenhouse', filled, failed };
}
