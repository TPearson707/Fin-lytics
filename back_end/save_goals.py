from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
from database import SessionLocal
from models import Save_Goals, Users
from pydantic import BaseModel
from datetime import date
from auth import get_current_user

router = APIRouter(
    prefix="/save_goals",
    tags=["save_goals"]
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
class CreateSaveGoalRequest(BaseModel):
    goal_name: str
    goal_amount: float
    goal_date: date

class UpdateSaveGoalRequest(BaseModel):
    goal_name: str
    goal_amount: float
    goal_date: date
    current_amount: float
    goal_status: str

# ==================== Routes ====================
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_save_goal(user: Annotated[dict, Depends(get_current_user)], 
                           db: db_dependency, 
                           save_goal_request: CreateSaveGoalRequest):
    """Create a new savings goal."""
    save_goal_model = Save_Goals(
        goal_name=save_goal_request.goal_name,
        goal_amount=save_goal_request.goal_amount,
        goal_date=save_goal_request.goal_date,
        user_id=user["id"]
    )
    db.add(save_goal_model)
    db.commit()
    return {"message": "Save goal created successfully"}

@router.put("/{goal_id}", status_code=status.HTTP_200_OK)
async def update_save_goal(user: Annotated[dict, Depends(get_current_user)], 
                           db: db_dependency, 
                           goal_id: int, 
                           update_save_goal_request: UpdateSaveGoalRequest):
    """Update an existing savings goal."""
    save_goal_model = db.query(Save_Goals).filter(Save_Goals.goal_id == goal_id, Save_Goals.user_id == user["id"]).first()
    if not save_goal_model:
        raise HTTPException(status_code=404, detail="Save goal not found")

    save_goal_model.goal_name = update_save_goal_request.goal_name
    save_goal_model.goal_amount = update_save_goal_request.goal_amount
    save_goal_model.goal_date = update_save_goal_request.goal_date
    save_goal_model.current_amount = update_save_goal_request.current_amount
    save_goal_model.goal_status = update_save_goal_request.goal_status

    db.commit()
    return {"message": "Save goal updated successfully"}

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_save_goal(user: Annotated[dict, Depends(get_current_user)], 
                           db: db_dependency, 
                           goal_id: int):
    """Delete an existing savings goal."""
    save_goal_model = db.query(Save_Goals).filter(Save_Goals.goal_id == goal_id, Save_Goals.user_id == user["id"]).first()
    if not save_goal_model:
        raise HTTPException(status_code=404, detail="Save goal not found")

    db.delete(save_goal_model)
    db.commit()
    return {"message": "Save goal deleted successfully"}

@router.get("/", status_code=status.HTTP_200_OK)
async def get_save_goals(user: Annotated[dict, Depends(get_current_user)], 
                         db: db_dependency):
    """Retrieve all savings goals."""
    save_goals = db.query(Save_Goals).filter(Save_Goals.user_id == user["id"]).all()
    return save_goals 



