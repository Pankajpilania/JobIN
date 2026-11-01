# Motion and Liquid Glass Coverage Matrix

**Audit date:** 2026-11-01
**Scope:** Source-level coverage for the web app, mobile website, and Chrome extension. This is an implementation inventory, not a cross-browser/performance certification.

## Cell status

- **PASS:** consistent implementation is evident for the surface/route.
- **PARTIAL:** some coverage exists, but not consistently across all relevant elements or states.
- **FAIL:** expected support is absent or contradicted by observed/source evidence.
- **N/A:** no meaningful UI for that surface.
- In route rows, **Entrance**, **Micro**, **Transition**, **Loading**, **Glass**, **Reduced**, and **Mobile** correspond to (a) entrance animation, (b) hover/press/focus micro-interactions, (c) route transition, (d) loading/skeleton motion, (e) liquid glass, (f) reduced-motion fallback, and (g) mobile variant.
- PASS/PARTIAL means code-level evidence, not proof of correct rendered effects or accessibility.

## Web route matrix

| Route | Entrance | Micro | Transition | Loading | Glass | Reduced | Mobile |
|---|---|---|---|---|---|---|---|
| `/` | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/careers` | PASS | PASS | PARTIAL | N/A | PARTIAL | PASS | PARTIAL |
| `/jobs` | N/A | N/A | N/A | N/A | N/A | N/A | PARTIAL |
| `/about` | PARTIAL | PARTIAL | PARTIAL | N/A | PARTIAL | PARTIAL | PARTIAL |
| `/extension` | PARTIAL | PARTIAL | PARTIAL | N/A | PARTIAL | PARTIAL | PARTIAL |
| `/support` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/contact` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/sign-in` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PASS* | PARTIAL | PARTIAL |
| `/sign-up` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PASS* | PARTIAL | PARTIAL |
| `/auth/login` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/auth/signup` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/admin-login` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/forgot-password` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PASS* | PARTIAL | PARTIAL |
| `/reset-password` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PASS* | PARTIAL | PARTIAL |
| `/auth/callback` | N/A | N/A | PARTIAL | N/A | N/A | N/A | N/A |
| `/dashboard` | PASS | PASS | PASS | PARTIAL | PASS* | FAIL | PARTIAL |
| `/job-search` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/tracker` | PASS | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/resume` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/resumes` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/resumes/[id]` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/tailor` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/cover-letter` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/interview` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/settings` | PASS | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/upgrade` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/admin` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/admin/ai-settings` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/admin/ai-usage` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/admin/billing` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/admin/payment-settings` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/admin/subscriptions` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/admin/tickets` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `/admin/users` | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| Global error / fallback 404 | FAIL | PARTIAL | PARTIAL | N/A | FAIL | FAIL | PARTIAL |

`*` Authentication cards use the shared `Card` component, which adds blur on that card; surrounding page controls and states do not consistently use a shared glass layer.

## Web design-system findings

### Tokens and visual language

- `apps/web/src/app/globals.css` contains a legacy indigo token set near the top and a later green JobIN token override. Tailwind tokens are separately hardcoded in `apps/web/tailwind.config.ts`; extension tokens are separately defined. This is not a single source of truth.
- Shared `Card` applies a translucent white background and `backdrop-filter` blur/saturation. The `app-glass-card` class and several landing/dashboard rules add glass treatment, but many raw inline surfaces, dialogs, tables, admin panels, inputs, and route-specific cards bypass it.
- Glass values are partly hardcoded in component/CSS rules. No shared `--glass-*` token family, `glass`/`glass-strong`/`glass-subtle` primitive layer, refraction/SVG filter, pointer-follow sheen utility, reduced-transparency fallback, or `@supports not` fallback was found.
- Dark-color-scheme rules are declared more than once; the later JobIN block explicitly sets light values even in dark mode. Effective dark mode is therefore not a consistent supported theme.
- Layer depth is not measured or constrained; a Card inside another blurred region may stack filters. Large lists can use the general interactive Card primitive.

### Motion and reduced motion

- Framer Motion is present, but route usage is local (dashboard shell, selected pages, sidebar, dialogs); public routes do not share a global MotionConfig/provider.
- CSS includes a global route-enter animation and marketing scroll reveals, while the new `/careers` page uses its own CSS module. There is no single app-wide motion module governing all routes/components.
- The main global reduced-motion rule disables animations/transitions, but dashboard `AnimatedNumber` schedules requestAnimationFrame without a reduced-motion check. Reduced-motion behavior is consequently not consistent for scripted animations.
- Loading motion is mixed: `Skeleton` uses Tailwind `animate-pulse`, some routes use plain text, and dashboard layout has a spinner. No shared shimmer policy or motion-level cap is established.
- Glass sheen/ambient animations exist in selected web surfaces; these are not universally gated by `prefers-reduced-motion` or reduced-transparency.

