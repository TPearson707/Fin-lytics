from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
from database import SessionLocal
from models import Settings
from auth import get_current_user
from pydantic import BaseModel

router = APIRouter(
    prefix='/user_settings',
    tags=['user_settings']
)

# ==================== Dependencies ====================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

# ==================== Schemas ====================

class SettingsUpdateRequest(BaseModel):
    email_notifications: bool
    sms_notifications: bool
    push_notifications: bool

# ==================== Logic ====================

def get_user_settings_logic(user: dict, db: Session):
    settings = db.query(Settings).filter(Settings.user_id == user["id"]).first()

    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")

    return {
        "email_notifications": settings.email_notifications,
        "sms_notifications": settings.sms_notifications,
        "push_notifications": settings.push_notifications
    }

def update_user_settings_logic(user: dict, db: Session, settings_update: SettingsUpdateRequest):
    settings = db.query(Settings).filter(Settings.user_id == user["id"]).first()

    if not settings:
        settings = Settings(
            user_id=user["id"],
            email_notifications=settings_update.email_notifications,
            sms_notifications=settings_update.sms_notifications,
            push_notifications=settings_update.push_notifications,
        )
        db.add(settings)
    else:
        settings.email_notifications = settings_update.email_notifications
        settings.sms_notifications = settings_update.sms_notifications
        settings.push_notifications = settings_update.push_notifications

    db.commit()
    db.refresh(settings)

    return {
        "email_notifications": settings.email_notifications,
        "sms_notifications": settings.sms_notifications,
        "push_notifications": settings.push_notifications
    }

# ==================== Routes ====================

@router.get("/", status_code=status.HTTP_200_OK)
async def get(user: user_dependency, db: db_dependency):
    return get_user_settings_logic(user, db)

@router.post("/", status_code=status.HTTP_200_OK)
async def update(user: user_dependency, db: db_dependency, settings_update: SettingsUpdateRequest):
    return update_user_settings_logic(user, db, settings_update)
