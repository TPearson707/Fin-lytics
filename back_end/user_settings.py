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

# Database session dependency
def get_db():
    """
    Creates a new database session for the request and ensures it is closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

class SettingsUpdateRequest(BaseModel):
    """
    Schema for updating user settings.
    """
    email_notifications: bool
    sms_notifications: bool
    push_notifications: bool

@router.get("/", status_code=status.HTTP_200_OK)
async def get_user_settings(user: user_dependency, db: db_dependency):
    """
    Retrieves the notification settings for the currently authenticated user.

    - **Returns:**
      - `email_notifications`: Whether email notifications are enabled
      - `sms_notifications`: Whether SMS notifications are enabled
      - `push_notifications`: Whether push notifications are enabled
    """
    settings = db.query(Settings).filter(Settings.user_id == user["id"]).first()

    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")

    return {
        "email_notifications": settings.email_notifications,
        "sms_notifications": settings.sms_notifications,
        "push_notifications": settings.push_notifications
    }

@router.post("/", status_code=status.HTTP_200_OK)
async def update_user_settings(
    user: user_dependency, db: db_dependency, settings_update: SettingsUpdateRequest
):
    """
    Updates the notification settings for the currently authenticated user.

    - **Validations:**
      - If no existing settings are found, a new settings entry is created.

    - **Updates:**
      - `email_notifications`
      - `sms_notifications`
      - `push_notifications`

    - **Returns:**
      - The updated user settings.
    """
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
    db.refresh(settings)  # ensure the updated data is fetched

    return {
        "email_notifications": settings.email_notifications,
        "sms_notifications": settings.sms_notifications,
        "push_notifications": settings.push_notifications
    }
