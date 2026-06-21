from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import uuid

from app.db.base import get_db
from app.core.deps import get_current_user
from app.db.models.user import User, UserRole
from app.db.models.team import Team, TeamMember
from app.db.models.complaint import Complaint, ComplaintStatus
from app.schemas.team_schemas import (
    TeamCreate, TeamUpdate, TeamResponse, TeamDetailResponse,
    TeamMemberCreate, TeamMemberResponse
)
from app.core.exceptions import ForbiddenError, NotFoundError

router = APIRouter(prefix="/org/teams", tags=["Teams & Committees"])

def _require_org_admin_or_hr(user: User):
    if user.role not in (UserRole.ORG_ADMIN, UserRole.ADMIN, UserRole.HR):
        raise ForbiddenError("Admin or HR access required.")

@router.post("", response_model=TeamResponse, status_code=201)
async def create_team(
    payload: TeamCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_org_admin_or_hr(user)

    # Check duplicate name within tenant
    dup_res = await db.execute(
        select(Team).where(
            func.lower(Team.name) == func.lower(payload.name),
            Team.tenant_id == user.tenant_id
        )
    )
    if dup_res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Team with name '{payload.name}' already exists.")

    new_team = Team(
        tenant_id=user.tenant_id,
        name=payload.name,
        type=payload.type,
        status="ACTIVE"
    )
    db.add(new_team)
    await db.commit()
    await db.refresh(new_team)
    return new_team

@router.get("", response_model=list[TeamResponse])
async def list_teams(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Any active user in the organization can view teams
    result = await db.execute(
        select(Team)
        .where(Team.tenant_id == user.tenant_id)
        .order_by(Team.name.asc())
    )
    return result.scalars().all()

@router.get("/{team_id}", response_model=TeamDetailResponse)
async def get_team(
    team_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Team)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
        .where(Team.id == team_id, Team.tenant_id == user.tenant_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise NotFoundError("Team", team_id)
    return team

@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    payload: TeamUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_org_admin_or_hr(user)

    result = await db.execute(
        select(Team).where(Team.id == team_id, Team.tenant_id == user.tenant_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise NotFoundError("Team", team_id)

    if payload.name is not None:
        # Check duplicate name within tenant excluding current
        dup_res = await db.execute(
            select(Team).where(
                func.lower(Team.name) == func.lower(payload.name),
                Team.tenant_id == user.tenant_id,
                Team.id != team_id
            )
        )
        if dup_res.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Team with name '{payload.name}' already exists.")
        team.name = payload.name

    if payload.type is not None:
        team.type = payload.type

    if payload.status is not None:
        team.status = payload.status

    await db.commit()
    await db.refresh(team)
    return team

@router.delete("/{team_id}", status_code=204)
async def delete_team(
    team_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_org_admin_or_hr(user)

    result = await db.execute(
        select(Team).where(Team.id == team_id, Team.tenant_id == user.tenant_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise NotFoundError("Team", team_id)

    # Check for active complaints assigned to this team
    complaint_res = await db.execute(
        select(Complaint).where(
            Complaint.assigned_team_id == team_id,
            Complaint.status.notin_([ComplaintStatus.CLOSED, ComplaintStatus.SOLVED, ComplaintStatus.REJECTED, ComplaintStatus.WITHDRAWN])
        )
    )
    if complaint_res.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Cannot delete team with active complaints assigned. Please reassign complaints first."
        )

    await db.delete(team)
    await db.commit()
    return None

@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=201)
async def add_team_member(
    team_id: str,
    payload: TeamMemberCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_org_admin_or_hr(user)

    # Verify team exists and belongs to tenant
    team_res = await db.execute(
        select(Team).where(Team.id == team_id, Team.tenant_id == user.tenant_id)
    )
    team = team_res.scalar_one_or_none()
    if not team:
        raise NotFoundError("Team", team_id)

    # Verify member user exists and belongs to tenant
    user_res = await db.execute(
        select(User).where(User.id == payload.user_id, User.tenant_id == user.tenant_id)
    )
    member_user = user_res.scalar_one_or_none()
    if not member_user:
        raise NotFoundError("User", payload.user_id)

    # Check if duplicate membership
    dup_res = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == payload.user_id)
    )
    if dup_res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User is already a member of this team.")

    new_member = TeamMember(
        team_id=team_id,
        user_id=payload.user_id,
        role_in_team=payload.role_in_team
    )
    db.add(new_member)
    await db.commit()
    
    # Reload with user relationship loaded
    final_res = await db.execute(
        select(TeamMember)
        .options(selectinload(TeamMember.user))
        .where(TeamMember.id == new_member.id)
    )
    return final_res.scalar_one()

@router.delete("/{team_id}/members/{user_id}", status_code=204)
async def remove_team_member(
    team_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_org_admin_or_hr(user)

    # Verify team exists and belongs to tenant
    team_res = await db.execute(
        select(Team).where(Team.id == team_id, Team.tenant_id == user.tenant_id)
    )
    if not team_res.scalar_one_or_none():
        raise NotFoundError("Team", team_id)

    # Fetch membership
    result = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise NotFoundError("Team membership for user", user_id)

    await db.delete(membership)
    await db.commit()
    return None
