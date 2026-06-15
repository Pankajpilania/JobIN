# UI/UX Wireframes & Visual Theme — JobIN

This document defines the visual layout parameters, core styling configurations, and key interface schemas for the JobIN ecosystem.

---

## 1. Design System & Style Guide

JobIN adopts a sleek, high-contrast, **dark-mode first design system** that feels responsive, clean, and premium, utilizing glassmorphism overlays and vibrant cyan/violet glowing indicators.

### 1.1 Color Tokens (CSS Variables)

```css
:root {
  /* Dark Mode Palette (Default) */
  --background: 224 25% 4%;       /* Deep Slate-Black */
  --foreground: 210 40% 98%;      /* Ice White */
  --card: 224 25% 7%;             /* Muted Slate Grey */
  --card-foreground: 210 40% 98%;
  
  --popover: 224 25% 7%;
  --popover-foreground: 210 40% 98%;
  
  /* Primary & Accent Gradients */
  --primary: 217.2 91.2% 59.8%;   /* Royal Neon Blue */
  --primary-foreground: 222.2 47.4% 11.2%;
  
  --accent: 263.4 70% 50.4%;       /* Electric Indigo */
  --accent-foreground: 210 40% 98%;
  
  /* Status Color Mappings */
  --success: 142.1 76.2% 36.3%;   /* Glowing Emerald Green */
  --warning: 38 92% 50%;          /* Soft Amber Alert */
  --destructive: 0 84.2% 60.2%;   /* Muted Crimson */
  
  /* Borders and Inputs */
  --border: 217.2 32.6% 17.5%;    /* Thin Ice-Slate Outline */
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;
  
  --radius: 0.75rem;              /* Rounded corners */
}
```

### 1.2 Typography & Shadows
*   **Fonts:** Primary headings set in **Outfit** (dynamic, modern geometric sans-serif); body copy set in **Inter** (highly readable at micro-scales).
*   **Shadows:** Focus elements use a glowing soft border effect (`box-shadow: 0 0 15px rgba(59, 130, 246, 0.15)`).

### 1.3 Micro-Animations (Framer Motion Configs)
*   **Page Transitions:** Muted sliding fade-in to prevent layout shifts.
    ```javascript
    export const pageTransition = {
      initial: { opacity: 0, y: 15 },
      animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
      exit: { opacity: 0, y: -15 }
    };
    ```
*   **Hover Scaling:** Interactive buttons scale gently by 2% on hover (`whileHover={{ scale: 1.02 }}`) and contract on click (`whileTap={{ scale: 0.98 }}`).

---

## 2. ASCII Wireframe Mockups

### 2.1 User Candidate Dashboard

```
+-----------------------------------------------------------------------------------+
| [JobIN logo]   Search: [ Node.js Engineer... ]   (Credits: 420)   [John Doe (JD)] |
+-----------------------------------------------------------------------------------+
|  (Sidebar)   |  WELCOME BACK, JOHN!                                               |
|  [D] Board   |  "Track your application status and matching metrics in real time."|
|  [R] Resumes |                                                                    |
|  [C] Copilot |  +--------------------+ +--------------------+ +-----------------+ |
|  [I] Mock    |  | Submitted (Month)  | | Active Interviews  | | Resume Health | |
|  [T] Tickets |  |   24 applications  | |    3 scheduled     | |  84% - Good   | |
|  [S] Settings|  +--------------------+ +--------------------+ +-----------------+ |
|              |                                                                    |
|              |  RECOMMENDED FOR YOU (AI Match Feed)                               |
|              |  +---------------------------------------------------------------+ |
|              |  | Senior Node.js dev | Netflix | London | Match: 96% | [Tailor] | |
|              |  | Skills: AWS, TypeScript, Redis. Skilled Worker Visa Sponsored | |
|              |  +---------------------------------------------------------------+ |
|              |  | Backend Engineer   | Deliveroo| Hybrid | Match: 88% | [Tailor] | |
|              |  | Skills: NestJS, Postgres, REST APIs.                          | |
|              |  +---------------------------------------------------------------+ |
+--------------+--------------------------------------------------------------------+
```

