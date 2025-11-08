from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Settings, Stock_Prediction, Users
from auth import get_current_user
from pydantic import BaseModel
import requests
from dotenv import load_dotenv
from stock_prediction_service import prediction_service
from eod_updater import eod_updater
from typing import List, Optional
from datetime import datetime, timedelta
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading
import logging

from stock_cache_service import fetch_symbol_from_fmp, fetch_company_snapshot, normalize_ticker_symbol

logger = logging.getLogger(__name__)

# Thread pool executor for CPU-intensive operations
executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="stock_predictions")


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


def check_subscription(
    user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Dependency to check if user has active subscription"""
    user_model = db.query(Users).filter(Users.id == user["id"]).first()
    if not user_model:
        raise HTTPException(status_code=404, detail="User not found")
    if user_model.subscription_status != "active":
        raise HTTPException(
            status_code=403,
            detail="Active subscription required to access stock predictions"
        )
    return True


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
                # Run blocking request in thread executor to avoid freezing event loop
                url = f"{fmp_base_url}/quote/{request.ticker}"
                params = {'apikey': fmp_api_key}
                
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    executor,
                    lambda: requests.get(url, params=params, timeout=10)
                )
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
                # Run blocking request in thread executor to avoid freezing event loop
                url = f"{fmp_base_url}/historical-chart/{fmp_timeframe}/{request.tick}"
                params = {
                    'from': request.From,
                    'to': request.To,
                    'apikey': fmp_api_key
                }
                
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    executor,
                    lambda: requests.get(url, params=params, timeout=30)
                )
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
    _: bool = Depends(check_subscription)
):
    """Generate immediate predictions for specified tickers (not saved to DB)"""
    try:
        # Run predictions in thread executor to avoid blocking
        loop = asyncio.get_event_loop()
        results = []
        
        async def make_prediction_async(ticker: str):
            return await loop.run_in_executor(
                executor,
                prediction_service.make_prediction,
                ticker
            )
        
        # Process all tickers concurrently
        prediction_tasks = [make_prediction_async(ticker) for ticker in request.tickers]
        prediction_data_list = await asyncio.gather(*prediction_tasks, return_exceptions=True)
        
        for i, prediction_data in enumerate(prediction_data_list):
            ticker = request.tickers[i]
            if isinstance(prediction_data, Exception):
                results.append({"ticker": ticker, "error": f"Failed to generate prediction: {str(prediction_data)}"})
            elif prediction_data:
                results.append(prediction_data)
            else:
                results.append({"ticker": ticker, "error": "Failed to generate prediction"})
        
        return {"predictions": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate predictions: {str(e)}")

@router.post("/predictions/generate-intervals")
async def generate_interval_predictions(
    request: PredictionRequest,
    _: bool = Depends(check_subscription)
):
    """Generate multi-interval predictions (for Stock Insights)."""
    try:
        # Run predictions in thread executor to avoid blocking
        loop = asyncio.get_event_loop()
        results = []
        
        async def make_interval_predictions_async(ticker: str):
            return await loop.run_in_executor(
                executor,
                prediction_service.make_interval_predictions,
                ticker
            )
        
        # Process all tickers concurrently
        prediction_tasks = [make_interval_predictions_async(ticker) for ticker in request.tickers]
        prediction_data_list = await asyncio.gather(*prediction_tasks, return_exceptions=True)
        
        for i, preds in enumerate(prediction_data_list):
            ticker = request.tickers[i]
            if isinstance(preds, Exception):
                results.append({
                    "ticker": ticker,
                    "interval": "N/A",
                    "predicted_price": None,
                    "change": None,
                    "error": f"Failed to generate prediction: {str(preds)}"
                })
            elif preds:
                results.extend(preds)
            else:
                results.append({
                    "ticker": ticker,
                    "interval": "N/A",
                    "predicted_price": None,
                    "change": None,
                    "error": "Failed to generate prediction"
                })
        
        if not results:
            raise HTTPException(status_code=404, detail="No predictions generated")
        return {"predictions": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate interval predictions: {str(e)}")

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

@router.get("/gainers")
async def fetch_gainers():
    """
    Fetch top 5 gainers.
    Prioritizes high-value stocks (price >= $80),
    then mid-tier (20–79), then fallback (<20),
    always avoiding ETFs and forex/pair symbols.
    """
    try:
        url = f"{fmp_base_url}/stock_market/gainers"
        params = {"apikey": fmp_api_key}
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        def clean_entry(s):
            try:
                price = float(s.get("price", 0))
                change = float(s.get("change", 0))
                pct = float(str(s.get("changesPercentage", "0")).replace("%", "").replace("+", ""))
                name = s.get("name") or s.get("symbol")
                symbol = s.get("symbol", "").upper()

                # Filter early for obvious junk
                if not symbol or "ETF" in (name or "") or any(x in symbol for x in ["/", "="]):
                    return None

                return {
                    "symbol": symbol,
                    "name": name,
                    "price": round(price, 2),
                    "change": round(change, 2),
                    "changesPercentage": round(pct, 2),
                }
            except (TypeError, ValueError):
                return None

        cleaned = [e for s in data if (e := clean_entry(s))]

        # Split into tiers
        high = [e for e in cleaned if e["price"] >= 80]
        mid = [e for e in cleaned if 20 <= e["price"] < 80]
        low = [e for e in cleaned if e["price"] < 20]

        # Sort gainers descending by percentage change
        high.sort(key=lambda x: x["changesPercentage"], reverse=True)
        mid.sort(key=lambda x: x["changesPercentage"], reverse=True)
        low.sort(key=lambda x: x["changesPercentage"], reverse=True)

        # Combine tiers to always get 5 results
        combined = (high + mid + low)[:5]

        return combined

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch gainers: {str(e)}")


@router.get("/losers")
async def fetch_losers():
    """
    Fetch top 5 losers.
    Prioritizes high-value stocks (price >= $80),
    then mid-tier (20–79), then fallback (<20),
    always avoiding ETFs and forex/pair symbols.
    """
    try:
        url = f"{fmp_base_url}/stock_market/losers"
        params = {"apikey": fmp_api_key}
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        def clean_entry(s):
            try:
                price = float(s.get("price", 0))
                change = float(s.get("change", 0))
                pct = float(str(s.get("changesPercentage", "0")).replace("%", "").replace("+", ""))
                name = s.get("name") or s.get("symbol")
                symbol = s.get("symbol", "").upper()

                if not symbol or "ETF" in (name or "") or any(x in symbol for x in ["/", "="]):
                    return None

                return {
                    "symbol": symbol,
                    "name": name,
                    "price": round(price, 2),
                    "change": round(change, 2),
                    "changesPercentage": round(pct, 2),
                }
            except (TypeError, ValueError):
                return None

        cleaned = [e for s in data if (e := clean_entry(s))]

        # Split into tiers
        high = [e for e in cleaned if e["price"] >= 80]
        mid = [e for e in cleaned if 20 <= e["price"] < 80]
        low = [e for e in cleaned if e["price"] < 20]

        # Sort losers ascending by percentage change
        high.sort(key=lambda x: x["changesPercentage"])
        mid.sort(key=lambda x: x["changesPercentage"])
        low.sort(key=lambda x: x["changesPercentage"])

        combined = (high + mid + low)[:5]

        return combined

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch losers: {str(e)}")
    
@router.get("/company/{ticker}")
async def get_company_snapshot(ticker: str):
    """Return cached or fresh company profile."""
    clean_ticker = normalize_ticker_symbol(ticker)
    data = fetch_company_snapshot(clean_ticker)
    return data

@router.get("/news/{ticker}")
async def get_company_news(ticker: str):
    """
    Fetch recent market news articles for a specific ticker.
    Returns up to 5 latest stories from FMP.
    Each entry: {title, publishedDate, site, url, image}
    """
    try:
        url = f"{fmp_base_url}/stock_news"
        params = {"tickers": ticker.upper(), "limit": 5, "apikey": fmp_api_key}
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if not data or not isinstance(data, list) or len(data) == 0:
            raise HTTPException(status_code=404, detail=f"No news found for {ticker}")

        cleaned = []
        for n in data:
            cleaned.append({
                "title": n.get("title", ""),
                "publishedDate": n.get("publishedDate", ""),
                "site": n.get("site", ""),
                "url": n.get("url", ""),
                "image": n.get("image", "")
            })

        return cleaned[:5]

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")


@router.get("/symbol/{ticker}")
async def get_symbol_with_exchange(ticker: str):
    """Return TradingView-ready symbol with exchange prefix (cached)."""
    exchange = fetch_symbol_from_fmp(ticker)
    tv_ticker = normalize_ticker_symbol(ticker, for_tradingview=True)
    return {"symbol": f"{exchange}:{tv_ticker}"}


@router.get("/search")
async def search_stocks(query: str, limit: int = 10):
    """
    Search for stocks by symbol or company name.
    Returns list of matching stocks with symbol, name, and exchange.
    Matches the frontend SearchBar functionality.
    """
    try:
        if not query or len(query) < 2:
            return []
        
        if not fmp_api_key:
            raise HTTPException(
                status_code=500,
                detail="FMP API key not configured"
            )
        
        url = f"{fmp_base_url}/search"
        params = {
            'query': query,
            'limit': limit,
            'apikey': fmp_api_key
        }
        
        # Run in thread executor to avoid blocking
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            executor,
            lambda: requests.get(url, params=params, timeout=10)
        )
        response.raise_for_status()
        data = response.json()
        
        # Handle error responses from FMP API
        if not isinstance(data, list):
            if isinstance(data, dict) and (data.get('error') or data.get('message')):
                error_msg = data.get('error') or data.get('message')
                logger.error(f"FMP API error: {error_msg}")
                return []
            return []
        
        # Format results to match frontend expectations
        results = []
        for item in data:
            if item and item.get('symbol'):
                results.append({
                    "symbol": item.get("symbol", ""),
                    "name": item.get("name", ""),
                    "exchange": item.get("exchangeShortName", "")
                })
        
        return results
    
    except requests.exceptions.RequestException as e:
        logger.error(f"FMP search API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search stocks: {str(e)}")
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search stocks: {str(e)}")





# ---------------- EOD data updater endpoints ----------------

class EODUpdateRequest(BaseModel):
    tickers: List[str]

@router.post("/eod/update")
async def trigger_eod_update(
    request: EODUpdateRequest,
    user: dict = Depends(get_current_user)
):
    """Trigger EOD update in background thread"""
    try:
        # Run EOD update in background thread to avoid blocking
        def run_update():
            try:
                eod_updater.run_once(request.tickers)
            except Exception as e:
                # Log error but don't raise - this runs in background
                logger.error(f"EOD update error: {e}")
        
        thread = threading.Thread(target=run_update, daemon=True)
        thread.start()
        return {"status": "ok", "message": "EOD update started in background"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start EOD update: {str(e)}")

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
    """Update all stocks from the ticker list at once (runs in background)"""
    try:
        # Run update in background thread to avoid blocking
        def run_update_all():
            try:
                eod_updater.update_all_stocks()
            except Exception as e:
                # Log error but don't raise - this runs in background
                logger.error(f"EOD update-all error: {e}")
        
        thread = threading.Thread(target=run_update_all, daemon=True)
        thread.start()
        return {
            "status": "ok", 
            "message": f"Update initiated for all {len(eod_updater.tickers)} stocks",
            "ticker_count": len(eod_updater.tickers),
            "note": "This will update both 5-minute and 15-minute data for all stocks in the ticker list. Update is running in background."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start update: {str(e)}")


