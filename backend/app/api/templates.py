"""Message template API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.template import MessageTemplate, TemplateType, TemplateCategory
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/templates", tags=["templates"])


class TemplateCreateRequest(BaseModel):
    """Request to create a template."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    type: str = Field(default="sms")
    category: Optional[str] = None
    subject: Optional[str] = None
    body: str = Field(..., min_length=1)
    variables: Optional[List[str]] = None
    is_public: bool = False


class TemplateUpdateRequest(BaseModel):
    """Request to update a template."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = Field(None, min_length=1)
    variables: Optional[List[str]] = None
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None


class TemplateResponse(BaseModel):
    """Template response schema."""
    id: str
    name: str
    description: Optional[str]
    type: str
    category: Optional[str]
    subject: Optional[str]
    body: str
    variables: Optional[List[str]]
    usage_count: int
    success_rate: Optional[int]
    is_public: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: Optional[str]


class TemplateListResponse(BaseModel):
    """List of templates."""
    templates: List[TemplateResponse]
    total: int


@router.get("", response_model=TemplateListResponse)
async def list_templates(
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    include_public: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List message templates."""
    try:
        # Get user's templates and public templates
        query = db.query(MessageTemplate).filter(
            or_(
                MessageTemplate.user_id == current_user.id,
                and_(
                    MessageTemplate.is_public == True,
                    MessageTemplate.is_active == True
                ) if include_public else False
            )
        )
        
        if category:
            query = query.filter(MessageTemplate.category == category)
        if type:
            query = query.filter(MessageTemplate.type == type)
        if is_active is not None:
            query = query.filter(MessageTemplate.is_active == is_active)
        
        templates = query.order_by(desc(MessageTemplate.created_at)).all()
        
        return TemplateListResponse(
            templates=[
                TemplateResponse(
                    id=str(t.id),
                    name=t.name,
                    description=t.description,
                    type=t.type,
                    category=t.category,
                    subject=t.subject,
                    body=t.body,
                    variables=t.variables,
                    usage_count=t.usage_count,
                    success_rate=t.success_rate,
                    is_public=t.is_public,
                    is_active=t.is_active,
                    created_at=t.created_at,
                    updated_at=t.updated_at,
                    created_by=str(t.created_by) if t.created_by else None
                )
                for t in templates
            ],
            total=len(templates)
        )
    except Exception as e:
        logger.error(f"Error listing templates: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing templates: {str(e)}"
        )


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    request: TemplateCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new message template."""
    try:
        template = MessageTemplate(
            id=uuid.uuid4(),
            user_id=current_user.id,
            name=request.name,
            description=request.description,
            type=request.type,
            category=request.category,
            subject=request.subject,
            body=request.body,
            variables=request.variables or [],
            is_public=request.is_public,
            is_active=True,
            created_by=current_user.id
        )
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        logger.info(f"Created template {template.id} for user {current_user.id}")
        
        return TemplateResponse(
            id=str(template.id),
            name=template.name,
            description=template.description,
            type=template.type,
            category=template.category,
            subject=template.subject,
            body=template.body,
            variables=template.variables,
            usage_count=template.usage_count,
            success_rate=template.success_rate,
            is_public=template.is_public,
            is_active=template.is_active,
            created_at=template.created_at,
            updated_at=template.updated_at,
            created_by=str(template.created_by) if template.created_by else None
        )
    except Exception as e:
        logger.error(f"Error creating template: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating template: {str(e)}"
        )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific template."""
    template = db.query(MessageTemplate).filter(
        MessageTemplate.id == template_id,
        or_(
            MessageTemplate.user_id == current_user.id,
            and_(
                MessageTemplate.is_public == True,
                MessageTemplate.is_active == True
            )
        )
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        description=template.description,
        type=template.type,
        category=template.category,
        subject=template.subject,
        body=template.body,
        variables=template.variables,
        usage_count=template.usage_count,
        success_rate=template.success_rate,
        is_public=template.is_public,
        is_active=template.is_active,
        created_at=template.created_at,
        updated_at=template.updated_at,
        created_by=str(template.created_by) if template.created_by else None
    )


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    request: TemplateUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a template."""
    template = db.query(MessageTemplate).filter(
        MessageTemplate.id == template_id,
        MessageTemplate.user_id == current_user.id
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Update fields
    if request.name is not None:
        template.name = request.name
    if request.description is not None:
        template.description = request.description
    if request.type is not None:
        template.type = request.type
    if request.category is not None:
        template.category = request.category
    if request.subject is not None:
        template.subject = request.subject
    if request.body is not None:
        template.body = request.body
    if request.variables is not None:
        template.variables = request.variables
    if request.is_public is not None:
        template.is_public = request.is_public
    if request.is_active is not None:
        template.is_active = request.is_active
    
    db.commit()
    db.refresh(template)
    
    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        description=template.description,
        type=template.type,
        category=template.category,
        subject=template.subject,
        body=template.body,
        variables=template.variables,
        usage_count=template.usage_count,
        success_rate=template.success_rate,
        is_public=template.is_public,
        is_active=template.is_active,
        created_at=template.created_at,
        updated_at=template.updated_at,
        created_by=str(template.created_by) if template.created_by else None
    )


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a template."""
    template = db.query(MessageTemplate).filter(
        MessageTemplate.id == template_id,
        MessageTemplate.user_id == current_user.id
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    db.delete(template)
    db.commit()
    
    return {"success": True}