## Chrome extension matrix

Source-level extension findings are from `apps/extension`; no Chrome runtime test was performed.

| Surface | Entrance | Micro | Transition | Loading | Glass | Reduced | Mobile / narrow |
|---|---|---|---|---|---|---|---|
| Popup | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PASS | PASS | FAIL |
| Side panel | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PASS | PASS | PARTIAL |
| Options | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PASS | PASS | PARTIAL |
| Content badge / injected tip | PARTIAL | PARTIAL | N/A | PARTIAL | PASS | PASS | PARTIAL |
| Background service worker | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Manifest/host integration | N/A | N/A | N/A | N/A | N/A | N/A | PARTIAL |

### Extension evidence and gaps

- Extension light-theme tokens and glass/motion styles live in `apps/extension/src/styles/global.css`; reduced-motion overrides are present. UI is not sharing the web CSS token source at build time.
- Popup width is fixed at 380px and overflow is hidden; extension styling has a 300px minimum width and no responsive breakpoint was found. Side-panel content scrolls within a fixed-height shell.
- The injected job-match badge is in Shadow DOM, isolating host-page styles. The ATS helper tip and fixed badge can still obscure host controls or narrow viewport content; no browser/device coverage is recorded.
- Popup resume selection has no evidenced scoring calculation/use, and the injected badge can remain at “Analysing…”; autofill code exists for supported boards but no extension-UI `START_AUTOFILL` dispatch was found.
- Options expose a badge visibility preference, but content code injects the badge unconditionally. Worker install/update logic resets side-panel-on-detect to true.
- Manifest and detector support do not fully align (including Workday/Indeed/CV-Library/Monster coverage); `declarativeNetRequest` and `scripting` permissions appear unused in inspected source.
- See the full evidence and prioritized extension recommendations in the separate source review summarized in this matrix: manifest, `src/popup/App.tsx`, `src/sidepanel/App.tsx`, `src/options/App.tsx`, `src/content/index.ts`, `src/content/badge.ts`, `src/content/autofill/index.ts`, and `src/background/service-worker.ts`.

## Mobile website and responsive checks

| Check | Result | Boundary |
|---|---|---|
| Separate mobile app/source folder | Not found | Responsive web app is the mobile surface. |
| Viewport/PWA metadata | No explicit viewport/manifest declaration found | Next.js browser defaults apply; no install flow audited. |
| Shared CSS breakpoints | Present at 900px/768px/680px and page-specific thresholds | Rules do not prove every route/interaction works at each width. |
| `/careers` horizontal overflow | No overflow observed at 360, 390, 430, 768px | Local browser DOM check on this route only. |
| `/careers` navigation | Drawer opens, initially focuses an element inside, Escape closes | Full Tab-cycle, restoration, and assistive-technology tests not run. |
| Dashboard side navigation | Mobile open/backdrop/close paths present in source | No route-by-route touch test performed. |
| Touch targets / safe areas / iOS inputs | Untested; no app-wide minimum-target/safe-area policy found | Some inline inputs use 14px or smaller, below the requested 16px iOS-zoom threshold. |
| Mobile performance / CPU-throttled scrolling | Untested | No trace/Lighthouse/60fps evidence. |

## Prioritized coverage plan

1. **P0 — Authentication recovery:** fix reset route access first; then add a browser test of the full reset path.
2. **P1 — Shared motion/glass foundation:** unify tokens and reusable primitives across web/extension; standardize route transitions, reduced motion/transparency and browser fallbacks.
3. **P1 — Critical journey test suite:** web E2E for auth, search, resume, tracker, support, checkout, admin; extension tests for install, messages, storage, autofill, and injected UI.
4. **P1 — Extension behavior gaps:** connect autofill UI dispatch, make preferences authoritative, fix incomplete match loading/scoring, reconcile manifest and detector coverage.
5. **P2 — Responsive/accessibility matrix:** test all public and authenticated page groups at 360/390/430/768/1024/1280, keyboard and screen-reader states, focus management, reduced motion, and light/dark.
6. **P2 — Visual/performance/cross-browser:** screenshot baselines; Chromium/Firefox/WebKit glass fallbacks; reduced-transparency fallback; Lighthouse/CLS/LCP and throttled scroll tracing.
7. **P3 — Audit automation/reporting:** add scoped source checks and CI gates only after establishing maintainable rules and tests; broad regex lint checks should not be used as substitutes for browser behavior tests.

## Phase 1 conclusion

Audit files completed: `route-inventory.md`, `feature-matrix.md`, and `motion-glass-coverage.md`. The largest immediate issue is the unauthenticated password-reset redirect. The largest cross-cutting gap is lack of a shared, tested motion/glass system and lack of web/extension E2E coverage. No code was changed in this audit phase.
