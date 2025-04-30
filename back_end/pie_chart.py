from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Annotated

from database import SessionLocal
from models import User_Categories, Transaction_Category_Link
from auth import get_current_user

router = APIRouter(
    prefix='/pie_chart',
    tags=['pie_chart']
)

# In-memory cache (you can upgrade this to Redis or DB later)
my_pie_chart = {}

# FastAPI dependency aliases
db_dependency = Annotated[Session, Depends(SessionLocal)]
user_dependency = Annotated[dict, Depends(get_current_user)]

@router.get("/", status_code=status.HTTP_200_OK)
async def get_pie_chart_data_as_json():
    """
    Returns the latest pie chart data.
    """
    return my_pie_chart


@router.put("/", status_code=status.HTTP_200_OK)
async def refresh_pie_chart_data(
    user: user_dependency,
    db: db_dependency
):
    """
    Recalculates the pie chart data for the authenticated user.
    """
    update_pie_chart_data(user, db)
    return {"message": "Pie chart updated successfully."}


def update_pie_chart_data(db: db_dependency):
    """
    Recalculates total amounts per category for user ID 46.
    """

    # Hardcoded user ID
    user_id = 46

    categories = db.query(User_Categories).filter(User_Categories.user_id == user_id).all()

    for category in categories:
        total_amount = db.query(func.coalesce(func.sum(Transaction_Category_Link.amount), 0.0)).filter(
            Transaction_Category_Link.category_id == category.id
        ).scalar()

        my_pie_chart[category.name] = float(total_amount)

