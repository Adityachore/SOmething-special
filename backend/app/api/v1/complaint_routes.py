from fastapi import APIRouter, Depends, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.core.deps import get_current_user
from app.db.models.user import User, UserRole
from app.db.models.complaint import ComplaintStatus, PriorityLevel
from app.db.models.attachment import ComplaintAttachment
from app.db.models.processing_queue import ProcessingQueue, TaskType, QueueStatus
from app.services.complaint_service import ComplaintService
from app.services.search_service import SearchService
from app.schemas.complaint_schemas import (
    ComplaintCreate, ComplaintUpdate, ComplaintResponse, ComplaintListResponse,
    AssignPayload, ResolvePayload, RejectPayload, RatePayload,
    InternalNoteCreate, InternalNoteResponse, AttachmentResponse, MetaOverridePayload
)
from app.schemas.admin_schemas import AuditLogResponse
from app.storage.local_storage import storage
from app.core.rbac import is_handler, require_roles
from app.core.exceptions import ForbiddenError, NotFoundError
from sqlalchemy import select

router = APIRouter(prefix="/complaints", tags=["Complaints"])


def _resp(c) -> ComplaintResponse:
    return ComplaintResponse.model_validate(c)


# ─── Employee: Submit ─────────────────────────────────────────────────────────

