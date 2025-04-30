from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Settings
from auth import get_current_user
from pydantic import BaseModel
from polygon import RESTClient
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix='/stocks',
    tags=['stocks']
)


polygonapi = RESTClient("POLYGON_API_KEY") 


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class StockRequest(BaseModel):
    ticker: str

class StockCustomBars(BaseModel):
    tick: str
    multiplier: int
    timeframe: str
    From: str
    To: str
    adjusted: bool
    sort: str
    limit: int

# WebSocket endpoint for retrieving the last quote.
@router.websocket("/ws/getlastquote")
async def websocket_lastquote(websocket: WebSocket):

    await websocket.accept()
    try:

        while True:
            data = await websocket.receive_json()

            try:
                request = StockRequest(**data)
            except Exception as validation_error:
                await websocket.send_json({"error": "Invalid data format", "detail": str(validation_error)})
                continue


            try:
                quote = polygonapi.get_last_quote(request.ticker)

                await websocket.send_json(quote)
            except Exception as api_error:

                await websocket.send_json({"error": "Failed to fetch quote", "detail": str(api_error)})
    except WebSocketDisconnect:

        print("Client disconnected from /ws/getlastquote")


@router.websocket("/ws/getcustombars")
async def websocket_custombars(websocket: WebSocket):

    await websocket.accept()
    try:
        while True:

            data = await websocket.receive_json()

            try:
                request = StockCustomBars(**data)
            except Exception as validation_error:
                await websocket.send_json({"error": "Invalid data format", "detail": str(validation_error)})
                continue

            try:
                custombars = polygonapi.list_aggs(
                    request.tick,
                    request.multiplier,
                    request.timeframe,
                    request.From,
                    request.To,
                    request.adjusted,
                    request.sort,
                    request.limit
                )
                await websocket.send_json(custombars)
            except Exception as api_error:
                await websocket.send_json({"error": "Failed to fetch custom bars", "detail": str(api_error)})
    except WebSocketDisconnect:
        print("Client disconnected from /ws/getcustombars")







