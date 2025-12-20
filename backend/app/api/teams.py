"""Team collaboration API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.team import Team, TeamMember, TeamRole
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teams", tags=["teams"])


class TeamCreateRequest(BaseModel):
    """Request to create a team."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class TeamUpdateRequest(BaseModel):
    """Request to update a team."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    settings: Optional[dict] = None


class TeamMemberRequest(BaseModel):
    """Request to add/update team member."""
    user_id: str
    role: str = "member"
    permissions: Optional[dict] = None


class TeamResponse(BaseModel):
    """Team response schema."""
    id: str
    name: str
    description: Optional[str]
    settings: Optional[dict]
    created_at: datetime
    member_count: int
    current_user_role: Optional[str] = None


class TeamMemberResponse(BaseModel):
    """Team member response schema."""
    id: str
    user_id: str
    user_email: str
    role: str
    permissions: Optional[dict]
    is_active: bool
    joined_at: datetime


class TeamListResponse(BaseModel):
    """List of teams."""
    teams: List[TeamResponse]
    total: int


@router.get("", response_model=TeamListResponse)
async def list_teams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List teams the user is a member of."""
    try:
        # Get teams where user is a member
        memberships = db.query(TeamMember).filter(
            and_(
                TeamMember.user_id == current_user.id,
                TeamMember.is_active == True
            )
        ).all()
        
        teams = [membership.team for membership in memberships]
        
        # Get current user's role for each team
        team_responses = []
        for team in teams:
            membership = db.query(TeamMember).filter(
                and_(
                    TeamMember.team_id == team.id,
                    TeamMember.user_id == current_user.id
                )
            ).first()
            
            member_count = db.query(TeamMember).filter(
                and_(
                    TeamMember.team_id == team.id,
                    TeamMember.is_active == True
                )
            ).count()
            
            team_responses.append(TeamResponse(
                id=str(team.id),
                name=team.name,
                description=team.description,
                settings=team.settings,
                created_at=team.created_at,
                member_count=member_count,
                current_user_role=membership.role if membership else None
            ))
        
        return TeamListResponse(
            teams=team_responses,
            total=len(team_responses)
        )
    except Exception as e:
        logger.error(f"Error listing teams: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing teams: {str(e)}"
        )


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    request: TeamCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new team."""
    try:
        team = Team(
            id=uuid.uuid4(),
            name=request.name,
            description=request.description,
            created_by=current_user.id
        )
        
        db.add(team)
        db.commit()
        db.refresh(team)
        
        # Add creator as owner
        member = TeamMember(
            id=uuid.uuid4(),
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.OWNER.value,
            is_active=True,
            invited_by=current_user.id
        )
        db.add(member)
        db.commit()
        
        logger.info(f"Created team {team.id} by user {current_user.id}")
        
        return TeamResponse(
            id=str(team.id),
            name=team.name,
            description=team.description,
            settings=team.settings,
            created_at=team.created_at,
            member_count=1,
            current_user_role=TeamRole.OWNER.value
        )
    except Exception as e:
        logger.error(f"Error creating team: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating team: {str(e)}"
        )


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get team details."""
    # Check if user is a member
    membership = db.query(TeamMember).filter(
        and_(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id,
            TeamMember.is_active == True
        )
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found or you are not a member"
        )
    
    team = membership.team
    member_count = db.query(TeamMember).filter(
        and_(
            TeamMember.team_id == team.id,
            TeamMember.is_active == True
        )
    ).count()
    
    return TeamResponse(
        id=str(team.id),
        name=team.name,
        description=team.description,
        settings=team.settings,
        created_at=team.created_at,
        member_count=member_count,
        current_user_role=membership.role
    )


@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def list_team_members(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List team members."""
    # Check if user is a member
    membership = db.query(TeamMember).filter(
        and_(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id,
            TeamMember.is_active == True
        )
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found or you are not a member"
        )
    
    members = db.query(TeamMember).filter(
        and_(
            TeamMember.team_id == team_id,
            TeamMember.is_active == True
        )
    ).all()
    
    return [
        TeamMemberResponse(
            id=str(m.id),
            user_id=str(m.user_id),
            user_email=m.user.email,
            role=m.role,
            permissions=m.permissions,
            is_active=m.is_active,
            joined_at=m.joined_at
        )
        for m in members
    ]


@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_team_member(
    team_id: str,
    request: TeamMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a member to the team."""
    # Check if current user has permission (admin or owner)
    current_membership = db.query(TeamMember).filter(
        and_(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id,
            TeamMember.is_active == True
        )
    ).first()
    
    if not current_membership or current_membership.role not in [TeamRole.OWNER.value, TeamRole.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to add members"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if already a member
    existing = db.query(TeamMember).filter(
        and_(
            TeamMember.team_id == team_id,
            TeamMember.user_id == request.user_id
        )
    ).first()
    
    if existing:
        if existing.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member"
            )
        else:
            # Reactivate
            existing.is_active = True
            existing.role = request.role
            existing.permissions = request.permissions
            db.commit()
            db.refresh(existing)
            
            return TeamMemberResponse(
                id=str(existing.id),
                user_id=str(existing.user_id),
                user_email=user.email,
                role=existing.role,
                permissions=existing.permissions,
                is_active=existing.is_active,
                joined_at=existing.joined_at
            )
    
    # Create new membership
    member = TeamMember(
        id=uuid.uuid4(),
        team_id=team_id,
        user_id=request.user_id,
        role=request.role,
        permissions=request.permissions,
        is_active=True,
        invited_by=current_user.id
    )
    
    db.add(member)
    db.commit()
    db.refresh(member)
    
    return TeamMemberResponse(
        id=str(member.id),
        user_id=str(member.user_id),
        user_email=user.email,
        role=member.role,
        permissions=member.permissions,
        is_active=member.is_active,
        joined_at=member.joined_at
    )


