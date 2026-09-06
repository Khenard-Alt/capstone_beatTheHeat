Principal Dashboard - Feature Spec

Purpose
- Provide a focused dashboard for the school Principal (head teacher) with school-wide overview, approvals, and report access.

Inventory (existing frontend elements used)
- HeatIndexCard: current heat index summary and level.
- WeatherWidget: current weather snapshot.
- AdvisoryAlert: current advisory message and recommendations.
- Chart: advisory/notification volume trend.
- Incident summary & admin stats: active advisories, incidents, active users.
- Parent question insights: list of recent parent questions.

Principal-specific additions (features)
1. Pending Approvals
   - Approvals list for items that require principal sign-off: announcements, schedule changes, major notifications, field trip approvals, or exceptional student activity.
   - Quick actions: Approve / Reject / Request changes.
   - Audit trail: who submitted, when, and any comments.

2. School Reports
   - Monthly/weekly summary reports: heat incidents, advisory history, attendance impact, trend charts.
   - Export/Download summary (CSV/PDF) — optional.

3. High-priority Alerts
   - Direct access to critical advisories and unresolved incidents.
   - One-click notify staff/parents (email + in-app). Requires notification flow.

4. Staff/Teacher Oversight
   - View recent teacher-submitted incident reports and follow-up status.
   - Assign follow-ups to staff members.

5. Role-based Access
   - Only users with `role === 'principal'` see this dashboard view.
   - Principal actions should be permission-checked on backend endpoints.

Data requirements & API surface (examples)
- GET /api/principal/approvals?status=pending -> [{id,type,title,submittedBy,submittedAt,meta}]
- POST /api/principal/approvals/:id/approve -> { success }
- POST /api/principal/approvals/:id/reject -> { success }
- GET /api/principal/reports?period=month -> [{id,title,summary,date,items}]
- POST /api/notifications/send -> { success }

Notification & Email behavior
- Principal can trigger school-wide notifications: send email to parents + in-app notification.
- Notifications should be queued and logged (existing `notifications`/queue concept in frontend hints).
- Email service: backend has nodemailer config; implement email sending with `backend/src/services/email.service.ts` (currently empty) and call it from notifications.

Security & Auditing
- All principal endpoints must validate caller role (server-side) and log actions (who approved, when).
- Keep audit logs in `ai_analysis_logs` or a dedicated `admin_actions` table.

Implementation plan (next steps)
1. Create backend endpoints (approvals, reports, approve/reject) with role checks.
2. Implement `email.service.ts` minimal sender using SMTP env vars.
3. Wire frontend approve/reject UI and notification triggers.
4. Add tests and small e2e to validate role gating and approval flow.

Notes
- Many backend route files exist as placeholders; the created `/api/principal` endpoints are implemented as safe fallbacks returning mock data when DB is not configured.
- This spec is intentionally minimal and maps directly to flowcharts in the system guide images.

