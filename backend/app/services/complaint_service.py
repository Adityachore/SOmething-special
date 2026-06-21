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
        ComplaintStatus.WAITING_FOR_EMPLOYEE,
        ComplaintStatus.RESOLUTION_PROPOSED,
    ],
    ComplaintStatus.WAITING_FOR_EMPLOYEE: [
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.SOLVED,
        ComplaintStatus.REJECTED,
        ComplaintStatus.RESOLUTION_PROPOSED,
    ],
    ComplaintStatus.RESOLUTION_PROPOSED: [
        ComplaintStatus.SOLVED,
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.REJECTED,
    ],
    ComplaintStatus.SOLVED: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.CLOSED],
    ComplaintStatus.CLOSED: [],
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
    async def create(
        db: AsyncSession,
        user: User,
        title: str,
        description: str,
        employee_department: str | None = None,
        employee_category: str | None = None,
        employee_subcategory: str | None = None,
        is_anonymous: bool = False,
        visibility_settings: str | None = None,
    ) -> Complaint:
        from datetime import timedelta
        from app.db.models.tenant import Tenant
        from app.core.sla import calculate_business_hours_sla
        tenant_res = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
        tenant = tenant_res.scalar_one()
        sla_hours = _get_sla_hours(PriorityLevel.MEDIUM)
        sla_due = calculate_business_hours_sla(datetime.now(timezone.utc), sla_hours, tenant)

        complaint = Complaint(
            tenant_id=user.tenant_id,
            employee_id=user.id,
            title=title,
            description=description,
            status=ComplaintStatus.PENDING,
            priority_level=PriorityLevel.MEDIUM,  # Default until AI processes
            sla_due_at=sla_due,
            employee_department=employee_department,
            employee_category=employee_category,
            employee_subcategory=employee_subcategory,
            is_anonymous=is_anonymous,
            visibility_settings=visibility_settings,
            primary_department=employee_department,
            sub_category=employee_subcategory,
            employee_department_id=user.department_id,
            primary_department_id=user.department_id,
        )
        db.add(complaint)
        await db.flush()  # get complaint.id

        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.CREATED,
            new_val={
                "title": title,
                "status": ComplaintStatus.PENDING.value,
                "employee_department": employee_department,
                "is_anonymous": is_anonymous
            }
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
        page: int, page_size: int,
        team_id: str | None = None
    ) -> tuple[list[Complaint], int]:
        from app.db.models.user import UserRole
        from app.db.models.tenant import Tenant
        conditions = [
            Complaint.tenant_id == user.tenant_id,
            Complaint.deleted_at.is_(None),
        ]

        # Fetch tenant settings for privacy-aware filtering
        tenant_res = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
        tenant = tenant_res.scalar_one_or_none()

        if user.role in (UserRole.ADMIN, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN):
            pass
        elif user.role == UserRole.HR:
            # HR sees all complaints
            pass
        elif user.role == UserRole.CMD:
            # CMD sees all non-HR sensitive complaints, plus HR-sensitive if tenant allows
            if tenant and (tenant.allow_cmd_view_hr_sensitive or tenant.allow_cmd_view_hr_sensitive_anonymized):
                pass  # CMD can see everything (anonymization handled at serialization)
            else:
                conditions.append(Complaint.is_hr_sensitive == False)
        elif user.role == UserRole.DEPT_HEAD:
            # DEPT_HEAD only sees complaints routed to their department
            if tenant and tenant.allow_dept_head_view_hr_sensitive:
                conditions.append(Complaint.primary_department_id == user.department_id)
            else:
                conditions.append(and_(
                    Complaint.primary_department_id == user.department_id,
                    or_(Complaint.is_hr_sensitive == False, Complaint.is_hr_sensitive.is_(None))
                ))

        if status:
            conditions.append(Complaint.status == status)
        if department:
            conditions.append(Complaint.primary_department == department)
        if priority:
            conditions.append(Complaint.priority_level == priority)
        if team_id:
            conditions.append(Complaint.assigned_team_id == team_id)

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
        db: AsyncSession, user: User, complaint_id: str,
        assigned_to_user_id: str | None = None,
        assigned_team_id: str | None = None
    ) -> Complaint:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        assert_can_handle_complaint(user, complaint)

        old_assigned = complaint.assigned_to_user_id
        old_team = complaint.assigned_team_id
        complaint.assigned_to_user_id = assigned_to_user_id
        complaint.assigned_team_id = assigned_team_id
        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.ASSIGNMENT_CHANGE,
            old_val={"assigned_to": old_assigned, "assigned_team": old_team},
            new_val={"assigned_to": assigned_to_user_id, "assigned_team": assigned_team_id}
        )
        await db.commit()
        await ComplaintService._notify(db, complaint, user, "assigned")
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
        await ComplaintService._notify(db, complaint, user, "started")
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
        if complaint.first_resolved_at is None:
            complaint.first_resolved_at = now
        
        if complaint.sla_due_at:
            complaint.is_within_sla = (complaint.first_resolved_at <= complaint.sla_due_at)
        else:
            complaint.is_within_sla = True

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
        await ComplaintService._notify(db, complaint, user, "resolved")
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

    # ── Propose Resolution ────────────────────────────────────────────────────

    @staticmethod
    async def propose_resolution(
        db: AsyncSession, user: User, complaint_id: str,
        resolution_note: str, root_cause: str | None, visible_to_employee: bool
    ) -> Complaint:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        assert_can_handle_complaint(user, complaint)
        _assert_valid_transition(complaint.status, ComplaintStatus.RESOLUTION_PROPOSED)

        old_status = complaint.status
        complaint.status = ComplaintStatus.RESOLUTION_PROPOSED

        # Temporarily store the proposed resolution details in an internal note or directly if we use the ResolutionDetail
        # Actually, let's just create the ResolutionDetail and the Reviewer can modify it if needed, or we can just save it.
        # But ResolutionDetail indicates it's resolved. Let's just create an internal note with the proposal for simplicity, 
        # or we can save it to ResolutionDetail and if rejected, we delete it? 
        # Better: create an internal note.
        note_content = f"PROPOSED RESOLUTION:\nRoot Cause: {root_cause or 'N/A'}\nResolution: {resolution_note}"
        
        note = InternalNote(
            complaint_id=complaint.id,
            author_user_id=user.id,
            role_at_time=user.role.value,
            content=note_content,
            is_visible_to_employee=False,
        )
        db.add(note)

        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.STATUS_CHANGE,
            old_val={"status": old_status.value}, new_val={"status": ComplaintStatus.RESOLUTION_PROPOSED.value}
        )
        await db.commit()
        await ComplaintService._notify(db, complaint, user, "resolution_proposed")
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
        
        now = datetime.now(timezone.utc)
        complaint.resolved_at = now
        if complaint.first_resolved_at is None:
            complaint.first_resolved_at = now
            
        if complaint.sla_due_at:
            complaint.is_within_sla = (complaint.first_resolved_at <= complaint.sla_due_at)
        else:
            complaint.is_within_sla = True

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
        await ComplaintService._notify(db, complaint, user, "rejected")
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
        complaint.is_within_sla = None

        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.STATUS_CHANGE,
            old_val={"status": old_status.value}, new_val={"status": ComplaintStatus.IN_PROGRESS.value}
        )
        await db.commit()
        await ComplaintService._notify(db, complaint, user, "reopened")
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

    # ── Close (Final state after SOLVED) ─────────────────────────────────────

    @staticmethod
    async def close(db: AsyncSession, user: User, complaint_id: str) -> Complaint:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        assert_can_handle_complaint(user, complaint)
        _assert_valid_transition(complaint.status, ComplaintStatus.CLOSED)

        old_status = complaint.status
        complaint.status = ComplaintStatus.CLOSED

        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.STATUS_CHANGE,
            old_val={"status": old_status.value}, new_val={"status": ComplaintStatus.CLOSED.value}
        )
        await db.commit()
        await ComplaintService._notify(db, complaint, user, "closed")
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

    # ── Wait for Employee ─────────────────────────────────────────────────────

    @staticmethod
    async def wait_for_employee(db: AsyncSession, user: User, complaint_id: str, note: str | None = None) -> Complaint:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        assert_can_handle_complaint(user, complaint)
        _assert_valid_transition(complaint.status, ComplaintStatus.WAITING_FOR_EMPLOYEE)

        old_status = complaint.status
        complaint.status = ComplaintStatus.WAITING_FOR_EMPLOYEE

        await ComplaintService._log_audit(
            db, complaint.id, user.id, AuditActionType.STATUS_CHANGE,
            old_val={"status": old_status.value},
            new_val={"status": ComplaintStatus.WAITING_FOR_EMPLOYEE.value, "note": note}
        )
        await db.commit()
        await ComplaintService._notify(db, complaint, user, "waiting_for_employee", note)
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

    # ── Notification Helper ───────────────────────────────────────────────────

    @staticmethod
    async def _notify(
        db: AsyncSession,
        complaint: "Complaint",
        actor: User,
        event: str,
        extra_info: str | None = None,
    ):
        """Create in-app notification for the complaint employee and/or assigned handler."""
        from app.db.models.notification import Notification, NotificationType, NotificationChannel, NotificationStatus

        event_map = {
            "assigned": (NotificationType.COMPLAINT_ASSIGNED, "Your complaint has been assigned", True),
            "started": (NotificationType.COMPLAINT_STARTED, "Work has started on your complaint", True),
            "resolved": (NotificationType.COMPLAINT_RESOLVED, "Your complaint has been resolved", True),
            "rejected": (NotificationType.COMPLAINT_REJECTED, "Your complaint has been rejected", True),
            "closed": (NotificationType.COMPLAINT_RESOLVED, "Your complaint has been closed", True),
            "waiting_for_employee": (NotificationType.COMPLAINT_STARTED, "Additional information required for your complaint", True),
            "reopened": (NotificationType.COMPLAINT_STARTED, "Your complaint has been reopened", True),
        }

        if event not in event_map:
            return

        notif_type, title, notify_employee = event_map[event]

        recipients = set()
        if notify_employee and complaint.employee_id and complaint.employee_id != actor.id:
            recipients.add(complaint.employee_id)
        if complaint.assigned_to_user_id and complaint.assigned_to_user_id != actor.id:
            recipients.add(complaint.assigned_to_user_id)
        if complaint.assigned_team_id:
            from app.db.models.team import TeamMember
            team_members_res = await db.execute(
                select(TeamMember.user_id).where(TeamMember.team_id == complaint.assigned_team_id)
            )
            for member_uid in team_members_res.scalars().all():
                if member_uid != actor.id:
                    recipients.add(member_uid)

        for uid in recipients:
            notif = Notification(
                tenant_id=complaint.tenant_id,
                user_id=uid,
                complaint_id=complaint.id,
                type=notif_type,
                channel=NotificationChannel.IN_APP,
                title=f"{title}: {complaint.title[:60]}",
                payload_json={"complaint_id": complaint.id, "extra": extra_info},
                status=NotificationStatus.SENT,
            )
            db.add(notif)

        if recipients:
            await db.commit()



    @staticmethod
    async def add_internal_note(
        db: AsyncSession, user: User, complaint_id: str,
        content: str, is_visible_to_employee: bool
    ) -> InternalNote:
        complaint = await ComplaintService._get_with_relations(db, complaint_id, user.tenant_id)
        from app.db.models.user import UserRole
        if user.role == UserRole.EMPLOYEE:
            if complaint.employee_id != user.id:
                raise ForbiddenError("You cannot add notes to this complaint.")
            is_visible_to_employee = True
        else:
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
        from app.db.models.user import UserRole
        if user.role == UserRole.EMPLOYEE:
            if complaint.employee_id != user.id:
                raise ForbiddenError("You cannot view notes for this complaint.")
            result = await db.execute(
                select(InternalNote)
                .where(
                    InternalNote.complaint_id == complaint_id,
                    InternalNote.is_visible_to_employee == True
                )
                .order_by(InternalNote.created_at.asc())
            )
            return result.scalars().all()

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
            from app.db.models.tenant import Tenant
            from app.core.sla import calculate_business_hours_sla
            tenant_res = await db.execute(select(Tenant).where(Tenant.id == complaint.tenant_id))
            tenant = tenant_res.scalar_one()
            complaint.sla_due_at = calculate_business_hours_sla(complaint.created_at, sla_hours, tenant)

            await ComplaintService._log_audit(
                db, complaint.id, user.id, AuditActionType.PRIORITY_OVERRIDE,
                old_val={"priority_level": old_prio.value},
                new_val={"priority_level": priority_level.value, "priority_source": PrioritySource.MANUAL.value}
            )

        await db.commit()
        return await ComplaintService._get_with_relations(db, complaint.id, user.tenant_id)

