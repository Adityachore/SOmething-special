from fastapi import HTTPException, status
from app.db.models.user import User, UserRole
from app.db.models.complaint import Complaint
from app.db.models.department import Department, DepartmentType


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
    return user.role in (UserRole.ADMIN, UserRole.ORG_ADMIN)


def is_handler(user: User) -> bool:
    """ORG_ADMIN or ADMIN or CMD or HR or DEPT_HEAD or INVESTIGATOR or HANDLER or EVALUATOR — anyone who can handle complaints."""
    return user.role in (UserRole.ORG_ADMIN, UserRole.ADMIN, UserRole.CMD, UserRole.HR, UserRole.DEPT_HEAD, UserRole.INVESTIGATOR, UserRole.HANDLER, UserRole.EVALUATOR)


def _is_user_in_hr_dept(user: User) -> bool:
    """Helper to check if the user belongs to an HR-type department."""
    return bool(user.department_rel and user.department_rel.type == DepartmentType.HR)


# ─── Complaint Access Rules ───────────────────────────────────────────────────

def can_view_complaint(user: User, complaint: Complaint, tenant=None) -> bool:
    """
    Privacy-aware complaint visibility check.

    When a `tenant` (Tenant model instance) is provided, dynamic privacy settings
    govern CMD and DEPT_HEAD access to HR-sensitive complaints:
      - allow_cmd_view_hr_sensitive: CMD can see full HR-sensitive complaints
      - allow_cmd_view_hr_sensitive_anonymized: CMD can see anonymized HR-sensitive (handled at API layer)
      - allow_dept_head_view_hr_sensitive: DEPT_HEAD can see HR-sensitive for their department

    Without a tenant, the legacy hardcoded rules apply.
    """
    if user.role == UserRole.SUPER_ADMIN:
        return True

    if complaint.tenant_id != user.tenant_id:
        return False

    # Owner always sees their own complaint
    if complaint.employee_id == user.id:
        return True

    if user.role in (UserRole.ORG_ADMIN, UserRole.ADMIN):
        return True

    if complaint.is_hr_sensitive:
        # HR/INVESTIGATOR/HANDLER/EVALUATOR role or explicit capability always has access
        if user.role in (UserRole.HR, UserRole.INVESTIGATOR, UserRole.HANDLER, UserRole.EVALUATOR) or user.can_view_hr_sensitive or _is_user_in_hr_dept(user):
            return True

        # CMD access governed by tenant settings
        if user.role == UserRole.CMD:
            if tenant:
                return tenant.allow_cmd_view_hr_sensitive or tenant.allow_cmd_view_hr_sensitive_anonymized
            return False  # Default: CMD cannot see HR-sensitive without tenant settings

        # DEPT_HEAD access governed by tenant settings
        if user.role == UserRole.DEPT_HEAD:
            if tenant and tenant.allow_dept_head_view_hr_sensitive:
                return complaint.primary_department_id == user.department_id
            return False

        return False

    # Non-HR-sensitive complaints
    if user.role in (UserRole.HR, UserRole.CMD, UserRole.INVESTIGATOR, UserRole.HANDLER, UserRole.EVALUATOR):
        return True

    if user.role == UserRole.DEPT_HEAD:
        return complaint.primary_department_id == user.department_id

    # EMPLOYEE
    return complaint.employee_id == user.id


def can_edit_complaint(user: User, complaint: Complaint) -> bool:
    """Employee can only edit own PENDING complaints."""
    from app.db.models.complaint import ComplaintStatus
    return (
        user.role == UserRole.EMPLOYEE
        and complaint.employee_id == user.id
        and complaint.status == ComplaintStatus.PENDING
        and complaint.tenant_id == user.tenant_id
    )


def can_handle_complaint(user: User, complaint: Complaint, tenant=None) -> bool:
    """
    Privacy-aware handling permission check. Same tenant-settings logic as can_view_complaint.
    CMD/HR/ADMIN/DEPT_HEAD can handle (assign, resolve, reject, etc.)
    """
    if user.role == UserRole.SUPER_ADMIN:
        return True

    if complaint.tenant_id != user.tenant_id:
        return False

    if user.role in (UserRole.ORG_ADMIN, UserRole.ADMIN):
        return True

    if complaint.is_hr_sensitive:
        if user.role in (UserRole.HR, UserRole.INVESTIGATOR, UserRole.HANDLER, UserRole.EVALUATOR) or user.can_view_hr_sensitive or _is_user_in_hr_dept(user):
            return True

        # CMD can handle only if tenant explicitly allows full (non-anonymized) access
        if user.role == UserRole.CMD:
            if tenant:
                return tenant.allow_cmd_view_hr_sensitive
            return False

        if user.role == UserRole.DEPT_HEAD:
            if tenant and tenant.allow_dept_head_view_hr_sensitive:
                return complaint.primary_department_id == user.department_id
            return False

        return False

    if user.role in (UserRole.HR, UserRole.INVESTIGATOR, UserRole.HANDLER, UserRole.EVALUATOR):
        return True

    if user.role == UserRole.CMD:
        return True

    if user.role == UserRole.DEPT_HEAD:
        return complaint.primary_department_id == user.department_id

    return False


def can_view_hr_sensitive(user: User, tenant=None) -> bool:
    """Check if user can view HR-sensitive complaints at all (used for list filtering)."""
    if user.role in (UserRole.HR, UserRole.INVESTIGATOR, UserRole.HANDLER, UserRole.EVALUATOR, UserRole.ADMIN, UserRole.ORG_ADMIN) or _is_user_in_hr_dept(user) or user.can_view_hr_sensitive:
        return True
    if user.role == UserRole.CMD and tenant:
        return tenant.allow_cmd_view_hr_sensitive or tenant.allow_cmd_view_hr_sensitive_anonymized
    if user.role == UserRole.DEPT_HEAD and tenant:
        return tenant.allow_dept_head_view_hr_sensitive
    return False


def can_see_internal_notes(user: User, complaint: Complaint, tenant=None) -> bool:
    return can_view_complaint(user, complaint, tenant) and user.role != UserRole.EMPLOYEE


def can_create_internal_note(user: User, complaint: Complaint, tenant=None) -> bool:
    return can_handle_complaint(user, complaint, tenant) and user.role != UserRole.EMPLOYEE


def assert_can_view_complaint(user: User, complaint: Complaint, tenant=None) -> None:
    if not can_view_complaint(user, complaint, tenant):
        raise RBACError("You do not have access to this complaint.")


def assert_can_handle_complaint(user: User, complaint: Complaint, tenant=None) -> None:
    if not can_handle_complaint(user, complaint, tenant):
        raise RBACError("You do not have permission to manage this complaint.")


def assert_tenant_match(user: User, tenant_id: str) -> None:
    if user.role == UserRole.SUPER_ADMIN:
        return
    if user.tenant_id != tenant_id:
        raise RBACError("Cross-tenant access is not allowed.")
