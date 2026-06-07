from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.core.deps import get_current_user
from app.db.models.user import User, UserRole
from app.db.models.complaint import Complaint, ComplaintStatus, PriorityLevel
from app.db.models.attachment import ComplaintAttachment
from app.db.models.processing_queue import ProcessingQueue, TaskType, QueueStatus
from app.services.complaint_service import ComplaintService
from app.services.search_service import SearchService
from app.schemas.complaint_schemas import (
    ComplaintCreate, ComplaintUpdate, ComplaintResponse, ComplaintListResponse,
    AssignPayload, ResolvePayload, RejectPayload, RatePayload,
    InternalNoteCreate, InternalNoteResponse, AttachmentResponse, MetaOverridePayload,
    WaitForEmployeePayload
)
from app.schemas.admin_schemas import AuditLogResponse
from app.storage.local_storage import storage
from app.core.rbac import is_handler, require_roles
from app.core.exceptions import ForbiddenError, NotFoundError
from sqlalchemy import select
import os

router = APIRouter(prefix="/complaints", tags=["Complaints"])


def _resp(c, user: User = None) -> ComplaintResponse:
    res = ComplaintResponse.model_validate(c)
    if res.is_anonymous:
        if user and not (user.role in (UserRole.HR, UserRole.ADMIN) or user.id == res.employee_id):
            res.employee_id = "anonymous"
    return res


# ─── Employee: Submit ─────────────────────────────────────────────────────────

@router.post("", response_model=ComplaintResponse, status_code=201)
async def create_complaint(
    payload: ComplaintCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != UserRole.EMPLOYEE:
        raise ForbiddenError("Only employees can submit complaints.")
    
    # Rate Limit Check: max 5 complaints per hour per employee
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import func
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    count_stmt = select(func.count(Complaint.id)).where(
        Complaint.employee_id == user.id,
        Complaint.created_at >= one_hour_ago
    )
    count_res = await db.execute(count_stmt)
    recent_count = count_res.scalar_one()
    if recent_count >= 5:
        raise HTTPException(status_code=429, detail="Rate limit exceeded: Max 5 complaints per hour.")

    complaint = await ComplaintService.create(
        db, user,
        title=payload.title,
        description=payload.description,
        employee_department=payload.employee_department,
        employee_category=payload.employee_category,
        employee_subcategory=payload.employee_subcategory,
        is_anonymous=payload.is_anonymous,
        visibility_settings=payload.visibility_settings
    )

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

    return _resp(complaint, user)


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
    return ComplaintListResponse(items=[_resp(c, user) for c in items], total=total, page=page, page_size=page_size)


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
    return ComplaintListResponse(items=[_resp(c, user) for c in items], total=total, page=page, page_size=page_size)


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
    return ComplaintListResponse(items=[_resp(c, user) for c in items], total=total, page=page, page_size=page_size)


# ─── Get Detail ───────────────────────────────────────────────────────────────

@router.get("/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.get(db, user, complaint_id), user)


# ─── Employee: Edit while PENDING ─────────────────────────────────────────────

@router.patch("/{complaint_id}", response_model=ComplaintResponse)
async def update_complaint(
    complaint_id: str,
    payload: ComplaintUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.update(db, user, complaint_id, payload.title, payload.description), user)


# ─── Employee: Withdraw ───────────────────────────────────────────────────────

@router.post("/{complaint_id}/withdraw", response_model=ComplaintResponse)
async def withdraw_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.withdraw(db, user, complaint_id), user)


# ─── Handler: Assign ─────────────────────────────────────────────────────────

@router.post("/{complaint_id}/assign", response_model=ComplaintResponse)
async def assign_complaint(
    complaint_id: str,
    payload: AssignPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.assign(db, user, complaint_id, payload.assigned_to_user_id), user)


# ─── Handler: Start Work ──────────────────────────────────────────────────────

@router.post("/{complaint_id}/start", response_model=ComplaintResponse)
async def start_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.start(db, user, complaint_id), user)


# ─── Handler: Propose Resolution ──────────────────────────────────────────────

