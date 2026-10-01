# StreamLearn — Gemini CLI QA Test Prompts
Run these from ~/projects/ott/streamlearn/

---

## 🔍 Round 1: Backend Code Review

```bash
gemini "You are a senior backend engineer and security expert. Analyze the complete Node.js/Express backend at ./streamlearn-backend/src/. Review: 1) All 20 MongoDB models for schema correctness and missing indexes 2) All controllers for missing error handling, edge cases, and security issues 3) All routes for missing auth middleware 4) JWT implementation security 5) Rate limiting adequacy 6) Input validation coverage. Give a prioritized bug report with file:line references."
```

## 🎨 Round 2: Frontend Code Review

```bash
gemini "You are a senior React developer and UX expert. Analyze the React frontend at ./streamlearn-frontend/src/. Review: 1) Component architecture and re-render issues 2) Missing loading states and error boundaries 3) Mobile responsiveness issues 4) Accessibility (a11y) violations 5) Performance bottlenecks 6) Missing form validations 7) React Query usage correctness. Give actionable fixes."
```

## 🔒 Round 3: Security Audit

```bash
gemini "You are a cybersecurity expert. Audit the StreamLearn codebase for: 1) Authentication and authorization vulnerabilities 2) API security (CORS, CSRF, injection attacks) 3) Sensitive data exposure 4) JWT security issues 5) File upload security 6) Rate limiting gaps 7) MongoDB injection possibilities 8) XSS vulnerabilities in React 9) Insecure dependencies. Provide CVE-style findings with severity ratings."
```

## 📱 Round 4: Mobile & PWA Review

```bash
gemini "Review the PWA implementation at ./streamlearn-frontend/public/sw.js and manifest.json, and the mobile responsive design across all pages in ./streamlearn-frontend/src/pages/. Check: 1) Service worker caching strategy 2) Offline functionality 3) Install prompt UX 4) Touch target sizes (minimum 44px) 5) Bottom navigation usability 6) Viewport issues 7) iOS Safari compatibility. List all issues."
```

## ⚡ Round 5: Performance Audit

```bash
gemini "Analyze StreamLearn for performance issues: 1) Backend: N+1 query problems, missing indexes in MongoDB schemas at ./streamlearn-backend/src/models/, unnecessary data fetching 2) Frontend: bundle size, lazy loading, image optimization gaps, unnecessary re-renders 3) Video streaming: HLS configuration at ./streamlearn-backend/src/services/transcoding.service.js 4) API response caching gaps. Suggest specific optimizations."
```

## 🧪 Round 6: Feature Completeness

```bash
gemini "Act as a QA engineer testing StreamLearn OTT+Education platform. Go through the feature spec implied by the codebase at ./streamlearn-backend/src/ and ./streamlearn-frontend/src/. List: 1) Features that are fully implemented 2) Features that are stubs/TODO 3) Features with broken logic 4) Missing edge cases 5) Database operations that could fail silently. Give a completion percentage estimate."
```

## 🚀 Round 7: Full System Test

```bash
gemini "You are a CTO reviewing StreamLearn before production launch. Examine the entire codebase at ./streamlearn-backend/ and ./streamlearn-frontend/. Give me: 1) TOP 10 critical issues that would break production 2) TOP 5 security vulnerabilities 3) TOP 5 UX problems 4) Estimated completion percentage 5) What needs to be done before showing to a client. Be brutally honest."
```
