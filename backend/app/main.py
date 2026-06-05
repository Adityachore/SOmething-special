from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.api.v1 import auth_routes, complaint_routes, admin_routes, notification_routes, employee_routes, org_routes, invitation_routes

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="AI-powered complaint management platform API",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global Exception Handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "message": exc.detail, "errors": []}
        )
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error.", "errors": [str(exc)]}
    )

# ─── Routers ──────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth_routes.router, prefix=API_PREFIX)
app.include_router(complaint_routes.router, prefix=API_PREFIX)
app.include_router(admin_routes.router, prefix=API_PREFIX)
app.include_router(notification_routes.router, prefix=API_PREFIX)
app.include_router(employee_routes.router, prefix=API_PREFIX)
app.include_router(org_routes.router, prefix=API_PREFIX)
app.include_router(invitation_routes.router, prefix=API_PREFIX)

# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