@router.post("/{complaint_id}/propose-resolution", response_model=ComplaintResponse)
async def propose_resolution_complaint(
    complaint_id: str,
    payload: ResolvePayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.propose_resolution(
        db, user, complaint_id,
        payload.resolution_note, payload.root_cause, payload.visible_to_employee
    ), user)


# ─── Handler: Resolve (Approve) ──────────────────────────────────────────────

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
    ), user)


# ─── Handler: Reject ─────────────────────────────────────────────────────────

@router.post("/{complaint_id}/reject", response_model=ComplaintResponse)
async def reject_complaint(
    complaint_id: str,
    payload: RejectPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.reject(db, user, complaint_id, payload.reason, payload.category), user)


# ─── Handler: Close ──────────────────────────────────────────────────────────

@router.post("/{complaint_id}/close", response_model=ComplaintResponse)
async def close_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.close(db, user, complaint_id), user)


# ─── Handler: Wait for Employee ──────────────────────────────────────────────

@router.post("/{complaint_id}/wait-for-employee", response_model=ComplaintResponse)
async def wait_for_employee(
    complaint_id: str,
    payload: WaitForEmployeePayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.wait_for_employee(db, user, complaint_id, payload.note), user)


# ─── Handler: Reopen ─────────────────────────────────────────────────────────

@router.post("/{complaint_id}/reopen", response_model=ComplaintResponse)
async def reopen_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.reopen(db, user, complaint_id), user)


# ─── Employee: Rate ───────────────────────────────────────────────────────────

@router.post("/{complaint_id}/rate", response_model=ComplaintResponse)
async def rate_complaint(
    complaint_id: str,
    payload: RatePayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _resp(await ComplaintService.rate(db, user, complaint_id, payload.rating, payload.feedback), user)


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
    complaint = await ComplaintService.get(db, user, complaint_id)
    logs = await ComplaintService.list_audit_logs(db, user, complaint_id)
    
    response_logs = []
    for l in logs:
        res_log = AuditLogResponse.model_validate(l)
        if complaint.is_anonymous and res_log.actor_user_id == complaint.employee_id:
            if not (user.role in (UserRole.HR, UserRole.ADMIN) or user.id == complaint.employee_id):
                res_log.actor_user_id = "anonymous"
        response_logs.append(res_log)
    return response_logs


# ─── Attachments ─────────────────────────────────────────────────────────────

@router.post("/{complaint_id}/attachments", response_model=AttachmentResponse, status_code=201)
async def upload_attachment(
    complaint_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    complaint = await ComplaintService.get(db, user, complaint_id)

    # 1. Run size check (Max: 10 MB)
    MAX_SIZE = 10 * 1024 * 1024
    file_bytes = await file.read()
    size_bytes = len(file_bytes)
    if size_bytes > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 10 MB limit.")
    await file.seek(0)

    # 2. Run extension validation
    ALLOWED_EXTENSIONS = {".pdf", ".docx", ".png", ".jpg", ".jpeg"}
    _, ext = os.path.splitext((file.filename or "").lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} is not supported. Supported types: PDF, DOCX, PNG, JPG, JPEG.")

    # 3. Run virus scan mock
    if (file.filename and file.filename.lower() == "virus.txt") or b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*" in file_bytes:
        raise HTTPException(status_code=400, detail="File validation failed: Potential virus detected.")

    # Save to storage
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


@router.delete("/attachments/{attachment_id}", status_code=204)
async def delete_attachment(
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

    complaint = await ComplaintService.get(db, user, att.complaint_id)
    if user.role == UserRole.EMPLOYEE:
        if complaint.employee_id != user.id:
            raise ForbiddenError("You can only delete attachments on your own complaints.")
        if complaint.status != ComplaintStatus.PENDING:
            raise ForbiddenError("You can only delete attachments while the complaint is PENDING.")
    else:
        if user.role != UserRole.ADMIN:
            raise ForbiddenError("Only the complaint owner or an admin can delete attachments.")

    try:
        await storage.delete(att.storage_key)
    except Exception:
        pass

    await db.delete(att)
    await db.commit()
    return None


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
    ), user)
