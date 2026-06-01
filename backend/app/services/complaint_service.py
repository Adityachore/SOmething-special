from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.db.models.complaint import Complaint, ComplaintStatus, PriorityLevel, PrioritySource
from app.db.models.resolution_detail import ResolutionDetail
from app.db.models.rejection_rating import Rejection, Rating
from app.db.models.internal_note import InternalNote
from app.db.models.complaint_audit_log import ComplaintAuditLog, AuditActionType
from app.db.models.user import User
from app.core.exceptions import (
    NotFoundError, InvalidStateTransitionError, ConflictError, ForbiddenError
)
from app.core.rbac import assert_can_view_complaint, assert_can_handle_complaint
from app.config import settings


# ─── Allowed Transitions ─────────────────────────────────────────────────────

TRANSITIONS = {
    ComplaintStatus.PENDING: [
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.SOLVED,
        ComplaintStatus.REJECTED,
        ComplaintStatus.WITHDRAWN,
        ComplaintStatus.EXPIRED,
    ],
    ComplaintStatus.IN_PROGRESS: [
        ComplaintStatus.PENDING,
        ComplaintStatus.SOLVED,
        ComplaintStatus.REJECTED,
        ComplaintStatus.WITHDRAWN,
        ComplaintStatus.EXPIRED,
    ],
    ComplaintStatus.SOLVED: [ComplaintStatus.IN_PROGRESS],
    ComplaintStatus.REJECTED: [ComplaintStatus.IN_PROGRESS],
    ComplaintStatus.WITHDRAWN: [ComplaintStatus.IN_PROGRESS],
    ComplaintStatus.EXPIRED: [ComplaintStatus.IN_PROGRESS],
}


def _assert_valid_transition(current: ComplaintStatus, target: ComplaintStatus):
    if target not in TRANSITIONS.get(current, []):
        raise InvalidStateTransitionError(current.value, target.value)


def _get_sla_hours(priority: PriorityLevel) -> int:
    if priority == PriorityLevel.CRITICAL:
        return settings.SLA_HOURS_CRITICAL
    if priority == PriorityLevel.HIGH:
        return settings.SLA_HOURS_HIGH_PRIORITY
    return settings.SLA_HOURS_DEFAULT


