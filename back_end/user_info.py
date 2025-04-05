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

class UpdateUserInfo(BaseModel):
    """
    Schema for updating user information.
    """
    username: str
    first_name: str
    last_name: str
    email: str
    phone_number: str
    password: str

@router.get("/", status_code=status.HTTP_200_OK)
async def get_user_info(user: user_dependency, db: db_dependency):
    """
    Retrieves the information of the currently authenticated user.

    - **Returns:**
      - `username`: The user's username
      - `email`: The user's email
      - `phone_number`: The user's phone number
    """
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

@router.post("/", status_code=status.HTTP_200_OK)
async def update_user_info(
    user: user_dependency,
    db: db_dependency,
    user_update: UpdateUserInfo
):
    """
    Updates the currently authenticated user's information.

    - **Validations:**
      - Ensures the user exists
      - Checks if the new email is already in use before updating

    - **Updates:**
      - `username`
      - `email`
      - `phone_number`

    - **Returns:**
      - A success message along with the updated user details
    """
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

    # Apply updates
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
