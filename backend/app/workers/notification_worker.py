"""Notification worker — marks in-app notifications as sent."""
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from app.workers.celery_app import celery_app
from app.db.base import AsyncSessionLocal
from app.db.models.notification import Notification, NotificationStatus


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        val = loop.run_until_complete(coro)
        from app.db.base import engine
        loop.run_until_complete(engine.dispose())
        return val
    finally:
        loop.close()


@celery_app.task(name="app.workers.notification_worker.process_notifications", queue="notifications")
def process_notifications():
    run_async(_process_notifications())


async def _process_notifications():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Notification).where(
                Notification.status == NotificationStatus.PENDING,
                Notification.channel == "IN_APP",
            ).limit(100)
        )
        pending = result.scalars().all()

        for notif in pending:
            # In-app notifications are "sent" by just marking them — frontend polls
            notif.status = NotificationStatus.SENT
            notif.sent_at = datetime.now(timezone.utc)

        await db.commit()
