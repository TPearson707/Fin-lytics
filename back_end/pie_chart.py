from fastapi import FastAPI, Depends, HTTPException, status, APIRouter
from pydantic import BaseModel

router = APIRouter(
    prefix='/pie_chart',
    tags=['pie_chart']
)

my_pi_chart = {
    "Travel": 12,
    "Food": 2,
    "Entertainment": 3,
    "Shopping": 4,
    "Utilities": 8,
    "Other": 16,
}

@router.get("/")
async def get_pie_chart_data_as_json():
    """
    Returns the pie chart data as a JSON string.
    """
    return my_pi_chart