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

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:                # Try to get db
        yield db
    finally:
        db.close()      # Regardless of success, close db

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

# Pydantic model for updating settings
class SettingsUpdateRequest(BaseModel):
    email_notifications: bool
    sms_notifications: bool
    push_notifications: bool

# Retrieve user settings from the database
# If settings do not exist for the user, return 404 error
@router.get("/", status_code=status.HTTP_200_OK)
async def get_user_settings(user: user_dependency, db: db_dependency):
    settings = db.query(Settings).filter(Settings.user_id == user["id"]).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")

    return {
        "email_notifications": settings.email_notifications,
        "sms_notifications": settings.sms_notifications,
        "push_notifications": settings.push_notifications
    }

# Update user settings in the database
# If settings do not exist, create new settings for the user
@router.post("/", status_code=status.HTTP_200_OK)
async def update_user_settings(
    user: user_dependency, db: db_dependency, settings_update: SettingsUpdateRequest
):
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
    db.refresh(settings)  # Ensure the updated data is fetched

    return {
        "email_notifications": settings.email_notifications,
        "sms_notifications": settings.sms_notifications,
        "push_notifications": settings.push_notifications
    }

