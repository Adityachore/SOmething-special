"""Escalation worker — periodic job that checks SLA breaches and escalates complaints."""
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, and_
from app.workers.celery_app import celery_app
from app.db.base import AsyncSessionLocal
from app.db.models.complaint import Complaint, ComplaintStatus
from app.db.models.notification import Notification, NotificationType, NotificationChannel, NotificationStatus


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        val = loop.run_until_complete(coro)
        from app.db.base import engine
        loop.run_until_complete(engine.dispose())
        return val
    finally:
        loop.close()


@celery_app.task(name="app.workers.escalation_worker.check_escalations", queue="escalation")
def check_escalations():
    run_async(_check_escalations())


async def _check_escalations():
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Complaint).where(
                and_(
                    Complaint.status.in_([ComplaintStatus.PENDING, ComplaintStatus.IN_PROGRESS]),
                    Complaint.sla_due_at.isnot(None),
                    Complaint.sla_due_at < now,
                    Complaint.deleted_at.is_(None),
                )
            )
        )
        breached = result.scalars().all()

        for complaint in breached:
            new_level = min(complaint.escalation_level + 1, 3)
            if new_level == complaint.escalation_level:
                continue

            complaint.escalation_level = new_level

            notif_type = (
                NotificationType.ESCALATION_LEVEL_1
                if new_level == 1
                else NotificationType.ESCALATION_LEVEL_2
            )

            # Notify the assigned handler if any
            if complaint.assigned_to_user_id:
                db.add(Notification(
                    tenant_id=complaint.tenant_id,
                    user_id=complaint.assigned_to_user_id,
                    complaint_id=complaint.id,
                    type=notif_type,
                    channel=NotificationChannel.IN_APP,
                    title=f"⚠️ Escalation Level {new_level}: Complaint SLA breached",
                    payload_json={"complaint_id": complaint.id, "level": new_level},
                    status=NotificationStatus.PENDING,
                ))

        await db.commit()
