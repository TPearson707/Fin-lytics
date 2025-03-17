from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
from database import SessionLocal
from models import Settings
from auth import get_current_user
from pydantic import BaseModel
from polygon import RESTClient
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix='/stocks',
    tags=['stocks']
)
polygonapi = RESTClient("POLYGON_API_KEY")#polygon api key goes here


# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:                # Try to get db
        yield db
    finally:
        db.close()      # Regardless of success, close db


# 
# 
#model for get last quote
class Stockrequest(BaseModel):
    ticker: str


@router.get("/getlastquote", status_code=status.HTTP_200_OK)
async def get_lastquote(data: Stockrequest):
    try:
        quote = polygonapi.get_last_quote(data.ticker)
        return quote
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



class Stockcustombars(BaseModel):
    tick: str
    multiplier: int
    timeframe: str
    From: str
    To: str
    adjusted: bool
    sort: str
    limit: int


@router.get("/getCustomBars", status_code=status.HTTP_200_OK)
async def get_CustomBars(data: Stockcustombars):
    try:
        custombars = polygonapi.list_aggs(
            data.tick,
            data.multiplier,
            data.timeframe,
            data.From,
            data.To,
            data.adjusted,
            data.sort,
            data.limit
        )

        return custombars
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