class ComplaintService:

    @staticmethod
    async def _get_with_relations(db: AsyncSession, complaint_id: str, tenant_id: str) -> Complaint:
        result = await db.execute(
            select(Complaint)
            .options(
                selectinload(Complaint.resolution_detail),
                selectinload(Complaint.rejection),
                selectinload(Complaint.rating),
                selectinload(Complaint.attachments),
            )
            .where(
                Complaint.id == complaint_id,
                Complaint.tenant_id == tenant_id,
                Complaint.deleted_at.is_(None),
            )
        )
        complaint = result.scalar_one_or_none()
        if not complaint:
            raise NotFoundError("Complaint", complaint_id)
        return complaint

    @staticmethod
    async def _log_audit(
        db: AsyncSession,
        complaint_id: str,
        actor_id: str | None,
        action: AuditActionType,
        old_val: dict | None = None,
        new_val: dict | None = None,
    ):
        log = ComplaintAuditLog(
            complaint_id=complaint_id,
            actor_user_id=actor_id,
            action_type=action,
            old_value_json=old_val,
            new_value_json=new_val,
        )
        db.add(log)

    # ── Create ────────────────────────────────────────────────────────────────

    @staticmethod
    async def create(db: AsyncSession, user: User, title: str, description: str) -> Complaint:
        from datetime import timedelta
        complaint = Complaint(
            tenant_id=user.tenant_id,
            employee_id=user.id,
            title=title,
            description=description,
            status=ComplaintStatus.PENDING,
            priority_level=PriorityLevel.MEDIUM,  # Default until AI processes
            sla_due_at=datetime.now(timezone.utc) + timedelta(hours=settings.SLA_HOURS_DEFAULT),
        )
        db.add(complaint)
        await db.flush()  # get complaint.id

        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.CREATED,
            new_val={"title": title, "status": ComplaintStatus.PENDING.value}
        )
        await db.commit()
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

    # ── List ──────────────────────────────────────────────────────────────────

    @staticmethod
    async def list_own(
        db: AsyncSession, user: User, status: ComplaintStatus | None, page: int, page_size: int
    ) -> tuple[list[Complaint], int]:
        q = select(Complaint).where(
            Complaint.employee_id == user.id,
            Complaint.tenant_id == user.tenant_id,
            Complaint.deleted_at.is_(None),
        )
        if status:
            q = q.where(Complaint.status == status)

        total_result = await db.execute(select(func.count()).select_from(q.subquery()))
        total = total_result.scalar_one()

        q = q.order_by(Complaint.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(q.options(
            selectinload(Complaint.resolution_detail),
            selectinload(Complaint.rejection),
            selectinload(Complaint.rating),
            selectinload(Complaint.attachments),
        ))
        return result.scalars().all(), total

    @staticmethod
    async def list_for_handler(
        db: AsyncSession, user: User,
        status: ComplaintStatus | None,
        department: str | None,
        priority: PriorityLevel | None,
        page: int, page_size: int
    ) -> tuple[list[Complaint], int]:
        from app.db.models.user import UserRole
        conditions = [
            Complaint.tenant_id == user.tenant_id,
            Complaint.deleted_at.is_(None),
        ]

        if user.role == UserRole.CMD:
            conditions.append(Complaint.primary_department == user.department)
            conditions.append(Complaint.is_hr_sensitive == False)
        elif user.role == UserRole.HR:
            conditions.append(Complaint.is_hr_sensitive == True)
        # ADMIN sees everything in tenant

        if status:
            conditions.append(Complaint.status == status)
        if department:
            conditions.append(Complaint.primary_department == department)
        if priority:
            conditions.append(Complaint.priority_level == priority)

        q = select(Complaint).where(and_(*conditions))
        total_result = await db.execute(select(func.count()).select_from(q.subquery()))
        total = total_result.scalar_one()

        q = q.order_by(Complaint.priority_score.desc(), Complaint.created_at.asc())
        q = q.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(q.options(
            selectinload(Complaint.resolution_detail),
            selectinload(Complaint.rejection),
            selectinload(Complaint.rating),
            selectinload(Complaint.attachments),
        ))
        return result.scalars().all(), total

    # ── Get ───────────────────────────────────────────────────────────────────

    @staticmethod
    async def get(db: AsyncSession, user: User, complaint_id: str) -> Complaint:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        assert_can_view_complaint(user, complaint)
        return complaint

    # ── Update (Employee, PENDING only) ───────────────────────────────────────

    @staticmethod
    async def update(
        db: AsyncSession, user: User, complaint_id: str,
        title: str | None, description: str | None
    ) -> Complaint:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        if complaint.employee_id != user.id:
            raise ForbiddenError("You can only edit your own complaints.")
        if complaint.status != ComplaintStatus.PENDING:
            raise ForbiddenError("You can only edit complaints that are still PENDING.")

        old_val = {}
        if title:
            old_val["title"] = complaint.title
            complaint.title = title
        if description:
            old_val["description"] = complaint.description[:100]
            complaint.description = description

        if old_val:
            await ComplaintService._log_audit(
                db, complaint.id, user.id, AuditActionType.RESOLUTION_EDIT, old_val=old_val
            )
        await db.commit()
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

    # ── Withdraw ──────────────────────────────────────────────────────────────

    @staticmethod
    async def withdraw(db: AsyncSession, user: User, complaint_id: str) -> Complaint:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        if complaint.employee_id != user.id:
            raise ForbiddenError("You can only withdraw your own complaints.")
        _assert_valid_transition(complaint.status, ComplaintStatus.WITHDRAWN)

        old_status = complaint.status
        complaint.status = ComplaintStatus.WITHDRAWN
        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.STATUS_CHANGE,
            old_val={"status": old_status.value}, new_val={"status": ComplaintStatus.WITHDRAWN.value}
        )
        await db.commit()
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

    # ── Assign ────────────────────────────────────────────────────────────────

    @staticmethod
    async def assign(
        db: AsyncSession, user: User, complaint_id: str, assigned_to_user_id: str
    ) -> Complaint:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        assert_can_handle_complaint(user, complaint)

        old_assigned = complaint.assigned_to_user_id
        complaint.assigned_to_user_id = assigned_to_user_id
        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.ASSIGNMENT_CHANGE,
            old_val={"assigned_to": old_assigned}, new_val={"assigned_to": assigned_to_user_id}
        )
        await db.commit()
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

    # ── Start ─────────────────────────────────────────────────────────────────

    @staticmethod
    async def start(db: AsyncSession, user: User, complaint_id: str) -> Complaint:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        assert_can_handle_complaint(user, complaint)
        _assert_valid_transition(complaint.status, ComplaintStatus.IN_PROGRESS)

        old_status = complaint.status
        complaint.status = ComplaintStatus.IN_PROGRESS
        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.STATUS_CHANGE,
            old_val={"status": old_status.value}, new_val={"status": ComplaintStatus.IN_PROGRESS.value}
        )
        await db.commit()
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

    # ── Resolve ───────────────────────────────────────────────────────────────

    @staticmethod
    async def resolve(
        db: AsyncSession, user: User, complaint_id: str,
        resolution_note: str, root_cause: str | None, visible_to_employee: bool
    ) -> Complaint:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        assert_can_handle_complaint(user, complaint)
        _assert_valid_transition(complaint.status, ComplaintStatus.SOLVED)

        now = datetime.now(timezone.utc)
        old_status = complaint.status
        complaint.status = ComplaintStatus.SOLVED
        complaint.resolved_at = now

        resolution = ResolutionDetail(
            complaint_id=complaint.id,
            resolved_by_user_id=user.id,
            resolution_note=resolution_note,
            root_cause=root_cause,
            visible_to_employee=visible_to_employee,
        )
        db.add(resolution)

        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.STATUS_CHANGE,
            old_val={"status": old_status.value}, new_val={"status": ComplaintStatus.SOLVED.value}
        )
        await db.commit()
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

    # ── Reject ────────────────────────────────────────────────────────────────

    @staticmethod
    async def reject(
        db: AsyncSession, user: User, complaint_id: str, reason: str, category: str | None
    ) -> Complaint:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        assert_can_handle_complaint(user, complaint)
        _assert_valid_transition(complaint.status, ComplaintStatus.REJECTED)

        old_status = complaint.status
        complaint.status = ComplaintStatus.REJECTED

        rejection = Rejection(
            complaint_id=complaint.id,
            rejected_by_user_id=user.id,
            reason=reason,
            category=category,
        )
        db.add(rejection)

        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.STATUS_CHANGE,
            old_val={"status": old_status.value}, new_val={"status": ComplaintStatus.REJECTED.value}
        )
        await db.commit()
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

    # ── Rate ──────────────────────────────────────────────────────────────────

    @staticmethod
    async def rate(
        db: AsyncSession, user: User, complaint_id: str, rating: int, feedback: str | None
    ) -> Complaint:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        if complaint.employee_id != user.id:
            raise ForbiddenError("You can only rate your own complaints.")
        if complaint.status != ComplaintStatus.SOLVED:
            raise ForbiddenError("You can only rate resolved complaints.")
        if complaint.rating:
            raise ConflictError("You have already rated this complaint.")

        rating_obj = Rating(
            complaint_id=complaint.id,
            employee_id=user.id,
            rating=rating,
            feedback=feedback,
        )
        db.add(rating_obj)

        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.RATED,
            new_val={"rating": rating}
        )
        await db.commit()
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

    # ── Reopen ────────────────────────────────────────────────────────────────

    @staticmethod
    async def reopen(db: AsyncSession, user: User, complaint_id: str) -> Complaint:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        assert_can_handle_complaint(user, complaint)
        _assert_valid_transition(complaint.status, ComplaintStatus.IN_PROGRESS)

        old_status = complaint.status
        complaint.status = ComplaintStatus.IN_PROGRESS
        complaint.resolved_at = None

        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.STATUS_CHANGE,
            old_val={"status": old_status.value}, new_val={"status": ComplaintStatus.IN_PROGRESS.value}
        )
        await db.commit()
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

    # ── Internal Notes ────────────────────────────────────────────────────────

    @staticmethod
    async def add_internal_note(
        db: AsyncSession, user: User, complaint_id: str,
        content: str, is_visible_to_employee: bool
    ) -> InternalNote:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        from app.core.rbac import can_create_internal_note
        if not can_create_internal_note(user, complaint):
            raise ForbiddenError("You cannot add notes to this complaint.")

        note = InternalNote(
            complaint_id=complaint.id,
            author_user_id=user.id,
            role_at_time=user.role.value,
            content=content,
            is_visible_to_employee=is_visible_to_employee,
        )
        db.add(note)
        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.NOTE_ADDED
        )
        await db.commit()
        await db.refresh(note)
        return note

    @staticmethod
    async def list_internal_notes(
        db: AsyncSession, user: User, complaint_id: str
    ) -> list[InternalNote]:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        from app.core.rbac import can_see_internal_notes
        if not can_see_internal_notes(user, complaint):
            raise ForbiddenError("You cannot view notes for this complaint.")

        result = await db.execute(
            select(InternalNote)
            .where(InternalNote.complaint_id == complaint_id)
            .order_by(InternalNote.created_at.asc())
        )
        return result.scalars().all()

    # ── Audit Logs ────────────────────────────────────────────────────────────

    @staticmethod
    async def list_audit_logs(
        db: AsyncSession, user: User, complaint_id: str
    ) -> list[ComplaintAuditLog]:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        assert_can_view_complaint(user, complaint)

        result = await db.execute(
            select(ComplaintAuditLog)
            .where(ComplaintAuditLog.complaint_id == complaint_id)
            .order_by(ComplaintAuditLog.created_at.asc())
        )
        return result.scalars().all()

    @staticmethod
    async def override_meta(
        db: AsyncSession, user: User, complaint_id: str,
        primary_department: str | None = None,
        sub_category: str | None = None,
        priority_level: PriorityLevel | None = None,
        is_hr_sensitive: bool | None = None,
    ) -> Complaint:
        from datetime import timedelta
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        assert_can_handle_complaint(user, complaint)

        old_val = {}
        new_val = {}
        dept_changed = False

        if primary_department is not None and primary_department != complaint.primary_department:
            old_val["primary_department"] = complaint.primary_department
            complaint.primary_department = primary_department
            new_val["primary_department"] = primary_department
            dept_changed = True

        if sub_category is not None and sub_category != complaint.sub_category:
            old_val["sub_category"] = complaint.sub_category
            complaint.sub_category = sub_category
            new_val["sub_category"] = sub_category
            dept_changed = True

        if is_hr_sensitive is not None and is_hr_sensitive != complaint.is_hr_sensitive:
            old_val["is_hr_sensitive"] = complaint.is_hr_sensitive
            complaint.is_hr_sensitive = is_hr_sensitive
            new_val["is_hr_sensitive"] = is_hr_sensitive
            dept_changed = True

        if dept_changed:
            await ComplaintService._log_audit(
                db, complaint.id, user.id, AuditActionType.CATEGORY_UPDATE,
                old_val=old_val, new_val=new_val
            )

        if priority_level is not None and priority_level != complaint.priority_level:
            old_prio = complaint.priority_level
            complaint.priority_level = priority_level
            complaint.priority_source = PrioritySource.MANUAL

            # Recalculate SLA due date
            sla_map = {
                PriorityLevel.CRITICAL: settings.SLA_HOURS_CRITICAL,
                PriorityLevel.HIGH: settings.SLA_HOURS_HIGH_PRIORITY,
                PriorityLevel.MEDIUM: settings.SLA_HOURS_DEFAULT,
                PriorityLevel.LOW: settings.SLA_HOURS_DEFAULT,
            }
            sla_hours = sla_map.get(priority_level, settings.SLA_HOURS_DEFAULT)
            complaint.sla_due_at = complaint.created_at + timedelta(hours=sla_hours)

            await ComplaintService._log_audit(
                db, complaint.id, user.id, AuditActionType.PRIORITY_OVERRIDE,
                old_val={"priority_level": old_prio.value},
                new_val={"priority_level": priority_level.value, "priority_source": PrioritySource.MANUAL.value}
            )

        await db.commit()
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

