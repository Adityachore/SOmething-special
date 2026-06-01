# AI Complaint Management Platform

A production-grade AI-powered complaint management system built with FastAPI, PostgreSQL, Gemini AI, and Next.js.

## 🚀 Quick Start

### 1. Configure your API key

Edit `.env` and set your Gemini API key:
```
GEMINI_API_KEY=your_actual_key_here
```

### 2. Start all services
```bash
docker-compose up --build
```

### 3. Run database migrations
```bash
docker-compose exec backend alembic upgrade head
```

### 4. Seed demo data
```bash
docker-compose exec backend python scripts/seed.py
```

### 5. Access the API
- **API Docs:** http://localhost:8000/docs
- **Frontend:** http://localhost:3000
- **Health Check:** http://localhost:8000/health

## 🔑 Demo Credentials

| Role     | Email                | Password   |
|----------|----------------------|------------|
| Admin    | admin@demo.com       | Admin@1234 |
| CMD      | cmd@demo.com         | Cmd@1234   |
| HR       | hr@demo.com          | Hr@1234    |
| Employee | employee@demo.com    | Emp@1234   |

## 🏗️ Architecture

```
backend/app/
├── api/v1/          ← FastAPI routes
├── core/            ← Security, RBAC, exceptions
├── db/models/       ← 18 SQLAlchemy models
├── schemas/         ← Pydantic request/response
├── services/        ← Business logic
├── ai/              ← Gemini + fallback AI
├── workers/         ← Celery tasks (AI, escalation, notifications)
└── storage/         ← Local filesystem (S3-ready)
```

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Python 3.12 |
| Database | PostgreSQL 16 + pgvector |
| ORM | SQLAlchemy (async) + Alembic |
| Queue | Celery + Redis |
| AI | Google Gemini |
| Frontend | Next.js |
| Deployment | Docker Compose |

## 🔑 Key API Endpoints

| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/api/v1/auth/login` | All |
| POST | `/api/v1/complaints` | Employee |
| GET | `/api/v1/complaints/my` | Employee |
| GET | `/api/v1/complaints` | CMD/HR/Admin |
| GET | `/api/v1/complaints/search` | CMD/HR/Admin |
| POST | `/api/v1/complaints/{id}/resolve` | CMD/HR |
| GET | `/api/v1/admin/analytics/overview` | Admin |
