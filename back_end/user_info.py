from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
from database import SessionLocal
from models import Users
from auth import get_current_user, hashPassword
from pydantic import BaseModel

router = APIRouter(
    prefix='/user_info',
    tags=['user_info']
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
class UpdateUserInfo(BaseModel):
    username: str
    first_name: str
    last_name: str
    email: str
    phone_number: str
    password: str

# ==================== Logic ====================

def get_user_info(user: dict, db: Session):
    user_record = db.query(Users).filter(Users.username == user["username"]).first()

    if not user_record:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "username": user_record.username,
        "first_name": user_record.first_name,
        "last_name": user_record.last_name,
        "email": user_record.email,
        "phone_number": user_record.phone_number,
    }

def update_user_info(user: dict, db: Session, user_update: UpdateUserInfo):
    user_record = db.query(Users).filter(Users.username == user["username"]).first()

    if not user_record:
        raise HTTPException(status_code=404, detail="User not found")

    if user_update.email != user_record.email:
        existing_user = db.query(Users).filter(Users.email == user_update.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")

    if user_update.phone_number != user_record.phone_number:
        existing_user = db.query(Users).filter(Users.phone_number == user_update.phone_number).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Phone number already in use")

    user_record.username = user_update.username
    user_record.first_name = user_update.first_name
    user_record.last_name = user_update.last_name
    user_record.email = user_update.email
    user_record.phone_number = user_update.phone_number
    user_record.hashed_password = hashPassword(user_update.password)
    
    db.commit()
    db.refresh(user_record)

    return {
        "message": "User info updated successfully",
        "username": user_record.username,
        "first_name": user_record.first_name,
        "last_name": user_record.last_name,
        "email": user_record.email,
        "phone_number": user_record.phone_number,
    }

# ==================== Routes ====================

@router.get("/", status_code=status.HTTP_200_OK)
async def get(user: user_dependency, db: db_dependency):
    return get_user_info(user, db)

@router.post("/", status_code=status.HTTP_200_OK)
async def update(user: user_dependency, db: db_dependency, user_update: UpdateUserInfo):
    return update_user_info(user, db, user_update)
