# JobIN visual system

This project uses the Jobright entry in [VoltAgent/awesome-design-md](https://github.com/voltagent/awesome-design-md/tree/main/design-md/jobright) as a visual reference, not as a source of Jobright copy or assets. The current implementation is split between the public homepage, shared dashboard styles, and route-level admin surfaces; the code and `apps/web/src/app/tokens.css` are authoritative where this guidance differs.

## Art direction

JobIN makes a job search feel like a clear sequence of next steps. Show the product doing useful work: searchable example roles, a match preview, CV alignment, an application tracker and interview prompts. Label illustrative listings and UI data as examples. Do not publish invented customer counts, endorsements, ratings or outcomes.

The landing-page composition follows Taste Skill's `product-performs` direction: a short left-aligned message beside a readable product fragment, followed by varied feature sections. The current homepage preview roles are static sample data and are labeled as examples; the authenticated `/job-search` page uses the API catalogue. Keep filters and signup/search links functional. Review at desktop and phone widths after visual changes.

## Tokens

- **Ink:** `#111512`; white canvas `#FFFFFF`.
- **Signature mint:** `#00D991`, with pale mint `#EDFFE5` for section fields and highlights.
- **Secondary text:** `#3D4942`; muted labels `#68756D`; hairline `#DCE5DE`.
- **Display:** Titillium Web, bold, with compact line-height and tight tracking.
- **Body and interface:** Inter, regular to semibold. Keep readable body copy at 14px or larger outside compact interface fragments.
- **Actions:** black pill for the primary action; mint pill reserved for the closing action. Links use ink, with mint used sparingly.
- **Surfaces:** use white/paper fields, subtle hairlines and sparse cards as the base. The public homepage intentionally uses a soft mint gradient and restrained glass/motion treatments in its hero; do not apply those effects indiscriminately to data-dense dashboard screens. Use shadows only where the active surface system defines them.

## Product fragments

Fragments should be built from readable HTML and use plausible, clearly labelled example content. Use the existing product terms: matches, resumes, applications, cover letters, interview preparation. Keep their controls accessible and useful at phone widths.

## Motion and access

The homepage has entrance and ambient hero motion; respect `prefers-reduced-motion` and keep functional content legible without animation. Maintain visible keyboard focus, labelled inputs, text contrast, and touch-friendly controls. Dashboard/admin motion should stay restrained and must not block use without animation.
