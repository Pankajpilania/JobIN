import type {
  EvidenceStatus,
  RequirementCategory,
  ResumeProfile,
  TailorResult,
  TailoringReport,
} from './interfaces/ai.interfaces';

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

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, maxLength = 600): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function stringList(value: unknown, maxItems = 40, maxLength = 300): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function parseResumeProfile(value: unknown): ResumeProfile {
  const profile = asRecord(value);
  const skills = asRecord(profile.skills);
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const projects = Array.isArray(profile.projects) ? profile.projects : [];

  return {
    name: stringValue(profile.name, 120) || null,
    emails: stringList(profile.emails, 10, 160),
    phones: stringList(profile.phones, 10, 80),
    urls: stringList(profile.urls, 20, 500),
    summary: stringValue(profile.summary, 1500) || null,
    skills: {
      demonstrated: stringList(skills.demonstrated, 100, 120),
      transferable: stringList(skills.transferable, 100, 120),
    },
    experience: experience
      .map((item) => {
        const entry = asRecord(item);
        return {
          employer: stringValue(entry.employer, 160),
          role: stringValue(entry.role, 160),
          location: stringValue(entry.location, 160) || null,
          dates: stringValue(entry.dates, 120) || null,
          evidence: stringList(entry.evidence, 20, 600),
        };
      })
      .filter((entry) => entry.employer || entry.role)
      .slice(0, 30),
    education: stringList(profile.education, 30, 500),
    certifications: stringList(profile.certifications, 50, 250),
    projects: projects
      .map((item) => {
        const entry = asRecord(item);
        return {
          name: stringValue(entry.name, 180),
          evidence: stringList(entry.evidence, 20, 600),
        };
      })
      .filter((entry) => entry.name)
      .slice(0, 40),
  };
}

const REQUIREMENT_CATEGORIES: RequirementCategory[] = [
  'mandatory_skill',
  'desirable_skill',
  'responsibility',
  'domain_knowledge',
  'experience_expectation',
];
const EVIDENCE_STATUSES: EvidenceStatus[] = ['demonstrated', 'transferable', 'missing'];

function parseTailoringReport(value: unknown): TailoringReport {
  const report = asRecord(value);
  const analysis = asRecord(report.jobAnalysis);
  const assessment = asRecord(report.matchAssessment);
  const requirements = Array.isArray(report.requirements) ? report.requirements : [];
  const missingRequirements = Array.isArray(report.missingRequirements)
    ? report.missingRequirements
    : [];
  const evidenceMap = Array.isArray(report.evidenceMap) ? report.evidenceMap : [];
  const score = Number(assessment.estimatedMatchPercent);

  return {
    jobAnalysis: {
      mandatorySkills: stringList(analysis.mandatorySkills, 50, 120),
      desirableSkills: stringList(analysis.desirableSkills, 50, 120),
      responsibilities: stringList(analysis.responsibilities, 40, 300),
      domainKnowledge: stringList(analysis.domainKnowledge, 30, 160),
      experienceExpectations: stringList(analysis.experienceExpectations, 30, 200),
      keywords: stringList(analysis.keywords, 100, 100),
    },
    requirements: requirements
      .map((item) => {
        const entry = asRecord(item);
        const category = entry.category as RequirementCategory;
        const status = entry.status as EvidenceStatus;
        return {
          requirement: stringValue(entry.requirement, 220),
          category: REQUIREMENT_CATEGORIES.includes(category) ? category : 'mandatory_skill',
          status: EVIDENCE_STATUSES.includes(status) ? status : 'missing',
          sourceEvidence: stringValue(entry.sourceEvidence, 600) || null,
          tailoredEvidence: stringValue(entry.tailoredEvidence, 600) || null,
          explanation: stringValue(entry.explanation, 400),
        };
      })
      .filter((entry) => entry.requirement)
      .slice(0, 100),
    missingRequirements: missingRequirements
      .map((item) => {
        const entry = asRecord(item);
        return {
          requirement: stringValue(entry.requirement, 220),
          explanation: stringValue(entry.explanation, 400),
        };
      })
      .filter((entry) => entry.requirement)
      .slice(0, 60),
    evidenceMap: evidenceMap
      .map((item) => {
        const entry = asRecord(item);
        return {
          tailoredClaim: stringValue(entry.tailoredClaim, 600),
          sourceEvidence: stringValue(entry.sourceEvidence, 600),
        };
      })
      .filter((entry) => entry.tailoredClaim && entry.sourceEvidence)
      .slice(0, 100),
    matchAssessment: {
      estimatedMatchPercent: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0,
      summary: stringValue(assessment.summary, 1200),
      caveats: stringList(assessment.caveats, 20, 400),
    },
  };
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

  const tailoringReport = parseTailoringReport(parsed.tailoringReport);
  const missingKeywords = stringList(parsed.missingKeywords, 100, 100);
  for (const requirement of tailoringReport.missingRequirements) {
    if (
      !missingKeywords.some(
        (keyword) => keyword.toLowerCase() === requirement.requirement.toLowerCase(),
      )
    ) {
      missingKeywords.push(requirement.requirement);
    }
  }

  return {
    tailoredText,
    missingKeywords: missingKeywords.slice(0, 100),
    keywordDensity: parsed.keywordDensity,
    scoreBefore: parsed.scoreBefore,
    scoreAfter: parsed.scoreAfter,
    changesApplied: stringList(parsed.changesApplied, 30, 300),
    resumeProfile: parseResumeProfile(parsed.resumeProfile),
    tailoringReport,
  };
}
