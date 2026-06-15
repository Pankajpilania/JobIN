# API Specifications — JobIN

**Base URL:** `https://api.jobin.ai/v1`  
**Authentication:** Bearer JWT tokens in the `Authorization: Bearer <token>` header.

---

## 1. Authentication Endpoints (`/auth`)

### 1.1 User Registration
*   **Endpoint:** `POST /auth/register`
*   **Auth Required:** No
*   **Request Body:**
    ```json
    {
      "email": "candidate@example.com",
      "password": "SecurePassword123!",
      "fullName": "John Doe"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "User registered successfully",
      "userId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
    }
    ```

### 1.2 User Login
*   **Endpoint:** `POST /auth/login`
*   **Auth Required:** No
*   **Request Body:**
    ```json
    {
      "email": "candidate@example.com",
      "password": "SecurePassword123!"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 86400,
      "user": {
        "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "email": "candidate@example.com",
        "fullName": "John Doe",
        "role": "CANDIDATE"
      }
    }
    ```

---

## 2. Resumes & optimization (`/resumes`)

### 2.1 Upload Resume
*   **Endpoint:** `POST /resumes/upload`
*   **Auth Required:** Yes
*   **Content-Type:** `multipart/form-data`
*   **Request Params:** File upload via key `resume` (PDF or DOCX max 10MB).
*   **Response (201 Created):**
    ```json
    {
      "id": "e30d1c7f-f77d-4228-b0a7-bcceb0f023ad",
      "title": "John_Doe_Resume_2026.pdf",
      "s3Url": "https://s3.eu-west-2.amazonaws.com/jobin-resumes/e30d1c7f.pdf",
      "atsScore": 68
    }
    ```

### 2.2 Tailor Resume to Job Description
*   **Endpoint:** `POST /resumes/tailor`
*   **Auth Required:** Yes
*   **Request Body:**
    ```json
    {
      "resumeId": "e30d1c7f-f77d-4228-b0a7-bcceb0f023ad",
      "jobDescription": "Looking for a Node.js software engineer with experience in AWS EKS and Redis..."
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "tailoredResumeId": "8aef3e21-5a41-4566-a36c-2f22bdcde11a",
      "tailoredS3Url": "https://s3.eu-west-2.amazonaws.com/jobin-resumes/8aef3e21.pdf",
      "atsScoreBefore": 68,
      "atsScoreAfter": 94,
      "changesMade": {
        "summary": "Realigned executive summary to emphasize Next.js, EKS architectures.",
        "bulletPointsModified": [
          "Accomplished a 35% reduction in search latency (X) measured by APM metrics (Y) by implementing Redis session caches (Z)"
        ]
      },
      "missingKeywords": ["Kubernetes", "TypeScript Types"],
      "keywordDensity": [
        { "keyword": "Node.js", "count": 6, "density": "2.4%" }
      ]
    }
    ```

---

## 3. Job Tracking & Operations (`/applications`)

### 3.1 Get Applications
*   **Endpoint:** `GET /applications`
*   **Auth Required:** Yes
*   **Query Parameters:**
    *   `status` (Optional, e.g., `APPLIED`, `OFFER`)
*   **Response (200 OK):**
    ```json
    [
      {
        "id": "3c41ef5e-d2b3-4f51-b873-6302ed19bb11",
        "status": "APPLIED",
        "jobListing": {
          "title": "Software Engineer",
          "companyName": "Acme Corp",
          "location": "London, UK"
        },
        "appliedDate": "2026-06-13T12:00:00Z"
      }
    ]
    ```

### 3.2 Create Job Tracker Card
*   **Endpoint:** `POST /applications`
*   **Auth Required:** Yes
*   **Request Body:**
    ```json
    {
      "jobTitle": "Lead Architect",
      "companyName": "AlphaTech",
      "location": "Remote, UK",
      "status": "SAVED",
      "description": "Full-stack cloud application setup details..."
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "id": "0d99ef87-1234-45aa-bbcc-0987654321ab",
      "status": "SAVED",
      "jobTitle": "Lead Architect",
      "companyName": "AlphaTech"
    }
    ```

### 3.3 Update Application Status
*   **Endpoint:** `PATCH /applications/{id}`
*   **Auth Required:** Yes
*   **Request Body:**
    ```json
    {
      "status": "INTERVIEW",
      "appliedDate": "2026-06-13T13:30:00Z"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "id": "0d99ef87-1234-45aa-bbcc-0987654321ab",
      "status": "INTERVIEW"
    }
    ```

---

## 4. AI Career & Interview Coach (`/ai`)

### 4.1 Chat with JobIN Copilot
*   **Endpoint:** `POST /ai/copilot/chat`
*   **Auth Required:** Yes
*   **Request Body:**
    ```json
    {
      "message": "How do I negotiate a base salary starting at £75,000?",
      "sessionId": "optional-uuid-for-history"
    }
    ```
*   **Response (200 OK - supports Server-Sent Events/Streaming):**
    ```json
    {
      "response": "Here is a script to approach the recruiter: 'Thank you for this offer! Given my experience in EKS migrations...'",
      "sessionId": "4567-89ab-cdef"
    }
    ```

### 4.2 Start AI Mock Interview Session
*   **Endpoint:** `POST /ai/interview/start`
*   **Auth Required:** Yes
*   **Request Body:**
    ```json
    {
      "roleTitle": "Data Scientist",
      "companyName": "DeepMind",
      "jobDescription": "Looking for research developers..."
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "sessionId": "5a22bbcc-1234-4aab-bbcc-123456789abc",
      "firstQuestion": "Can you describe a machine learning project where you directly improved business throughput? Detail your metrics."
    }
    ```

---

## 5. Support Tickets & Admin Operations (`/admin` / `/support`)

### 5.1 Create Support Ticket
*   **Endpoint:** `POST /support/tickets`
*   **Auth Required:** Yes
*   **Request Body:**
    ```json
    {
      "subject": "Billing issue on Pro tier",
      "description": "Double charged during renewal."
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "ticketId": "aa43efd2-34ef-4b21-ad2c-12345678abcd",
      "status": "OPEN"
    }
    ```

### 5.2 Admin - Suspend User
*   **Endpoint:** `POST /admin/users/{id}/suspend`
*   **Auth Required:** Yes (Admin role check)
*   **Request Body:**
    ```json
    {
      "reason": "Abuse of AI credits API scraping templates",
      "durationDays": 30
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "userId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "status": "SUSPENDED",
      "suspendedUntil": "2026-07-13T13:34:00Z"
    }
    ```
