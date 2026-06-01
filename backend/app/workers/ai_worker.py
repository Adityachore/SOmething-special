"""
AI Worker — processes categorization, priority, similarity, and summary/tags tasks.
Runs with exponential backoff retry and rule-based fallback on failure.
"""
import asyncio
from celery import Task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.workers.celery_app import celery_app
from app.db.base import AsyncSessionLocal
from app.db.models.complaint import Complaint, PriorityLevel, PrioritySource
from app.db.models.complaint_embedding import ComplaintEmbedding
from app.db.models.processing_queue import ProcessingQueue, QueueStatus, TaskType
from app.db.models.tag import Tag, ComplaintTag
from app.ai.gemini_provider import gemini_provider
from app.ai.fallback import fallback_categorize, fallback_priority, fallback_summary_tags


def run_async(coro):
    """Run an async coroutine from a sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        val = loop.run_until_complete(coro)
        from app.db.base import engine
        loop.run_until_complete(engine.dispose())
        return val
    finally:
        loop.close()


async def _update_queue_entry(db: AsyncSession, queue_id: str, status: QueueStatus, error: str | None = None):
    result = await db.execute(select(ProcessingQueue).where(ProcessingQueue.id == queue_id))
    entry = result.scalar_one_or_none()
    if entry:
        entry.status = status
        entry.attempts += 1
        if error:
            entry.last_error = error
        if entry.attempts >= entry.max_attempts and status == QueueStatus.FAILED:
            entry.permanent_failure = True
        await db.commit()


@celery_app.task(
    bind=True,
    max_retries=5,
    default_retry_delay=30,
    queue="ai_tasks",
    name="app.workers.ai_worker.process_ai_pipeline"
)
def process_ai_pipeline(self: Task, complaint_id: str, tenant_id: str, queue_id: str):
    """Full AI pipeline: categorize → priority → embeddings → summary/tags."""
    run_async(_process_ai_pipeline_async(self, complaint_id, tenant_id, queue_id))


async def _process_ai_pipeline_async(task: Task, complaint_id: str, tenant_id: str, queue_id: str):
    async with AsyncSessionLocal() as db:
        # Load complaint
        result = await db.execute(
            select(Complaint).where(
                Complaint.id == complaint_id,
                Complaint.tenant_id == tenant_id,
            )
        )
        complaint = result.scalar_one_or_none()
        if not complaint:
            return

        await _update_queue_entry(db, queue_id, QueueStatus.PROCESSING)

        try:
            # 1. Categorization
            try:
                cat = await gemini_provider.categorize(complaint.title, complaint.description)
            except Exception:
                cat = fallback_categorize(complaint.title, complaint.description)

            complaint.primary_department = cat.department
            complaint.sub_category = cat.sub_category
            complaint.is_hr_sensitive = cat.is_hr_sensitive
            complaint.ai_categorization_reason = cat.reason

            # 2. Priority
            try:
                prio = await gemini_provider.get_priority(
                    complaint.title, complaint.description, cat.is_hr_sensitive
                )
            except Exception:
                prio = fallback_priority(complaint.title, complaint.description, cat.is_hr_sensitive)

            complaint.priority_level = PriorityLevel(prio.priority_level)
            complaint.priority_score = prio.priority_score
            complaint.priority_source = PrioritySource(prio.source)
            complaint.ai_priority_reason = prio.reason

            # Update SLA based on new priority
            from datetime import datetime, timezone, timedelta
            from app.config import settings
            sla_map = {
                PriorityLevel.CRITICAL: settings.SLA_HOURS_CRITICAL,
                PriorityLevel.HIGH: settings.SLA_HOURS_HIGH_PRIORITY,
                PriorityLevel.MEDIUM: settings.SLA_HOURS_DEFAULT,
                PriorityLevel.LOW: settings.SLA_HOURS_DEFAULT,
            }
            sla_hours = sla_map.get(complaint.priority_level, settings.SLA_HOURS_DEFAULT)
            complaint.sla_due_at = complaint.created_at + timedelta(hours=sla_hours)

            # 3. Embeddings (for similarity)
            try:
                text = f"{complaint.title} {complaint.description}"
                embedding = await gemini_provider.get_embedding(text)
                existing_emb = await db.execute(
                    select(ComplaintEmbedding).where(ComplaintEmbedding.complaint_id == complaint_id)
                )
                emb_obj = existing_emb.scalar_one_or_none()
                if emb_obj:
                    emb_obj.embedding = embedding
                else:
                    db.add(ComplaintEmbedding(complaint_id=complaint_id, embedding=embedding))
            except Exception:
                pass  # Embedding failure is non-blocking

            # 4. Summary & Tags
            try:
                st = await gemini_provider.summarize_and_tag(complaint.title, complaint.description)
                complaint.ai_summary = st.summary

                # Create tags
                for tag_name in st.tags:
                    tag_result = await db.execute(
                        select(Tag).where(Tag.tenant_id == tenant_id, Tag.name == tag_name)
                    )
                    tag = tag_result.scalar_one_or_none()
                    if not tag:
                        tag = Tag(tenant_id=tenant_id, name=tag_name, type="AI_GENERATED")
                        db.add(tag)
                        await db.flush()
                    # Check if already linked
                    link_result = await db.execute(
                        select(ComplaintTag).where(
                            ComplaintTag.complaint_id == complaint_id,
                            ComplaintTag.tag_id == tag.id
                        )
                    )
                    if not link_result.scalar_one_or_none():
                        db.add(ComplaintTag(complaint_id=complaint_id, tag_id=tag.id))
            except Exception:
                st = fallback_summary_tags(complaint.title, complaint.description)
                complaint.ai_summary = st.summary

            await db.commit()
            await _update_queue_entry(db, queue_id, QueueStatus.DONE)

        except Exception as exc:
            await _update_queue_entry(db, queue_id, QueueStatus.FAILED, str(exc))
            try:
                task.retry(exc=exc, countdown=2 ** task.request.retries * 30)
            except task.MaxRetriesExceededError:
                pass
