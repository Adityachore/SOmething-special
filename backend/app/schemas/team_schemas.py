from pydantic import BaseModel
from datetime import datetime
from app.db.models.team import TeamType

class TeamMemberUserResponse(BaseModel):
    id: str
    name: str
    email: str
    model_config = {"from_attributes": True}

class TeamMemberCreate(BaseModel):
    user_id: str
    role_in_team: str = "MEMBER" # LEAD, MEMBER, EXTERNAL

class TeamMemberResponse(BaseModel):
    id: str
    team_id: str
    user_id: str
    role_in_team: str
    created_at: datetime
    user: TeamMemberUserResponse | None = None

    model_config = {"from_attributes": True}

class TeamCreate(BaseModel):
    name: str
    type: TeamType = TeamType.CUSTOM

class TeamUpdate(BaseModel):
    name: str | None = None
    type: TeamType | None = None
    status: str | None = None # ACTIVE, INACTIVE

class TeamResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    type: TeamType
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class TeamDetailResponse(TeamResponse):
    members: list[TeamMemberResponse] = []
