from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Settings, Stock_Prediction
from auth import get_current_user
from pydantic import BaseModel
import requests
from dotenv import load_dotenv
from stock_prediction_service import prediction_service
from eod_updater import eod_updater
from typing import List, Optional
from datetime import datetime, timedelta
import os

load_dotenv()

router = APIRouter(
    prefix='/stocks',
    tags=['stocks']
)


# FMP API configuration
fmp_api_key = os.getenv("FMP_API_KEY")
fmp_base_url = "https://financialmodelingprep.com/api/v3" 


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

class PredictionResponse(BaseModel):
    id: int
    ticker: str
    predicted_price: float
    confidence_low: Optional[float]
    confidence_high: Optional[float]
    prediction_time: datetime
    horizon_minutes: int
    model_version: str

class PredictionRequest(BaseModel):
    tickers: List[str]

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
                # FMP API endpoint for real-time quote
                url = f"{fmp_base_url}/quote/{request.ticker}"
                params = {'apikey': fmp_api_key}
                
                response = requests.get(url, params=params)
                response.raise_for_status()
                
                quote_data = response.json()
                if quote_data:
                    quote = quote_data[0]  # FMP returns array, get first item
                else:
                    quote = {"error": "No quote data available"}

                await websocket.send_json(quote)
            except requests.exceptions.RequestException as api_error:
                await websocket.send_json({"error": "Failed to fetch quote", "detail": str(api_error)})
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
                # FMP API endpoint for historical data
                # Map timeframe to FMP format
                timeframe_map = {
                    "minute": "1min",
                    "hour": "1hour", 
                    "day": "1day"
                }
                
                fmp_timeframe = timeframe_map.get(request.timeframe, "1min")
                
                # FMP API endpoint for historical chart data
                url = f"{fmp_base_url}/historical-chart/{fmp_timeframe}/{request.tick}"
                params = {
                    'from': request.From,
                    'to': request.To,
                    'apikey': fmp_api_key
                }
                
                response = requests.get(url, params=params)
                response.raise_for_status()
                
                custombars = response.json()
                await websocket.send_json(custombars)
            except requests.exceptions.RequestException as api_error:
                await websocket.send_json({"error": "Failed to fetch custom bars", "detail": str(api_error)})
            except Exception as api_error:
                await websocket.send_json({"error": "Failed to fetch custom bars", "detail": str(api_error)})
    except WebSocketDisconnect:
        print("Client disconnected from /ws/getcustombars")


# Prediction endpoints
@router.get("/predictions/latest", response_model=List[PredictionResponse])
async def get_latest_predictions(
    ticker: Optional[str] = None,
    limit: int = 10,
    user: dict = Depends(get_current_user)
):
    """Get the latest stock predictions"""
    try:
        predictions = prediction_service.get_latest_predictions(ticker, limit)
        return predictions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get predictions: {str(e)}")

@router.get("/predictions/{ticker}/latest", response_model=PredictionResponse)
async def get_latest_prediction_for_ticker(
    ticker: str,
    user: dict = Depends(get_current_user)
):
    """Get the latest prediction for a specific ticker"""
    try:
        predictions = prediction_service.get_latest_predictions(ticker, 1)
        if not predictions:
            raise HTTPException(status_code=404, detail=f"No predictions found for {ticker}")
        return predictions[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prediction: {str(e)}")

@router.post("/predictions/start")
async def start_prediction_service(
    request: PredictionRequest,
    user: dict = Depends(get_current_user)
):
    """Start the prediction service for specified tickers"""
    try:
        prediction_service.start_predictions(request.tickers)
        return {"message": f"Prediction service started for tickers: {request.tickers}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start prediction service: {str(e)}")

@router.post("/predictions/stop")
async def stop_prediction_service(user: dict = Depends(get_current_user)):
    """Stop the prediction service"""
    try:
        prediction_service.stop_predictions()
        return {"message": "Prediction service stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop prediction service: {str(e)}")

@router.get("/predictions/status")
async def get_prediction_service_status(user: dict = Depends(get_current_user)):
    """Get the status of the prediction service"""
    return {
        "is_running": prediction_service.is_running,
        "model_loaded": prediction_service.predictor is not None
    }

@router.post("/predictions/generate")
async def generate_immediate_prediction(
    request: PredictionRequest,
    user: dict = Depends(get_current_user)
):
    """Generate immediate predictions for specified tickers (not saved to DB)"""
    try:
        results = []
        for ticker in request.tickers:
            prediction_data = prediction_service.make_prediction(ticker)
            if prediction_data:
                results.append(prediction_data)
            else:
                results.append({"ticker": ticker, "error": "Failed to generate prediction"})
        
        return {"predictions": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate predictions: {str(e)}")

@router.get("/predictions/history/{ticker}")
async def get_prediction_history(
    ticker: str,
    hours_back: int = 24,
    user: dict = Depends(get_current_user)
):
    """Get prediction history for a ticker within the last N hours"""
    try:
        db = SessionLocal()
        try:
            # Calculate time threshold
            time_threshold = datetime.utcnow() - timedelta(hours=hours_back)
            
            predictions = db.query(Stock_Prediction).filter(
                Stock_Prediction.ticker == ticker,
                Stock_Prediction.prediction_time >= time_threshold
            ).order_by(Stock_Prediction.prediction_time.desc()).all()
            
            return [
                {
                    "id": pred.id,
                    "ticker": pred.ticker,
                    "predicted_price": pred.predicted_price,
                    "confidence_low": pred.confidence_low,
                    "confidence_high": pred.confidence_high,
                    "prediction_time": pred.prediction_time,
                    "horizon_minutes": pred.horizon_minutes,
                    "model_version": pred.model_version
                }
                for pred in predictions
            ]
        finally:
            db.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prediction history: {str(e)}")



# ---------------- EOD data updater endpoints ----------------

class EODUpdateRequest(BaseModel):
    tickers: List[str]

@router.post("/eod/update")
async def trigger_eod_update(
    request: EODUpdateRequest,
    user: dict = Depends(get_current_user)
):
    try:
        eod_updater.run_once(request.tickers)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run EOD update: {str(e)}")

@router.post("/eod/start")
async def start_eod_service(
    request: EODUpdateRequest,
    user: dict = Depends(get_current_user)
):
    try:
        eod_updater.start(request.tickers)
        return {"status": "started", "tickers": request.tickers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start EOD service: {str(e)}")

@router.post("/eod/stop")
async def stop_eod_service(
    user: dict = Depends(get_current_user)
):
    try:
        eod_updater.stop()
        return {"status": "stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop EOD service: {str(e)}")

@router.get("/eod/status")
async def eod_status(
    user: dict = Depends(get_current_user)
):
    try:
        return eod_updater.status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve EOD status: {str(e)}")

@router.post("/eod/update-all")
async def update_all_stocks(
    user: dict = Depends(get_current_user)
):
    """Update all stocks from the ticker list at once"""
    try:
        eod_updater.update_all_stocks()
        return {
            "status": "ok", 
            "message": f"Update initiated for all {len(eod_updater.tickers)} stocks",
            "ticker_count": len(eod_updater.tickers),
            "note": "This will update both 5-minute and 15-minute data for all stocks in the ticker list"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update all stocks: {str(e)}")


