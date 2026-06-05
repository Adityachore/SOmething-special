from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.base import get_db
from app.core.deps import get_current_user
from app.db.models.user import User, UserRole
from app.db.models.complaint_audit_log import ComplaintAuditLog
from app.services.admin_service import AdminService
from app.services.user_service import UserService
from app.schemas.admin_schemas import AnalyticsOverview, AuditLogResponse
from app.schemas.user_schemas import UserCreate, UserResponse, UserUpdate
from app.core.exceptions import ForbiddenError

router = APIRouter(prefix="/admin", tags=["Admin"])


def _require_admin(user: User):
    if user.role not in (UserRole.ADMIN, UserRole.ORG_ADMIN):
        raise ForbiddenError("Admin access required.")


@router.get("/analytics/overview", response_model=AnalyticsOverview)
async def analytics_overview(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    data = await AdminService.get_analytics_overview(db, user.tenant_id)
    return AnalyticsOverview(**data)


@router.get("/audit-logs", response_model=list[AuditLogResponse])
async def list_audit_logs(
    response: Response,
    complaint_id: str | None = Query(None),
    actor_user_id: str | None = Query(None),
    action_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    q_base = select(ComplaintAuditLog)
    if complaint_id:
        if len(complaint_id) == 36:
            q_base = q_base.where(ComplaintAuditLog.complaint_id == complaint_id)
        else:
            q_base = q_base.where(ComplaintAuditLog.complaint_id.ilike(f"%{complaint_id}%"))
    if actor_user_id:
        q_base = q_base.where(ComplaintAuditLog.actor_user_id == actor_user_id)
    if action_type:
        q_base = q_base.where(ComplaintAuditLog.action_type == action_type)

    # Get total count
    count_q = select(func.count()).select_from(q_base.subquery())
    count_result = await db.execute(count_q)
    total = count_result.scalar_one()

    q = q_base.order_by(ComplaintAuditLog.created_at.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(q)
    logs = result.scalars().all()

    response.headers["X-Total-Count"] = str(total)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"
    return [AuditLogResponse.model_validate(l) for l in logs]


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    return await UserService.list_users(db, user.tenant_id)


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    return await UserService.create_user(db, user.tenant_id, payload)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    return await UserService.update_user(db, user.tenant_id, user_id, payload)
