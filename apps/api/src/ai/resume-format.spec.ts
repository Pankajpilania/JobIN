import { normalizeTailoredResume, parseTailorResult } from './resume-format';

describe('resume formatting', () => {
  it('normalizes spacing and separates inline bullets without changing content', () => {
    const formatted = normalizeTailoredResume(
      '```text\r\n## JORDAN TAYLOR  \r\nSENIOR QA ENGINEER | 2022 - PRESENT • Improved regression testing\r\nprofessional experience\r\n▪ Added browser automation\r\n```',
    );

    expect(formatted).toBe(
      'JORDAN TAYLOR\nSENIOR QA ENGINEER | 2022 - PRESENT\n• Improved regression testing\n\nPROFESSIONAL EXPERIENCE\n\n• Added browser automation',
    );
  });

  it('rejects incomplete or out-of-range AI result data', () => {
    expect(() =>
      parseTailorResult({
        tailoredText: 'Jordan Taylor',
        missingKeywords: [],
        keywordDensity: {},
        scoreBefore: 101,
        scoreAfter: 70,
        changesApplied: [],
      }),
    ).toThrow('AI returned incomplete or invalid tailoring data');
  });
});
