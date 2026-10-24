import * as mammoth from 'mammoth';
import { ExportService } from './export.service';

const resume = `Jordan Taylor
Senior QA Engineer
jordan.taylor@example.com | Manchester, UK

PROFESSIONAL SUMMARY
Quality engineer with experience improving release confidence.

TECHNICAL SKILLS
Automation: Playwright, Cypress

PROFESSIONAL EXPERIENCE
Example Corp | Manchester, UK
Senior QA Engineer | 2022 - Present
• Reduced regression testing time by 40% through automation.

EDUCATION
BSc Computer Science | Example University`;

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').toUpperCase();
}

describe('ExportService ATS resume exports', () => {
  const exporter = new ExportService();
  const options = { title: 'Resume', content: resume, atsFriendly: true };

  it('renders a valid PDF and preserves structured ATS content in DOCX', async () => {
    const pdf = await exporter.generatePdf(options);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');

    const docx = await exporter.generateDocx(options);
    const docxText = normalize((await mammoth.extractRawText({ buffer: docx })).value);

    expect(docxText).toContain('JORDAN TAYLOR');
    expect(docxText).toContain('PROFESSIONAL SUMMARY');
    expect(docxText).toContain('AUTOMATION: PLAYWRIGHT, CYPRESS');
    expect(docxText).toContain('EXAMPLE CORP | MANCHESTER, UK');
    expect(docxText).toContain('SENIOR QA ENGINEER | 2022 - PRESENT');
    expect(docxText).toContain('- REDUCED REGRESSION TESTING TIME BY 40%');
    expect(docxText).toContain('BSC COMPUTER SCIENCE | EXAMPLE UNIVERSITY');
  });

  it('keeps contact and employment details readable and links supplied URLs', async () => {
    const linkedResume = `Jordan Taylor
SENIOR QA ENGINEER
jordan.taylor@example.com | +44 (0)20 7946 0958 | linkedin.com/in/jordantaylor

PROFESSIONAL EXPERIENCE
EXAMPLE CORP | MANCHESTER, UK
SENIOR QA ENGINEER | 2022 - PRESENT
• Automated regression testing.
Portfolio: [GitHub](https://github.com/jordantaylor)`;
    const pdf = await exporter.generatePdf({ ...options, content: linkedResume });
    const pdfSource = pdf.toString('latin1');

    expect(pdfSource).toContain('/URI');
    expect(pdfSource).toContain('mailto:jordan.taylor@example.com');
    expect(pdfSource).toContain('tel:+4402079460958');
    expect(pdfSource).toContain('https://linkedin.com/in/jordantaylor');
    expect(pdfSource).toContain('https://github.com/jordantaylor');

    const latex = exporter.generateLatex({ ...options, content: linkedResume });
    expect(latex).toContain('\\usepackage[colorlinks=true,urlcolor=blue]{hyperref}');
    expect(latex).toContain('\\href{mailto:jordan.taylor@example.com}{jordan.taylor@example.com}');
    expect(latex).toContain('\\href{tel:+4402079460958}{+44 (0)20 7946 0958}');
    expect(latex).toContain(
      '\\href{https://linkedin.com/in/jordantaylor}{linkedin.com/in/jordantaylor}',
    );
    expect(latex).toContain(
      '\\href{https://github.com/jordantaylor}{https://github.com/jordantaylor}',
    );
  });
});
