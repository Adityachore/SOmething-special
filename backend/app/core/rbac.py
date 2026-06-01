from fastapi import HTTPException, status
from app.db.models.user import User, UserRole
from app.db.models.complaint import Complaint


class RBACError(HTTPException):
    def __init__(self, detail: str = "You do not have permission to perform this action."):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


# ─── Role Checks ─────────────────────────────────────────────────────────────

def require_roles(*roles: UserRole):
    """Returns a checker that raises 403 if user's role is not in the allowed set."""
    def check(user: User) -> User:
        if user.role not in roles:
            raise RBACError()
        return user
    return check


def is_employee(user: User) -> bool:
    return user.role == UserRole.EMPLOYEE


def is_cmd(user: User) -> bool:
    return user.role == UserRole.CMD


def is_hr(user: User) -> bool:
    return user.role == UserRole.HR


def is_admin(user: User) -> bool:
    return user.role == UserRole.ADMIN


def is_handler(user: User) -> bool:
    """CMD or HR or ADMIN — anyone who can handle complaints."""
    return user.role in (UserRole.CMD, UserRole.HR, UserRole.ADMIN)


# ─── Complaint Access Rules ───────────────────────────────────────────────────

def can_view_complaint(user: User, complaint: Complaint) -> bool:
    """
    EMPLOYEE: only own complaints.
    CMD: own department, non-HR-sensitive (or if explicitly allowed).
    HR: all complaints, including HR-sensitive.
    ADMIN: all complaints.
    """
    if user.role == UserRole.ADMIN:
        return True

    if user.role == UserRole.HR:
        return True

    if user.role == UserRole.CMD:
        if complaint.tenant_id != user.tenant_id:
            return False
        if complaint.is_hr_sensitive:
            return False  # CMD cannot see HR-sensitive by default
        return complaint.primary_department == user.department

    # EMPLOYEE
    return complaint.employee_id == user.id and complaint.tenant_id == user.tenant_id


def can_edit_complaint(user: User, complaint: Complaint) -> bool:
    """Employee can only edit own PENDING complaints."""
    from app.db.models.complaint import ComplaintStatus
    return (
        user.role == UserRole.EMPLOYEE
        and complaint.employee_id == user.id
        and complaint.status == ComplaintStatus.PENDING
        and complaint.tenant_id == user.tenant_id
    )


def can_handle_complaint(user: User, complaint: Complaint) -> bool:
    """CMD/HR/ADMIN can handle (assign, resolve, reject, etc.)"""
    if complaint.tenant_id != user.tenant_id:
        return False
    if user.role == UserRole.ADMIN:
        return True
    if user.role == UserRole.HR:
        return True
    if user.role == UserRole.CMD:
        return (
            complaint.primary_department == user.department
            and not complaint.is_hr_sensitive
        )
    return False


def can_view_hr_sensitive(user: User) -> bool:
    return user.role in (UserRole.HR, UserRole.ADMIN)


def can_see_internal_notes(user: User, complaint: Complaint) -> bool:
    if complaint.tenant_id != user.tenant_id:
        return False
    if user.role in (UserRole.HR, UserRole.ADMIN):
        return True
    if user.role == UserRole.CMD:
        return complaint.primary_department == user.department
    return False


def can_create_internal_note(user: User, complaint: Complaint) -> bool:
    return can_see_internal_notes(user, complaint)


def assert_can_view_complaint(user: User, complaint: Complaint) -> None:
    if not can_view_complaint(user, complaint):
        raise RBACError("You do not have access to this complaint.")


def assert_can_handle_complaint(user: User, complaint: Complaint) -> None:
    if not can_handle_complaint(user, complaint):
        raise RBACError("You do not have permission to manage this complaint.")


def assert_tenant_match(user: User, tenant_id: str) -> None:
    if user.tenant_id != tenant_id:
        raise RBACError("Cross-tenant access is not allowed.")
