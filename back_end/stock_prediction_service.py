import os
import pandas as pd
import asyncio
import logging
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from autogluon.timeseries import TimeSeriesDataFrame, TimeSeriesPredictor
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Stock_Prediction
import threading
import time
import random

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StockPredictionService:
    def __init__(self):
        self.predictor = None
        self.fmp_api_key = os.getenv("FMP_API_KEY")
        self.fmp_base_url = "https://financialmodelingprep.com/api/v3"
        self.model_path = os.path.join(os.path.dirname(__file__), "..", "AI_model", "AutoGluonModels_multi")
        self.is_running = False
        self.prediction_thread = None
        
    def load_model(self):
        """Load the trained Chronos model"""
        try:
            if not os.path.exists(self.model_path):
                logger.error(f"Model path not found: {self.model_path}")
                return False
                
            self.predictor = TimeSeriesPredictor.load(self.model_path, require_version_match=False)
            logger.info("Chronos model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False
    
    def fetch_stock_data(self, ticker: str, days_back: int = 730) -> Optional[pd.DataFrame]:
        """Fetch historical stock data from FMP API"""
        try:
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days_back)
            
            # Format dates for FMP API
            from_date = start_date.strftime("%Y-%m-%d")
            to_date = end_date.strftime("%Y-%m-%d")
            
            # FMP API endpoint for intraday data (5-minute intervals)
            url = f"{self.fmp_base_url}/historical-chart/5min/{ticker}"
            params = {
                'from': from_date,
                'to': to_date,
                'apikey': self.fmp_api_key
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            if not data:
                logger.warning(f"No data received for {ticker}")
                return None
            
            # Convert to DataFrame
            df = pd.DataFrame(data)
            
            # Rename columns to match expected format
            df = df.rename(columns={
                'date': 'datetime',
                'open': 'open',
                'high': 'high', 
                'low': 'low',
                'close': 'close',
                'volume': 'volume'
            })
            
            # Convert datetime column
            df['datetime'] = pd.to_datetime(df['datetime'])
            df = df.sort_values('datetime')
            
            # Regularize to 5-minute intervals
            df = self._regularize_data(df, ticker)
            
            logger.info(f"Fetched {len(df)} records for {ticker}")
            return df
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed for {ticker}: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to fetch data for {ticker}: {e}")
            return None
    
    def _regularize_data(self, df: pd.DataFrame, ticker: str) -> pd.DataFrame:
        """Regularize data to 5-minute intervals """
        FMT = "%Y-%m-%d %H:%M:%S"
        FREQ = "5min"
        
        # Ensure datetime column is properly formatted
        df['datetime'] = pd.to_datetime(df['datetime'])
        df = df.sort_values('datetime')
        
        # Create full 5-minute index
        full_idx = pd.date_range(df['datetime'].min(), df['datetime'].max(), freq=FREQ)
        
        # Reindex OHLCV data
        prices = (
            df.set_index('datetime')[['open', 'high', 'low', 'close', 'volume']]
            .astype('float32')
            .reindex(full_idx)
        )
        
        # Day-scoped forward fill (no overnight leakage)
        prices = prices.groupby(prices.index.normalize()).ffill()
        
        # Convert to AutoGluon format
        out = pd.DataFrame({
            'item_id': ticker,
            'timestamp': prices.index,
            'target': prices['close'].values,
            'open': prices['open'].values,
            'high': prices['high'].values,
            'low': prices['low'].values,
            'volume': prices['volume'].values,
        })
        
        return out
    
    def make_prediction(self, ticker: str) -> Optional[Dict]:
        """Make prediction for a given ticker"""
        try:
            if not self.predictor:
                logger.error("Model not loaded")
                return None
            
            # Fetch recent data
            df = self.fetch_stock_data(ticker)
            if df is None or len(df) < 365:  # Need sufficient history
                logger.warning(f"Insufficient data for {ticker}")
                return None
            
            # Convert to TimeSeriesDataFrame
            ts_data = TimeSeriesDataFrame.from_data_frame(
                df, id_column="item_id", timestamp_column="timestamp"
            )
            
            # Make prediction
            predictions = self.predictor.predict(ts_data)
            
            # Convert to pandas for easier handling
            try:
                pred_df = predictions.to_pandas().reset_index()
            except AttributeError:
                pred_df = predictions.reset_index()
            
            # Filter for the specific ticker
            ticker_preds = pred_df[pred_df['item_id'] == ticker].copy()
            if ticker_preds.empty:
                logger.warning(f"No predictions generated for {ticker}")
                return None
            
            # Get the next prediction (first future point)
            next_pred = ticker_preds.iloc[0]
            
            # Extract prediction values
            prediction_data = {
                'ticker': ticker,
                'predicted_price': float(next_pred.get('mean', next_pred.get('0.5', 0))),
                'confidence_low': float(next_pred.get('0.1', 0)),
                'confidence_high': float(next_pred.get('0.9', 0)),
                'prediction_time': datetime.now(),
                'horizon_minutes': 5,  # Next 5-minute candle
                'model_version': 'ChronosFineTuned'
            }
            
            logger.info(f"Generated prediction for {ticker}: ${prediction_data['predicted_price']:.2f}")
            return prediction_data
            
        except Exception as e:
            logger.error(f"Prediction failed for {ticker}: {e}")
            return None

    def make_interval_predictions(self, ticker: str) -> Optional[List[Dict]]:
        """Generate multi-interval predictions for a given ticker."""
        try:
            if not self.predictor:
                logger.error("Model not loaded")
                return None

            # Fetch historical stock data
            df = self.fetch_stock_data(ticker)
            if df is None or len(df) < 365:
                logger.warning(f"Insufficient data for {ticker}")
                return None

            # Convert to TimeSeriesDataFrame for AutoGluon
            ts_data = TimeSeriesDataFrame.from_data_frame(
                df, id_column="item_id", timestamp_column="timestamp"
            )

            # Run Chronos prediction
            # Run Chronos prediction
            predictions = self.predictor.predict(ts_data)

            # Convert predictions safely regardless of AG version
            if hasattr(predictions, "to_pandas"):
                pred_df = predictions.to_pandas().reset_index()
            else:
                pred_df = predictions.reset_index()

            ticker_preds = pred_df[pred_df["item_id"] == ticker]
            if ticker_preds.empty:
                logger.warning(f"No predictions for {ticker}")
                return None

            # Get last known close
            last_close = float(df["target"].iloc[-1])

            # Define intervals (minutes)
            intervals = [5, 15, 30, 60, 1440]  # up to 1 day
            rows = ticker_preds.head(len(intervals))

            results = []
            for i, row in enumerate(rows.itertuples()):
                predicted_price = float(getattr(row, "mean", getattr(row, "_0_5", 0)))
                change = ((predicted_price - last_close) / last_close) * 100

                results.append({
                    "ticker": ticker,
                    "interval": f"{intervals[i]}m" if intervals[i] < 1440 else "1d",
                    "predicted_price": predicted_price,
                    "change": change
                })

            logger.info(f"Generated {len(results)} interval predictions for {ticker}")
            return results

        except Exception as e:
            logger.error(f"Prediction failed for {ticker}: {e}")
            return None

    
    def save_prediction(self, prediction_data: Dict):
        """Save prediction to database"""
        try:
            db = SessionLocal()
            try:
                # Create new prediction record
                prediction = Stock_Prediction(
                    ticker=prediction_data['ticker'],
                    predicted_price=prediction_data['predicted_price'],
                    confidence_low=prediction_data['confidence_low'],
                    confidence_high=prediction_data['confidence_high'],
                    prediction_time=prediction_data['prediction_time'],
                    horizon_minutes=prediction_data['horizon_minutes'],
                    model_version=prediction_data['model_version']
                )
                
                db.add(prediction)
                db.commit()
                logger.info(f"Saved prediction for {prediction_data['ticker']}")
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to save prediction: {e}")
    
    def prediction_loop(self, tickers: List[str] = None):
        """Main prediction loop that runs every 5 minutes"""
        if tickers is None:
            tickers = ['AAPL']  # Default to AAPL, can be expanded
        
        logger.info(f"Starting prediction loop for tickers: {tickers}")
        
        while self.is_running:
            try:
                for ticker in tickers:
                    # Make prediction
                    prediction_data = self.make_prediction(ticker)
                    if prediction_data:
                        # Save to database
                        self.save_prediction(prediction_data)
                
                # Wait for 5 minutes (300 seconds)
                time.sleep(300)
                
            except Exception as e:
                logger.error(f"Error in prediction loop: {e}")
                time.sleep(60)  # Wait 1 minute before retrying
    
    def start_predictions(self, tickers: List[str] = None):
        """Start the background prediction service"""
        if self.is_running:
            logger.warning("Prediction service is already running")
            return
        
        if not self.load_model():
            logger.error("Failed to load model, cannot start predictions")
            return
        
        self.is_running = True
        self.prediction_thread = threading.Thread(
            target=self.prediction_loop,
            args=(tickers,),
            daemon=True
        )
        self.prediction_thread.start()
        logger.info("Prediction service started")
    
    def stop_predictions(self):
        """Stop the background prediction service"""
        if not self.is_running:
            logger.warning("Prediction service is not running")
            return
        
        self.is_running = False
        if self.prediction_thread:
            self.prediction_thread.join(timeout=10)
        logger.info("Prediction service stopped")
    
    def get_latest_predictions(self, ticker: str = None, limit: int = 10) -> List[Dict]:
        """Get latest predictions from database"""
        try:
            db = SessionLocal()
            try:
                query = db.query(Stock_Prediction)
                if ticker:
                    query = query.filter(Stock_Prediction.ticker == ticker)
                
                predictions = query.order_by(Stock_Prediction.prediction_time.desc()).limit(limit).all()
                
                return [
                    {
                        'id': pred.id,
                        'ticker': pred.ticker,
                        'predicted_price': pred.predicted_price,
                        'confidence_low': pred.confidence_low,
                        'confidence_high': pred.confidence_high,
                        'prediction_time': pred.prediction_time,
                        'horizon_minutes': pred.horizon_minutes,
                        'model_version': pred.model_version
                    }
                    for pred in predictions
                ]
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to get predictions: {e}")
            return []

    def get_daily_prediction_tickers(self) -> List[str]:
        """
        Simplified: only returns one ticker at a time (random pick from blue-chips + movers).
        Keeps predictions lightweight and prevents multi-list output issues.
        """
        core_tickers = ["AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "BRK.B"]
        mover_type = random.choice(["gainers", "losers"])

        try:
            url = f"{self.fmp_base_url}/stock_market/{mover_type}"
            params = {"apikey": self.fmp_api_key}
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            trending = [
                d["ticker"] for d in data
                if d.get("ticker") 
                and not any(x in d["ticker"].upper() for x in ["^", "-", "ETF", "INDEX"])
            ]
        except Exception as e:
            logger.warning(f"Failed to fetch {mover_type}: {e}")
            trending = []

        tickers = list(dict.fromkeys(core_tickers + trending))
        chosen = [random.choice(tickers)]  # pick one ticker only
        logger.info(f"Selected ticker for Chronos run: {chosen}")
        return chosen


# Global instance
prediction_service = StockPredictionService()
