# Page Pulse ⚡

> **Instant Full-Stack Website SEO & Performance Audit Engine**  
> Real-time website diagnostic tool that evaluates HTTP response metrics, HTML DOM structure, heading hierarchies, image accessibility, body word count, and anti-bot protection mechanisms.

---

## 📋 Table of Contents
- [Overview](#-overview)
- [Quickstart & Setup](#-quickstart--setup)
- [API Contract](#-api-contract)
- [Design Decisions & Reasoning](#-design-decisions--reasoning)
- [Testing Suite](#-testing-suite)
- [Project Architecture](#-project-architecture)
- [License](#-license)

---

## 🌟 Overview

**Page Pulse** is a decoupled full-stack website analysis platform built with a **Node.js / Express** backend and a **React 18 / Vite** frontend styled with custom Vanilla CSS glassmorphism. It audits any target URL in real time, delivering multi-factor SEO and website health scores along with actionable summary diagnostics.

---

## 💻 Quickstart & Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

---

### Option 1: Automated Launch (Windows)
Double-click [`run.bat`](file:///d:/PP%20A/page-pulse/run.bat) in the project root. This automatically:
1. Installs backend and frontend dependencies (if not present).
2. Launches the backend server on `http://localhost:3000`.
3. Launches the frontend Vite dev server on `http://localhost:5173`.
4. Opens `http://localhost:5173` in your default web browser.

---

### Option 2: Manual Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/Ikshita07-ops/Page-Pulse.git
cd Page-Pulse
```

#### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
```
*The backend server will start on `http://localhost:3000`.*

#### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
*The frontend application will run on `http://localhost:5173`.*

---

### Environment Configuration

#### Backend Environment Variables (`backend/.env`)
```env
PORT=3000
NODE_ENV=development
```

#### Frontend Environment Variables (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## 🔌 API Contract

### Endpoint: `POST /api/audit`

Audits the provided URL and returns HTTP connectivity metrics, HTML DOM analysis, anti-bot protection detection, and calculated performance scores.

---

### Request

#### Headers
`Content-Type: application/json`

#### Request Body Schema
| Field | Type | Required | Description | Validation Rules |
| :--- | :--- | :---: | :--- | :--- |
| `url` | `string` | **Yes** | Target website URL to audit | Must be a valid `http://` or `https://` URL string. |

#### Example Request Body
```json
{
  "url": "https://example.com"
}
```

---

### Response Contract

#### Success Response (`200 OK`)

```json
{
  "status": "success",
  "data": {
    "url": "https://example.com",
    "hostname": "example.com",
    "httpStatus": 200,
    "httpStatusText": "OK",
    "responseTimeMs": 142,
    "timestamp": "2026-07-25T14:45:00.000Z",
    "hasBotProtection": false,
    "pageTitle": "Example Domain",
    "metaDescription": null,
    "h1Count": 1,
    "imagesMissingAlt": 0,
    "wordCount": 287,
    "favicon": "https://www.google.com/s2/favicons?domain=example.com&sz=64",
    "seoScore": 80,
    "healthScore": 90
  }
}
```

#### Response Data Fields Description
| Field | Type | Description |
| :--- | :--- | :--- |
| `url` | `string` | Normalized target URL requested for auditing |
| `hostname` | `string` | Domain hostname extracted from target URL |
| `httpStatus` | `number` | Real HTTP status code received (e.g. `200`, `301`, `403`, `404`) |
| `httpStatusText` | `string` | Human-readable HTTP status text (e.g. `"OK"`, `"Forbidden"`) |
| `responseTimeMs` | `number` | Round-trip server response latency in milliseconds |
| `timestamp` | `string` | ISO 8601 UTC timestamp of when the audit took place |
| `hasBotProtection` | `boolean` | `true` if bot verification/Cloudflare/CAPTCHA challenge was detected |
| `pageTitle` | `string \| null` | Inner text of `<title>` tag, or `null` if missing |
| `metaDescription` | `string \| null` | `content` attribute of `<meta name="description">`, or `null` |
| `h1Count` | `number` | Count of `<h1>` heading elements found in HTML body |
| `imagesMissingAlt` | `number` | Count of `<img>` tags missing `alt`, having empty `alt=""`, or whitespace |
| `wordCount` | `number` | Approximate body text word count (excluding `<script>` and `<style>`) |
| `favicon` | `string` | Google Favicon API service URL for domain icon |
| `seoScore` | `number` | Additive SEO score calculated from on-page structure (0-100) |
| `healthScore` | `number` | Additive health score calculated from response speed & status (0-100) |

---

### Error Responses Contract

All errors return a uniform operational JSON payload format:

```json
{
  "status": "fail",
  "statusCode": 400,
  "error": "ValidationError",
  "message": "Invalid URL provided. URL must start with http:// or https://",
  "timestamp": "2026-07-25T14:45:00.000Z"
}
```

#### Error Codes & Triggers
| Status Code | Error Class | Trigger Scenario |
| :---: | :--- | :--- |
| **`400 Bad Request`** | `ValidationError` | Missing `url` body field, invalid URL protocol/format, or host lookup failure. |
| **`408 Request Timeout`** | `TimeoutError` | Target web server fails to respond within the 10,000ms execution window. |
| **`415 Unsupported Media`** | `UnsupportedContentError` | Target URL returns non-HTML media (e.g. `application/pdf`, `image/png`, `application/json`). |
| **`500 Internal Error`** | `ParsingError` / `AppError` | Unhandled DOM parsing breakdown or unexpected server crash. |

---

## 💡 Design Decisions & Reasoning

### Decision 1: Server-Side Cheerio Static Parsing over Headless Browsers (Puppeteer/Playwright)
* **Context:** Auditing web pages requires extracting DOM metadata (titles, headings, meta descriptions, image alt tags, word count).
* **Choice:** We chose **Cheerio** paired with **Axios** over running headful/headless Chromium browser automation.
* **Reasoning:**
  1. **Latency & Performance:** Cheerio parses HTML strings in under **10ms**, whereas launching a headless Chrome process requires **1500ms+** cold-start overhead per request.
  2. **Resource Efficiency:** Heavy headless browser instances consume **>500MB RAM** per concurrent context, limiting server scalability. Cheerio operates with negligible memory overhead (**<20MB**), enabling high API concurrency.
  3. **Non-Blocking Network Scrapes:** Axios handles network timeouts (`10s`) and body response limits (`10MB`) natively without browser process management bottlenecks.

---

### Decision 2: Multi-Factor Additive Scoring Algorithm over Binary Pass/Fail Rules
* **Context:** Developers and marketers need intuitive, actionable metrics rather than simple boolean pass/fail indicators.
* **Choice:** We implemented separate multi-factor **SEO Score** (0-100) and **Health Score** (0-100) scoring engines.
* **Reasoning:**
  1. **Nuanced Evaluation:** Binary validation hides progress. An additive model rewards partial completeness (e.g., granting partial credit for multiple `<h1>` tags or sub-800ms latencies).
  2. **Clear Prioritization:** Decoupling SEO quality from Connection Health allows users to immediately distinguish whether a page needs content optimization vs infrastructure latency improvements.
  3. **Deterministic Formula:** Pure mathematical functions make scores 100% predictable and reproducible across test suites without nondeterministic external dependencies.

---

### Decision 3: Centralized Express Operational Error Architecture with Custom Error Classes
* **Context:** Real-world web auditing involves network timeouts, invalid inputs, DNS failures, anti-bot blocks, and unsupported file formats.
* **Choice:** We created a hierarchical `AppError` base class with specific subclasses (`ValidationError`, `FetchError`, `TimeoutError`, `UnsupportedContentError`, `ParsingError`) and a centralized Express error middleware.
* **Reasoning:**
  1. **Domain-Specific Error Contracts:** Allows controller and service logic to throw semantic domain errors (e.g., `throw new UnsupportedContentError(...)`) without manually formatting HTTP response codes.
  2. **Security & Information Hiding:** In production mode (`NODE_ENV=production`), internal stack traces and native system exception details are sanitized before reaching the API client.
  3. **Predictable Client Integration:** Guarantees that the React frontend always receives a structured error object with a human-readable `message` for toast notifications and UI error banners.

---

## 🧪 Testing Suite

The project includes unit and integration test coverage across the backend services, controllers, error handlers, and parsing logic.

### Run All Tests
```bash
cd backend
npm test
```

### Test Suite Structure
```
backend/tests/
├── unit/
│   ├── parsingLogic.test.js      # Unit tests for happy path, non-HTML payload, parsing failures & edge cases
│   ├── auditService.test.js      # Scoring algorithms, bot protection signals & status mapping
│   ├── auditController.test.js   # Request validation & controller response mapping
│   ├── errorHandler.test.js      # Exception transformer & operational HTTP status mapping
│   └── urlValidator.test.js      # URL format validation, protocol checking & edge cases
└── integration/
    └── auditApi.test.js          # Supertest end-to-end API HTTP endpoint contract tests
```

---

## 🏗️ Project Architecture

```
page-pulse/
├── backend/
│   ├── controllers/
│   │   └── auditController.js     # Validates requests and calls audit service
│   ├── middleware/
│   │   ├── errorHandler.js        # Centralized exception response handler
│   │   └── logger.js              # HTTP request logger
│   ├── routes/
│   │   └── auditRoutes.js         # API route endpoints (/api/audit)
│   ├── services/
│   │   └── auditService.js        # Scraping, Cheerio DOM parsing & scoring engines
│   ├── utils/
│   │   ├── AppError.js            # Operational base error class
│   │   ├── errors.js              # Specific error class definitions
│   │   └── urlValidator.js        # URL format validator
│   ├── tests/                     # Jest unit & integration test suites
│   ├── app.js                     # Express app setup & middleware
│   ├── server.js                  # Server port listening entrypoint
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useAudit.js        # React hook for managing audit state & history
│   │   ├── services/
│   │   │   └── api.js             # Axios client instance
│   │   ├── styles/
│   │   │   └── index.css          # Vanilla CSS glassmorphism styling
│   │   ├── App.jsx                # UI components & dashboard
│   │   └── main.jsx               # React entrypoint
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── run.bat                        # Double-click Windows dual-server launcher
└── README.md                      # Project documentation
```

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.
