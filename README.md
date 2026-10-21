# Growthora Sprint & Attendance Management System (MERN)

Two modules in one project: **Sprint Updates** (morning projection / evening achieved, performance, reports, PNG exports) and **Face Attendance** (TensorFlow.js in-browser face embeddings, check-in/out, reports).

## IMPORTANT: honest status
This ZIP was produced in a sandbox **without internet access**, so `npm install` could not be run and **the app has never been started or tested end-to-end**.

What WAS verified (run in the sandbox):
- `node --check` passes on every server file.
- `cd server && npm test` → 9 passing unit tests of the performance engine, attendance status boundaries, and the 08:00 business-day rollover. They reproduce the owner's sheet: Hemalatha 58.33 %, Kusuma 36.67 %, Radha 100 %, 300/3 → 100 %.

What was NOT verified (expect to need a short debugging pass):
- Server startup against MongoDB, every REST endpoint, Mongoose behaviour.
- Client TypeScript compile (`tsc`), Vite build, rendering, mobile layout.
- **Face recognition, liveness, and PNG export** have never run in a browser. Quality/blur/brightness/liveness thresholds in `client/src/face.ts` are starting values and must be tuned on real devices and real lighting. Never treat the accuracy as 100 %.
- Browser liveness (blink/head-turn) can be bypassed (e.g. video replay). Use manual admin verification fallback and supervision for high-stakes cases.
- The Phase-1 (sprint-only) checkpoint ZIP was not produced separately; the sprint module is fully included in this ZIP.
- Automated API/integration/security tests are not written (only the engine unit tests).

## Setup
Requirements: Node 18+ (22 recommended), MongoDB 6+.
```bash
cp .env.example server/.env        # edit: MONGODB_URI, JWT_SECRET (long random), ADMIN_* (strong password)
npm run install:all
npm run models                     # one-time download of face-api model weights into client/public/models (needs internet)
npm run seed:admin                 # creates admin from env (no hard-coded password)
npm run dev:server                 # 
npm run dev:client                 # http://localhost:5173  (proxies /api)
```
Camera access needs HTTPS or `localhost`. For production serve the built client (`cd client && npm run build`) behind HTTPS and set `FRONTEND_URL`.

### Vercel + Render deployment

- In Vercel, set `VITE_API_URL` to the backend API base URL (for example, `https://sprint-pnqh.onrender.com/api`) and redeploy. If omitted, the client defaults to this project's Render API URL.
- In Render, set `FRONTEND_URL` to the exact frontend origin (for example, `https://sprint-bay.vercel.app`, without a trailing slash) so the API CORS policy accepts browser requests from Vercel.

If `loadFromUri` cannot find models, check the file names in `client/public/models` match `tiny_face_detector_model.json`, `face_landmark_68_model.json`, `face_recognition_model.json` + their `.bin` shards (the download script saves what the manifests list).

## Login flow
Admin logs in with `ADMIN_ID` + password. Admin creates employees in **Bangalore Champs** (Name, Email, Phone). IDs `Growthora261, 262, …` come from an atomic counter (never reused; delete = archive). A one-time temporary password is shown; the employee logs in with **Employee ID + password** and must set a new password first. Account lock after configurable failed attempts; rate limiting on login/face endpoints.

## Key rules implemented
- **Business day** rolls over at the configured work start (08:00 Asia/Kolkata), server-side. Before 08:00 the "day" is still yesterday, so Morning sprint and Check-in reopen at 8:00 AM next day. Unique indexes (`employee+dateKey+session`, `employee+dateKey`) stop duplicates from tabs / direct API calls.
- **Talk time** stored as integer minutes (10–230, step 10). **Payments**: number + separate `paymentStatus` (`confirmed` | `not_confirm`); Not Confirm never counts as money.
- **Performance** (`server/services/performance.js`, single source for dashboard, reports, employee view, PNGs):
  metric % = evening achieved ÷ morning projected × 100, capped at 100; a metric with projection 0 / Not Confirm is excluded; overall = mean of applicable metrics. Statuses: No submission / Incomplete / No applicable metric / Zero achievement / Pending payment confirmation / Calculated. Alternative setting: fixed daily targets.
- **Daily totals** = sum of evening *achieved* values; payments = confirmed only.
- **Average daily performance** = mean of the calculable daily percentages. **Period performance** = per metric Σmin(achieved, projected) ÷ Σprojected over days with a projection, then mean of applicable metrics (commitment-weighted; not an average of averages).
- **Week ranges**: week-aligned to the configured week start (default Monday), clamped to the month. 1/2/3-week = Week 1..N; "Week 1–5" picks a single week; plus month and custom.
- **Attendance**: ≥7h Present; 3–6h Half Day; (6h,7h) Needs Review; <3h Absent; no checkout = In Progress. Late = check-in after 09:45 (configurable). Working hours = elapsed check-in → check-out (breaks not deducted). Non-working days/holidays are not counted absent. **Attendance % = (Present + 0.5 × Half) ÷ working days × 100.**
- **Face security**: embeddings are compared **on the server** (Euclidean distance vs configurable threshold, default 0.5) for the authenticated employee only; server stamps time; check-out is an atomic update. Embeddings are `select:false`; photos live in `server/uploads/faces/<userId>/` and are **not served statically** — only via an authorized route. Consent is stored; admin can delete biometric data; manual verification and corrections require a reason and are audit-logged.
- Note: client-side liveness result is reported by the client; the server cannot independently verify it.

## Layout
`server/` Express + Mongoose (routes contain their controllers), `client/` Vite React TS Tailwind, PNG components in `client/src/reports/`.
