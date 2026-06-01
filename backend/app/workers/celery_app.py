from celery import Celery
from app.config import settings

celery_app = Celery(
    "ai_cmp",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,

    # Queue routing
    task_routes={
        "app.workers.ai_worker.*": {"queue": "ai_tasks"},
        "app.workers.notification_worker.*": {"queue": "notifications"},
        "app.workers.escalation_worker.*": {"queue": "escalation"},
    },

    # Beat schedule for periodic tasks
    beat_schedule={
        "escalation-check": {
            "task": "app.workers.escalation_worker.check_escalations",
            "schedule": settings.ESCALATION_CHECK_INTERVAL_MINUTES * 60,
        },
    },
)

# Import tasks to register them
import app.workers.ai_worker  # noqa
import app.workers.escalation_worker  # noqa
import app.workers.notification_worker  # noqa


# Dispose SQLAlchemy connection pool on worker process start to prevent loop mismatch
from celery.signals import worker_process_init

@worker_process_init.connect
def bootstrap_worker(*args, **kwargs):
    from app.db.base import engine
    engine.sync_engine.dispose()

