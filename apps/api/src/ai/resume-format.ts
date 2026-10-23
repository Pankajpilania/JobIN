import type { TailorResult } from './interfaces/ai.interfaces';

const SECTION_HEADINGS = new Set([
  'summary',
  'professional summary',
  'profile',
  'professional profile',
  'objective',
  'experience',
  'work experience',
  'professional experience',
  'employment history',
  'education',
  'skills',
  'technical skills',
  'core skills',
  'certifications',
  'licenses',
  'projects',
  'personal projects',
  'achievements',
  'awards',
  'publications',
  'volunteer experience',
  'languages',
  'interests',
  'references',
  'additional information',
  'additional skills',
  'areas of expertise',
  'career summary',
  'core competencies',
  'key achievements',
  'selected projects',
  'soft skills',
  'technical proficiencies',
]);

export function normalizeTailoredResume(text: string): string {
  const cleaned = text
    .replace(/^\s*```(?:text|plaintext)?\s*$/gim, '')
    .replace(/\r\n?/g, '\n')
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/(?<=\S)[ \t]+[•‣▪][ \t]*/g, '\n• ')
    .replace(/^[ \t]*[‣▪][ \t]*/gm, '• ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const lines = cleaned.split('\n');
  const formatted: string[] = [];
  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    const heading = line.replace(/:$/, '').trim();
    if (SECTION_HEADINGS.has(heading.toLowerCase())) {
      while (formatted[formatted.length - 1] === '') formatted.pop();
      if (formatted.length) formatted.push('');
      formatted.push(heading.toUpperCase());
      if (lines[index + 1]?.trim()) formatted.push('');
    } else {
      formatted.push(line);
    }
  });

  return formatted
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function isKeywordDensity(value: unknown): value is Record<string, number> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (count) => typeof count === 'number' && Number.isInteger(count) && count >= 0,
    )
  );
}

export function parseTailorResult(value: unknown): TailorResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('AI returned an invalid tailoring response');
  }

  const parsed = value as Record<string, unknown>;
  if (
    typeof parsed.tailoredText !== 'string' ||
    !parsed.tailoredText.trim() ||
    !isStringArray(parsed.missingKeywords) ||
    !isKeywordDensity(parsed.keywordDensity) ||
    !isScore(parsed.scoreBefore) ||
    !isScore(parsed.scoreAfter) ||
    !isStringArray(parsed.changesApplied)
  ) {
    throw new Error('AI returned incomplete or invalid tailoring data');
  }

  const tailoredText = normalizeTailoredResume(parsed.tailoredText);
  if (!tailoredText) throw new Error('AI returned an empty tailored resume');

  return {
    tailoredText,
    missingKeywords: parsed.missingKeywords,
    keywordDensity: parsed.keywordDensity,
    scoreBefore: parsed.scoreBefore,
    scoreAfter: parsed.scoreAfter,
    changesApplied: parsed.changesApplied,
  };
}
