import type { UserProfile } from '../../shared/types';
import { findInputByLabel } from '../extractor';

// ─── Lever ATS Autofill ────────────────────────────────────────────────────────
// Target: https://jobs.lever.co/*

/** Set value on an input, handling React/Vue controlled inputs */
function setInputValue(el: HTMLElement | null, value: string): boolean {
  if (!el) return false;
  try {
    const input = el as HTMLInputElement;
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value',
    )?.set ?? Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value',
    )?.set;

    nativeSetter?.call(input, value);
    input.dispatchEvent(new Event('input',  { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur',   { bubbles: true }));
    return true;
  } catch {
    (el as HTMLInputElement).value = value;
    return true;
  }
}

function getInput(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}

// ─── Lever-specific field fillers ─────────────────────────────────────────────
// Lever uses a single "name" field (not split), and data-qa attributes

function fillFullName(profile: UserProfile): number {
  const el = getInput([
    'input[name="name"]',
    'input[data-qa="name"]',
    'input[placeholder*="full name" i]',
  ]) ?? findInputByLabel(/^name$|full\s*name/i);
  return setInputValue(el, profile.fullName) ? 1 : 0;
}

function fillEmail(profile: UserProfile): number {
  const el = getInput([
    'input[name="email"]',
    'input[data-qa="email"]',
    'input[type="email"]',
  ]) ?? findInputByLabel(/email/i);
  return setInputValue(el, profile.email) ? 1 : 0;
}

function fillPhone(profile: UserProfile): number {
  if (!profile.phone) return 0;
  const el = getInput([
    'input[name="phone"]',
    'input[data-qa="phone"]',
    'input[type="tel"]',
  ]) ?? findInputByLabel(/phone|mobile/i);
  return setInputValue(el, profile.phone) ? 1 : 0;
}

function fillCurrentCompany(profile: UserProfile): number {
  const currentRole = profile.workHistory?.find(w => w.current);
  if (!currentRole) return 0;
  const el = getInput([
    'input[name="org"]',
    'input[data-qa="org"]',
    'input[name*="company" i]',
  ]) ?? findInputByLabel(/current company|organization|employer/i);
  return setInputValue(el, currentRole.company) ? 1 : 0;
}

function fillCurrentTitle(profile: UserProfile): number {
  const currentRole = profile.workHistory?.find(w => w.current);
  if (!currentRole) return 0;
  const el = findInputByLabel(/current title|job title|role/i);
  return setInputValue(el, currentRole.title) ? 1 : 0;
}

function fillLinkedIn(profile: UserProfile): number {
  if (!profile.linkedin) return 0;
  const el = getInput([
    'input[name="urls[LinkedIn]"]',
    'input[data-qa="linkedin"]',
  ]) ?? findInputByLabel(/linkedin/i);
  return setInputValue(el, profile.linkedin) ? 1 : 0;
}

function fillWebsite(profile: UserProfile): number {
  if (!profile.website) return 0;
  const el = getInput([
    'input[name="urls[Portfolio]"]',
    'input[name="urls[Other]"]',
  ]) ?? findInputByLabel(/website|portfolio|github/i);
  return setInputValue(el, profile.website) ? 1 : 0;
}

function fillVisaSponsor(value: string): number {
  // Lever often has a text input or radio group for visa sponsorship
  const el = getInput([
    'input[name*="visa"]',
    'input[name*="sponsor"]',
  ]) ?? findInputByLabel(/visa|sponsorship|work authorization/i);
  if (!el) return 0;

  if ((el as HTMLInputElement).type === 'checkbox') {
    const checked = value === 'yes';
    if ((el as HTMLInputElement).checked !== checked) el.click();
    return 1;
  }
  return setInputValue(el, value) ? 1 : 0;
}

function fillAdditionalInfo(profile: UserProfile): number {
  if (!profile.workHistory?.length) return 0;
  const summary = profile.workHistory.slice(0, 3).map(w =>
    `${w.title} at ${w.company} (${w.startDate}–${w.current ? 'Present' : w.endDate})`
  ).join('\n');

  const el = getInput(['textarea[name*="additional"]', 'textarea[name*="comment"]']) ??
    findInputByLabel(/additional|comments|anything else/i);
  return setInputValue(el, summary) ? 1 : 0;
}

// ─── Location ─────────────────────────────────────────────────────────────────

function fillLocation(profile: UserProfile): number {
  if (!profile.location) return 0;
  const el = getInput(['input[name="location"]', 'input[data-qa="location"]']) ??
    findInputByLabel(/location|city|where are you/i);
  return setInputValue(el, profile.location) ? 1 : 0;
}

// ─── Main autofill function ────────────────────────────────────────────────────

export interface AutofillResult {
  platform: 'lever';
  filled:   number;
  failed:   string[];
}

export async function autofillLever(
  profile:  UserProfile,
  options:  { workAuthorisation?: string; fillWorkHistory?: boolean } = {},
): Promise<AutofillResult> {
  let filled = 0;
  const failed: string[] = [];

  filled += fillFullName(profile);
  filled += fillEmail(profile);
  filled += fillPhone(profile);
  filled += fillLocation(profile);
  filled += fillCurrentCompany(profile);
  filled += fillCurrentTitle(profile);
  filled += fillLinkedIn(profile);
  filled += fillWebsite(profile);

  if (options.workAuthorisation) {
    const n = fillVisaSponsor(options.workAuthorisation);
    if (n === 0) failed.push('Visa/work authorisation');
    else filled += n;
  }

  if (options.fillWorkHistory) {
    const n = fillAdditionalInfo(profile);
    if (n === 0) failed.push('Additional info / work history');
    else filled += n;
  }

  console.log(`[JobIN Autofill Lever] Filled ${filled} fields, failed: ${failed.join(', ') || 'none'}`);
  return { platform: 'lever', filled, failed };
}
