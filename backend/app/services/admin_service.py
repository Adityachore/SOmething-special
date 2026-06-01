from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.db.models.complaint import Complaint, ComplaintStatus


class AdminService:

    @staticmethod
    async def get_analytics_overview(db: AsyncSession, tenant_id: str) -> dict:
        # Status breakdown
        result = await db.execute(
            select(Complaint.status, func.count(Complaint.id))
            .where(Complaint.tenant_id == tenant_id, Complaint.deleted_at.is_(None))
            .group_by(Complaint.status)
        )
        status_counts = {row[0].value: row[1] for row in result.all()}

        # Department breakdown
        dept_result = await db.execute(
            select(Complaint.primary_department, func.count(Complaint.id))
            .where(
                Complaint.tenant_id == tenant_id,
                Complaint.deleted_at.is_(None),
                Complaint.primary_department.isnot(None)
            )
            .group_by(Complaint.primary_department)
        )
        department_breakdown = {row[0]: row[1] for row in dept_result.all()}

        # Priority breakdown
        priority_result = await db.execute(
            select(Complaint.priority_level, func.count(Complaint.id))
            .where(Complaint.tenant_id == tenant_id, Complaint.deleted_at.is_(None))
            .group_by(Complaint.priority_level)
        )
        priority_breakdown = {row[0].value: row[1] for row in priority_result.all()}

        # Total
        total = sum(status_counts.values())

        # SLA breaches (resolved after sla_due_at)
        sla_breach = await db.execute(
            select(func.count(Complaint.id)).where(
                Complaint.tenant_id == tenant_id,
                Complaint.resolved_at.isnot(None),
                Complaint.sla_due_at.isnot(None),
                Complaint.resolved_at > Complaint.sla_due_at,
            )
        )
        sla_breach_count = sla_breach.scalar_one()

        # Avg resolution time (hours)
        avg_result = await db.execute(
            select(
                func.avg(
                    func.extract("epoch", Complaint.resolved_at - Complaint.created_at) / 3600
                )
            ).where(
                Complaint.tenant_id == tenant_id,
                Complaint.status == ComplaintStatus.SOLVED,
                Complaint.resolved_at.isnot(None),
            )
        )
        avg_hours = avg_result.scalar_one()

        # Repeat complaints (those with a cluster_id)
        repeat_result = await db.execute(
            select(func.count(Complaint.id)).where(
                Complaint.tenant_id == tenant_id,
                Complaint.cluster_id.isnot(None),
                Complaint.deleted_at.is_(None),
            )
        )
        repeat_count = repeat_result.scalar_one()

        return {
            "total_complaints": total,
            "pending": status_counts.get("PENDING", 0),
            "in_progress": status_counts.get("IN_PROGRESS", 0),
            "solved": status_counts.get("SOLVED", 0),
            "rejected": status_counts.get("REJECTED", 0),
            "withdrawn": status_counts.get("WITHDRAWN", 0),
            "expired": status_counts.get("EXPIRED", 0),
            "avg_resolution_hours": round(avg_hours, 2) if avg_hours else None,
            "sla_breach_count": sla_breach_count,
            "repeat_complaint_count": repeat_count,
            "department_breakdown": department_breakdown,
            "priority_breakdown": priority_breakdown,
        }
