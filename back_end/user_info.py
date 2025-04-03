from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
from database import SessionLocal
from models import Users
from auth import get_current_user
from pydantic import BaseModel

router = APIRouter(
    prefix='/user_info',
    tags=['user_info']
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

class UpdateUserInfo(BaseModel):
    username: str
    email: str
    phone_number: str

@router.get("/", status_code=status.HTTP_200_OK)
async def get_user_info(user: user_dependency, db: db_dependency):
    user_record = db.query(Users).filter(Users.username == user["username"]).first()

    if not user_record:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "username": user_record.username,
        "email": user_record.email,
        "phone_number": user_record.phone_number,
    }

@router.post("/", status_code=status.HTTP_200_OK)
async def update_user_info(
    user: user_dependency,
    db: db_dependency,
    user_update: UpdateUserInfo
):
    user_record = db.query(Users).filter(Users.username == user["username"]).first()

    if not user_record:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if email is changing and if it's already taken
    if user_update.email != user_record.email:
        existing_user = db.query(Users).filter(Users.email == user_update.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")

    # Apply updates
    user_record.username = user_update.username
    user_record.email = user_update.email
    user_record.phone_number = user_update.phone_number

    db.commit()
    db.refresh(user_record)

    return {
        "message": "User info updated successfully",
        "username": user_record.username,
        "email": user_record.email,
        "phone_number": user_record.phone_number,
    }