### 2.2 Job Tracker Board (Kanban View)

```
+-----------------------------------------------------------------------------------+
|  [+] Add Custom Job           Filter: [ All Locations v]       Toggle: [ Kanban v]|
+-----------------------------------------------------------------------------------+
|  SAVED (4)         | APPLIED (12)       | INTERVIEW (2)      | OFFER (1)          |
|  +---------------+ | +---------------+  | +---------------+  | +---------------+  |
|  | Google        | | | Vercel        |  | | Retool        |  | | Stripe        |  |
|  | Tech Lead     | | | Front-End Dev |  | | Systems Dev   |  | | Staff Engineer|  |
|  | Match: 92%    | | | Applied: 6/12 |  | | Date: June 18 |  | | Base: £120k   |  |
|  | [Edit] [Move] | | | [Edit] [Move] |  | | [Edit] [Move] |  | | [Accept]      |  |
|  +---------------+ | +---------------+  | +---------------+  | +---------------+  |
|  | OpenAI        | | | Resend        |  | | Monzo         |  |                    |
|  | ML Engineer   | | | Dev Rel       |  | | Backend Dev   |  |                    |
|  | Match: 78%    | | | Applied: 6/10 |  | | Date: June 22 |  |                    |
|  +---------------+ | +---------------+  | +---------------+  |                    |
+--------------------+--------------------+--------------------+--------------------+
```

### 2.3 Chrome Extension Side Panel ("JobIN Copilot")

```
+------------------------------------+
|  JobIN Copilot         [Config/MFA] |
+------------------------------------+
|  DETECTED OPENING:                 |
|  "Senior Software Dev" - Bloomberg |
+------------------------------------+
|  OVERALL ATS MATCH SCORE:          |
|            +---------+             |
|            |   91%   |             |
|            +---------+             |
|        Category Breakdown:         |
|  Skills: 94%       Keywords: 88%   |
|  Experience: 90%   ATS Parse: 92%  |
+------------------------------------+
|  [ Missing Keywords ]              |
|  * Docker (Place in bullet #3)     |
|  * GraphQL (Place in Skills)       |
+------------------------------------+
|  ACTIONS:                          |
|  [ Autofill Application ]          |
|  [ Generate Tailored Resume (6s) ] |
|  [ Generate Custom Cover Letter ]  |
+------------------------------------+
|  CONNECTIONS AT BLOOMBERG:         |
|  * Sarah Green (Alumni, Imperial)  |
|    [Draft Intro Outreach Message]  |
+------------------------------------+
```

### 2.4 Admin Portal User Management Panel

```
+-----------------------------------------------------------------------------------+
|  Admin Console  [Users]  [Billing]  [AI Settings]  [Tickets]  [Audits]   [Logout] |
+-----------------------------------------------------------------------------------+
|  Search Users: [ candidate@gmail...  ]    Filter Status: [ Active   v ]   [Search]|
+-----------------------------------------------------------------------------------+
|  ID   | Name     | Email            | Subscription | Credits | Status   | Actions |
|  -----+----------+------------------+--------------+---------+----------+---------|
|  010d | John Doe | john@gmail.com   | Pro (£29/m)  | 500     | ACTIVE   | [Manage]|
|  011a | Jane Lin | jlin@gmail.com   | Free         | 0       | SUSPENDED| [Manage]|
|  012c | Rob West | rob@alpha.co     | Enterprise   | 9999    | ACTIVE   | [Manage]|
|       |          |                  |              |         |          |         |
+-----------------------------------------------------------------------------------+
|  Actions Triggered for Selected User:                                             |
|  [ Suspend Account ]   [ Assign +100 Credits ]   [ Force Logout/Invalidate JWT ]  |
|  [ Impersonate User Session (Audited Log #882) ]   [ GDPR Purge User Account ]    |
+-----------------------------------------------------------------------------------+
```
