from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
from database import SessionLocal
from models import User_Categories, Users
from pydantic import BaseModel

router = APIRouter(
    prefix='/user_categories',
    tags=['user_categories']
)

# ==================== Dependencies ====================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

# ==================== Schemas ====================
class UserCategoryCreate(BaseModel):
    name: str
    color: str
    weekly_limit: float | None = None

class UserCategoryUpdate(BaseModel):
    name: str
    color: str
    weekly_limit: float | None = None

# ==================== Logic ====================
def get_user_categories(user_id: int, db: Session):
    user = db.query(Users).filter(Users.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    categories = db.query(User_Categories).filter(User_Categories.user_id == user_id).all()
    return [
        {"id": cat.id, "name": cat.name, "color": cat.color, "weekly_limit": cat.weekly_limit}
        for cat in categories
    ]

def create_user_category(user_id: int, data: UserCategoryCreate, db: Session):
    user = db.query(Users).filter(Users.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(User_Categories).filter(
        User_Categories.user_id == user_id, User_Categories.name == data.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")

    new_category = User_Categories(
        user_id=user_id,
        name=data.name,
        color=data.color,
        weekly_limit=data.weekly_limit
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category

def update_user_category(category_id: int, data: UserCategoryUpdate, db: Session):
    category = db.query(User_Categories).filter(User_Categories.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    existing = db.query(User_Categories).filter(
        User_Categories.user_id == category.user_id, 
        User_Categories.name == data.name
    ).first()

    if existing and existing.id != category_id:
        raise HTTPException(status_code=400, detail="Category name already exists for the user")

    category.name = data.name
    category.color = data.color
    category.weekly_limit = data.weekly_limit

    db.commit()
    db.refresh(category)

    return {
        "message": "Category updated successfully",
        "id": category.id,
        "name": category.name,
        "color": category.color,
        "weekly_limit": category.weekly_limit
    }

def delete_user_category(category_id: int, db: Session):
    category = db.query(User_Categories).filter(User_Categories.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}

# ==================== Routes ====================
@router.get("/{user_id}", status_code=status.HTTP_200_OK)
async def get(user_id: int, db: db_dependency):
    return get_user_categories(user_id, db)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create(user_id: int, data: UserCategoryCreate, db: db_dependency):
    return create_user_category(user_id, data, db)

@router.put("/{category_id}", status_code=status.HTTP_200_OK)
async def update(category_id: int, data: UserCategoryUpdate, db: db_dependency):
    return update_user_category(category_id, data, db)

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(category_id: int, db: db_dependency):
    return delete_user_category(category_id, db)
