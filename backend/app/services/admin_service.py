from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, extract, text
from app.db.models.complaint import Complaint, ComplaintStatus
from app.db.models.user import User


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

        # Active users count
        active_users_result = await db.execute(
            select(func.count(User.id)).where(
                User.tenant_id == tenant_id,
                User.status == "Active",
                User.deleted_at.is_(None),
            )
        )
        active_users_count = active_users_result.scalar_one()

        # Weekly trend — last 8 weeks
        weekly_trend = await AdminService.get_weekly_trend(db, tenant_id)

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
            "active_users_count": active_users_count,
            "weekly_trend": weekly_trend,
        }

    @staticmethod
    async def get_weekly_trend(db: AsyncSession, tenant_id: str) -> list[dict]:
        """Returns complaint counts grouped by ISO week for the last 8 weeks."""
        result = await db.execute(
            select(
                func.to_char(Complaint.created_at, "IYYY-IW").label("week"),
                func.count(Complaint.id).label("total"),
                func.sum(
                    case((Complaint.status == ComplaintStatus.SOLVED, 1), else_=0)
                ).label("resolved"),
                func.sum(
                    case((Complaint.status == ComplaintStatus.PENDING, 1), else_=0)
                ).label("pending"),
            )
            .where(
                Complaint.tenant_id == tenant_id,
                Complaint.deleted_at.is_(None),
                Complaint.created_at >= func.now() - text("interval '8 weeks'"),
            )
            .group_by(text("week"))
            .order_by(text("week"))
        )
        rows = result.all()
        return [
            {"date": row.week, "total": row.total, "resolved": row.resolved, "pending": row.pending}
            for row in rows
        ]

