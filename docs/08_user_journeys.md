# User Journeys — JobIN

This document defines the core user flows through the JobIN ecosystem, detailing system actions, entry points, verification processes, and feedback triggers.

---

## Journey 1: New Candidate Onboarding

**Goal:** Register, parse base resume, configure filters, view initial job match feeds, and install the extension helper.

```
+------------+      +---------------+      +-------------------+      +------------------+
| Sign Up    | ---> | Upload Resume | ---> | Parse & Analyze   | ---> | Job Match Feed   |
| OAuth/Pass |      | Drag & Drop   |      | Show Health Score |      | Show 90%+ Matches|
+------------+      +---------------+      +-------------------+      +------------------+
                                                                               |
                                                                               v
                                                                      +------------------+
                                                                      | Extension Invite |
                                                                      | Chrome Store Link|
                                                                      +------------------+
```

### Detailed Sequence
1.  **Entry Point:** Candidate lands on `https://jobin.ai/onboard` via search or marketing page.
2.  **Registration:** Clicks "Sign Up". System renders the Clerk Authentication modal. User chooses Google OAuth or inputs email and password.
3.  **Resume Ingestion:** Dashboard displays a drag-and-drop workspace: *"Upload your current CV/Resume (PDF/DOCX)"*. User drops `CV_2026.pdf`.
4.  **Parsing Processing:** Next.js sends file to `/resumes/upload`. NestJS passes to S3, extracts text using pdf-parse, embeds via OpenAI API, and runs the initial ATS evaluation. (Total duration: 3.5 seconds).
5.  **Health Dashboard Display:** Renders Resume Health Score (e.g., *72/100*), highlighting missing certifications and layout issues.
6.  **Preference Configuration:** Candidate configures filters:
    *   Job Title: "Full Stack Developer"
    *   Locations: "London, UK" or "Remote"
    *   Visa: Toggle "Skilled Worker Visa Sponsor Required" to **ON**.
7.  **Match Feed Delivery:** System queries Elasticsearch + Pinecone using preferences and CV vectors, rendering matching jobs instantly.
8.  **Extension Hook:** Prompt overlays on-screen: *"Install the Chrome Extension to apply with 1-click."* with a direct link to the Chrome Web Store.

---

## Journey 2: Extension Autofill Workflow (LinkedIn)

**Goal:** Apply to a live role on LinkedIn, review match scores, customize resume assets, and autofill the Greenhouse ATS application form.

```
Candidate browses job on LinkedIn
       |
Extension side panel automatically displays ATS score (e.g., 91%)
       |
User reviews missing keywords and clicks "Apply with JobIN"
       |
Side panel triggers backend resume tailoring in under 10 seconds
       |
User reviews changes and clicks "Autofill Form"
       |
Content script populates Greenhouse input fields and uploads tailored PDF
       |
Application status in Web App automatically changes to "Applied"
```

### Detailed Sequence
1.  **Job Detection:** Candidate browses to a LinkedIn job page.
2.  **Extension Activation:** The background service worker detects the page pattern `linkedin.com/jobs/view/*`. It injects the Content Script, parses the job title, company name, and job description, and displays the JobIN side panel.
3.  **Match Calculation:** The panel queries the backend to calculate the ATS Match Score and presents the Category Breakdowns (Skills, Experience, Education).
4.  **Tailoring Trigger:** Candidate clicks "Generate Tailored Resume". The side panel sends a POST request to `/resumes/tailor`.
5.  **Asset Generation:** The backend tailoring engine generates a customized PDF version with missing keywords added and experience bullets optimized using the XYZ formula. (Total duration: 6 seconds).
6.  **Autofill Injection:** Candidate clicks "Autofill Application". The extension matches the application form fields and injects data (name, work details, tailored PDF CV link).
7.  **Submission Tracking:** When candidate submits the form, the content script intercepts the submission and notifies the backend, updating the job tracking board column to **Applied**.

---

## Journey 3: Support Response & Audit Trail (Admin)

**Goal:** Resolve a billing ticket, issue manual credits, and log the action securely.

### Detailed Sequence
1.  **Ticket Ingestion:** Candidate submits a support ticket: *"Failed billing retry left account on Free Tier"*. Status becomes **OPEN**.
2.  **Console Access:** Administrator logs into the Admin Portal (`https://admin.jobin.ai`) utilizing Clerk credentials with MFA verification.
3.  **Lookup:** Admin navigates to "Support Inbox", selects the ticket, and clicks "View User Profile" for the submitting candidate.
4.  **Inspection & Action:** Admin views user's payments tab (queries Stripe metrics showing failed retry due to card expiry). Clicks "Override Plan Tier" -> upgrades user to Pro and issues +200 manual AI credit points.
5.  **Auditing Write:** The NestJS controller executes updates to `subscriptions` and `ai_credits` in PostgreSQL, then writes to `audit_logs`:
    *   `userId`: "Admin-999"
    *   `ipAddress`: "192.168.1.5"
    *   `action`: "user.credit_override"
    *   `beforeState`: `{ "credits": 0, "tier": "FREE" }`
    *   `afterState`: `{ "credits": 200, "tier": "PRO" }`
6.  **Ticket Closure:** Admin replies to candidate inside ticket inbox: *"Your card was expired. We have temporarily upgraded you to Pro and added 200 credits while you update payment info."* Sets ticket status to **RESOLVED**.
