# Import all models so Alembic and SQLAlchemy can discover them
from app.db.models.tenant import Tenant
from app.db.models.user import User, UserRole
from app.db.models.complaint import Complaint, ComplaintStatus, PriorityLevel, PrioritySource
from app.db.models.complaint_embedding import ComplaintEmbedding
from app.db.models.cluster import Cluster
from app.db.models.resolution_detail import ResolutionDetail
from app.db.models.rejection_rating import Rejection, Rating
from app.db.models.internal_note import InternalNote
from app.db.models.complaint_audit_log import ComplaintAuditLog, AuditActionType
from app.db.models.processing_queue import ProcessingQueue, TaskType, QueueStatus
from app.db.models.notification import Notification, NotificationPreference, NotificationType, NotificationChannel
from app.db.models.attachment import ComplaintAttachment
from app.db.models.tag import Tag, ComplaintTag
from app.db.models.auth_token import AuthToken
from app.db.models.profile_update_request import ProfileUpdateRequest
from app.db.models.department import Department, DepartmentType
from app.db.models.invitation import Invitation

__all__ = [
    "Tenant", "User", "UserRole",
    "Complaint", "ComplaintStatus", "PriorityLevel", "PrioritySource",
    "ComplaintEmbedding", "Cluster",
    "ResolutionDetail", "Rejection", "Rating",
    "InternalNote", "ComplaintAuditLog", "AuditActionType",
    "ProcessingQueue", "TaskType", "QueueStatus",
    "Notification", "NotificationPreference", "NotificationType", "NotificationChannel",
    "ComplaintAttachment", "Tag", "ComplaintTag",
    "AuthToken", "ProfileUpdateRequest",
    "Department", "DepartmentType", "Invitation",
]
