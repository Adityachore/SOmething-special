from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.db.models.complaint import Complaint, ComplaintStatus, PriorityLevel
from app.db.models.user import User, UserRole


class SearchService:

    @staticmethod
    async def search(
        db: AsyncSession,
        user: User,
        query: str | None = None,
        status: ComplaintStatus | None = None,
        department: str | None = None,
        priority: PriorityLevel | None = None,
        is_hr_sensitive: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Complaint], int]:
        from sqlalchemy.orm import selectinload

        conditions = [
            Complaint.tenant_id == user.tenant_id,
            Complaint.deleted_at.is_(None),
        ]

        # Scope by role
        if user.role in (UserRole.ADMIN, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN):
            pass
        elif user.role == UserRole.HR:
            # HR sees all complaints
            pass
        elif user.role == UserRole.CMD:
            # CMD sees all non-HR sensitive complaints
            conditions.append(Complaint.is_hr_sensitive == False)
        elif user.role == UserRole.DEPT_HEAD:
            # DEPT_HEAD only sees complaints routed to their department
            conditions.append(Complaint.primary_department_id == user.department_id)

        if status:
            conditions.append(Complaint.status == status)
        if department:
            conditions.append(Complaint.primary_department == department)
        if priority:
            conditions.append(Complaint.priority_level == priority)
        if is_hr_sensitive is not None:
            conditions.append(Complaint.is_hr_sensitive == is_hr_sensitive)
        if query:
            from sqlalchemy import or_
            search_term = f"%{query}%"
            conditions.append(
                or_(
                    Complaint.title.ilike(search_term),
                    Complaint.description.ilike(search_term),
                )
            )

        base_q = select(Complaint).where(and_(*conditions))
        total_result = await db.execute(select(func.count()).select_from(base_q.subquery()))
        total = total_result.scalar_one()

        result = await db.execute(
            base_q
            .options(
                selectinload(Complaint.resolution_detail),
                selectinload(Complaint.rejection),
                selectinload(Complaint.rating),
                selectinload(Complaint.attachments),
            )
            .order_by(Complaint.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return result.scalars().all(), total
