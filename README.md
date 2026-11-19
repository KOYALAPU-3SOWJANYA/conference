# RAiSE 2026 – National Conference Management System

React + TypeScript + Tailwind (Vite) · FastAPI · PostgreSQL · JWT + role-based access.
No email and no payments (by design, for now) – all notifications are in-app and DB-backed.

## 1. Database
```bash
createdb raise2026            # or: psql -c "CREATE DATABASE raise2026;"
```

## 2. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                  # set DATABASE_URL, SECRET_KEY, ADMIN_*; optional ADMIN_SIGNUP_CODE
uvicorn app.main:app --reload --port 8000             # creates tables + seeds admin & conference content
python -m app.seed_demo                               # OPTIONAL: demo author, 3 reviewers, 3 papers
```
API docs: http://localhost:8000/docs

Migrations (optional, instead of auto-create): set `AUTO_CREATE_TABLES=false`, then
`alembic revision --autogenerate -m "init" && alembic upgrade head`.

## 3. Frontend
```bash
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:8000
npm install
npm run dev                   # http://localhost:5173
```

## Logins
| Portal | URL | Account |
|---|---|---|
| Admin | /admin/login | `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (default admin@raise2026.local / ChangeMe@123 – change it!) |
| Author | /author/login | self-register (or demo: author@demo.raise / Demo@12345) |
| Reviewer | /reviewer/login | self-register, then **admin approves** under Reviewers (demo: reviewer1@demo.raise / Demo@12345) |

Admin self-signup only works with the `ADMIN_SIGNUP_CODE` invite code (disabled when empty).

## Try the workflow (5 minutes)
1. Author signs up → **Submit Paper** (PDF) → gets ID like `RAiSE26-0004`.
2. Admin → Papers → open it → **Assign reviewers** (multiple, optional due date).
3. Reviewer → Assigned Papers → view PDF, score 5 criteria, comments, recommendation → **Save draft** / **Submit final**.
4. Admin → paper page shows all reviews (incl. confidential notes) → **Record decision** (accept / minor / major / reject) and choose whether to release feedback.
5. Author sees the decision; released feedback is anonymised (Reviewer 1, 2…). For revisions, **Upload revised paper** → version history grows, reviewers get a fresh round.

## Security model
- bcrypt password hashes, JWT bearer tokens, role checked server-side on every route.
- Authors: only their own papers. Reviewers: only papers assigned to them (404 otherwise); author identity is hidden (double-blind). Only admin can decide.
- PDFs live outside the web root (`backend/storage`), validated by extension, `%PDF` signature and size; served only through authenticated endpoints.
- Dashboards poll the API every ~8 s, so everything shown is live database state.

## Editable content
Tracks, committees, dates, about/objectives/guidelines, contact info and the "accepting submissions" switch are all managed in **Admin → Conference Content**. Seeded values (tracks, committee placeholders "To be announced", about text) are starter content – replace them.