@router.post("", response_model=ComplaintResponse, status_code=201)
async def create_complaint(
    payload: ComplaintCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != UserRole.EMPLOYEE:
        raise ForbiddenError("Only employees can submit complaints.")
    complaint = await ComplaintService.create(db, user, payload.title, payload.description)

    # Dispatch AI pipeline
    queue_entry = ProcessingQueue(
        tenant_id=user.tenant_id,
        complaint_id=complaint.id,
        task_type=TaskType.CATEGORIZATION,
        status=QueueStatus.PENDING,
    )
    db.add(queue_entry)
    await db.commit()
    await db.refresh(queue_entry)

    from app.workers.ai_worker import process_ai_pipeline
    process_ai_pipeline.delay(complaint.id, user.tenant_id, queue_entry.id)

    return _resp(complaint)


# ─── Employee: Own list ───────────────────────────────────────────────────────

@router.get("/my", response_model=ComplaintListResponse)
async def list_my_complaints(
    status: ComplaintStatus | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    items, total = await ComplaintService.list_own(db, user, status, page, page_size)
    return ComplaintListResponse(items=[_resp(c) for c in items], total=total, page=page, page_size=page_size)


# ─── Handler: Department/All list ────────────────────────────────────────────

@router.get("", response_model=ComplaintListResponse)
async def list_complaints(
    status: ComplaintStatus | None = Query(None),
    department: str | None = Query(None),
    priority: PriorityLevel | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not is_handler(user):
        raise ForbiddenError("Only CMD, HR, and Admin can access this endpoint.")
    items, total = await ComplaintService.list_for_handler(db, user, status, department, priority, page, page_size)
    return ComplaintListResponse(items=[_resp(c) for c in items], total=total, page=page, page_size=page_size)


# ─── Search ───────────────────────────────────────────────────────────────────

@router.get("/search", response_model=ComplaintListResponse)
async def search_complaints(
    q: str | None = Query(None),
    status: ComplaintStatus | None = Query(None),
    department: str | None = Query(None),
    priority: PriorityLevel | None = Query(None),
    is_hr_sensitive: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not is_handler(user):
        raise ForbiddenError("Search is for handlers only.")
    items, total = await SearchService.search(db, user, q, status, department, priority, is_hr_sensitive, page, page_size)
    return ComplaintListResponse(items=[_resp(c) for c in items], total=total, page=page, page_size=page_size)


# ─── Get Detail ───────────────────────────────────────────────────────────────

@router.get("/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.get(db, user, complaint_id))


# ─── Employee: Edit while PENDING ─────────────────────────────────────────────

@router.patch("/{complaint_id}", response_model=ComplaintResponse)
async def update_complaint(
    complaint_id: str,
    payload: ComplaintUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.update(db, user, complaint_id, payload.title, payload.description))


# ─── Employee: Withdraw ───────────────────────────────────────────────────────

@router.post("/{complaint_id}/withdraw", response_model=ComplaintResponse)
async def withdraw_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.withdraw(db, user, complaint_id))


# ─── Handler: Assign ─────────────────────────────────────────────────────────

@router.post("/{complaint_id}/assign", response_model=ComplaintResponse)
async def assign_complaint(
    complaint_id: str,
    payload: AssignPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.assign(db, user, complaint_id, payload.assigned_to_user_id))


# ─── Handler: Start Work ──────────────────────────────────────────────────────

@router.post("/{complaint_id}/start", response_model=ComplaintResponse)
async def start_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.start(db, user, complaint_id))


# ─── Handler: Resolve ────────────────────────────────────────────────────────

@router.post("/{complaint_id}/resolve", response_model=ComplaintResponse)
async def resolve_complaint(
    complaint_id: str,
    payload: ResolvePayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.resolve(
        db, user, complaint_id,
        payload.resolution_note, payload.root_cause, payload.visible_to_employee
    ))


# ─── Handler: Reject ─────────────────────────────────────────────────────────

@router.post("/{complaint_id}/reject", response_model=ComplaintResponse)
async def reject_complaint(
    complaint_id: str,
    payload: RejectPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.reject(db, user, complaint_id, payload.reason, payload.category))


# ─── Handler: Reopen ─────────────────────────────────────────────────────────

@router.post("/{complaint_id}/reopen", response_model=ComplaintResponse)
async def reopen_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.reopen(db, user, complaint_id))


# ─── Employee: Rate ───────────────────────────────────────────────────────────

@router.post("/{complaint_id}/rate", response_model=ComplaintResponse)
async def rate_complaint(
    complaint_id: str,
    payload: RatePayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.rate(db, user, complaint_id, payload.rating, payload.feedback))


# ─── Internal Notes ───────────────────────────────────────────────────────────

@router.get("/{complaint_id}/internal-notes", response_model=list[InternalNoteResponse])
async def list_notes(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    notes = await ComplaintService.list_internal_notes(db, user, complaint_id)
    return [InternalNoteResponse.model_validate(n) for n in notes]


@router.post("/{complaint_id}/internal-notes", response_model=InternalNoteResponse, status_code=201)
async def add_note(
    complaint_id: str,
    payload: InternalNoteCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = await ComplaintService.add_internal_note(
        db, user, complaint_id, payload.content, payload.is_visible_to_employee
    )
    return InternalNoteResponse.model_validate(note)


# ─── Audit Logs ───────────────────────────────────────────────────────────────

@router.get("/{complaint_id}/audit-logs", response_model=list[AuditLogResponse])
async def list_audit_logs(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    logs = await ComplaintService.list_audit_logs(db, user, complaint_id)
    return [AuditLogResponse.model_validate(l) for l in logs]


# ─── Attachments ─────────────────────────────────────────────────────────────

@router.post("/{complaint_id}/attachments", response_model=AttachmentResponse, status_code=201)
async def upload_attachment(
    complaint_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    complaint = await ComplaintService.get(db, user, complaint_id)
    storage_key, size_bytes = await storage.save(file, user.tenant_id)
    attachment = ComplaintAttachment(
        complaint_id=complaint_id,
        tenant_id=user.tenant_id,
        storage_key=storage_key,
        original_name=file.filename or "file",
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=size_bytes,
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return AttachmentResponse.model_validate(attachment)


@router.get("/attachments/{attachment_id}")
async def download_attachment(
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ComplaintAttachment).where(
            ComplaintAttachment.id == attachment_id,
            ComplaintAttachment.tenant_id == user.tenant_id,
        )
    )
    att = result.scalar_one_or_none()
    if not att:
        raise NotFoundError("Attachment", attachment_id)
    path = await storage.get_path(att.storage_key)
    return FileResponse(path, filename=att.original_name, media_type=att.mime_type)


@router.post("/{complaint_id}/override", response_model=ComplaintResponse)
async def override_complaint_metadata(
    complaint_id: str,
    payload: MetaOverridePayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.override_meta(
        db, user, complaint_id,
        payload.primary_department, payload.sub_category,
        payload.priority_level, payload.is_hr_sensitive
    ))

