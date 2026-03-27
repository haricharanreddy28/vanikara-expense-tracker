# Expense & Document Management System

A full-stack expense and document management system for 3 directors. Built with **React + Vite** (frontend), **Node.js + Express** (backend), **SQLite** (database), and **Nodemailer** (email).

---

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm

---

### 1. Backend Setup

```bash
cd backend

# Copy environment file and edit your SMTP credentials
copy .env.example .env
# (Edit .env with your Gmail App Password if you want email)

# Start the server (auto-creates DB and seeds 3 directors on first run)
npm run dev
```

Backend runs at: **http://localhost:5000**

### 2. Frontend Setup

```bash
cd frontend
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## Login Credentials (Sample Data)

| Director | Email | Password | Default Share |
|---|---|---|---|
| Rajesh Kumar | rajesh@company.com | password123 | 40% |
| Priya Sharma | priya@company.com | password123 | 35% |
| Amit Verma | amit@company.com | password123 | 25% |

---

## Email Setup (Optional)

Edit `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_gmail_app_password    # Gmail → Settings → App Passwords
EMAIL_FROM=ExpenseTrack <your_gmail@gmail.com>
```

> If SMTP is not configured, emails are logged to console (stub mode). The app works fully without email.

---

## Features

| Feature | Description |
|---|---|
| Login | JWT-based, persisted in localStorage |
| Dashboard | Total expenses, paid/pending, per-director breakdown |
| Add Expense | Default or custom split, live preview |
| Expense List | Expandable rows showing per-director splits |
| Payment Tracking | Mark Paid / Revert per director per expense |
| Share Management | Propose share changes, 2-approval voting system |
| Documents | Upload PDFs/images with category tagging, download |
| Audit Log | Paginated full history of all actions |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/login | Login, returns JWT |
| GET  | /api/users | List all directors |
| GET  | /api/dashboard | Summary stats |
| POST | /api/expenses | Create expense |
| GET  | /api/expenses | List all expenses |
| PUT  | /api/payments/:eid/:uid | Mark payment as Paid |
| PUT  | /api/payments/:eid/:uid/unpaid | Revert to Pending |
| POST | /api/share-requests | Submit share change |
| POST | /api/share-requests/:id/approve | Approve request |
| POST | /api/share-requests/:id/reject | Reject request |
| POST | /api/documents | Upload document |
| GET  | /api/documents | List documents |
| GET  | /api/documents/:id/download | Download file |
| GET  | /api/audit-logs | Audit log (paginated) |

---

## Project Structure

```
expense-tracker/
  backend/
    server.js               ← Express entry point
    src/
      db/index.js           ← SQLite schema + seed
      routes/               ← auth, expenses, payments, etc.
      services/emailService.js
      middleware/           ← auth guard, error handler
    .env                    ← Your config (not committed)
    uploads/                ← Uploaded files (auto-created)
  frontend/
    src/
      pages/                ← 8 page components
      components/           ← Sidebar, ProtectedRoute
      context/AuthContext.jsx
      api/index.js          ← Axios client
```

---

## Database

SQLite file at `backend/src/db/expense.db` — created automatically on first run. No separate setup needed.

To reset: delete `expense.db` and restart the backend.
