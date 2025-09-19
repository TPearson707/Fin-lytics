"""
Test script for the stock prediction service
"""
import os
import sys
import logging
from datetime import datetime

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from stock_prediction_service import StockPredictionService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_prediction_service():
    """Test the prediction service functionality"""
    logger.info("Starting prediction service test...")
    
    # Create service instance
    service = StockPredictionService()
    
    # Test API key configuration
    logger.info("Testing FMP API key configuration...")
    if service.fmp_api_key:
        logger.info(" FMP API key configured")
    else:
        logger.error(" FMP API key not found in environment variables")
        logger.error("Please set FMP_API_KEY in your .env file")
        return False
    
    # Test model loading
    logger.info("Testing model loading...")
    if service.load_model():
        logger.info(" Model loaded successfully")
    else:
        logger.error(" Failed to load model")
        return False
    
    # Test data fetching
    logger.info("Testing FMP data fetching...")
    try:
        df = service.fetch_stock_data('AAPL', days_back=7)
        if df is not None and len(df) > 0:
            logger.info(f" Fetched {len(df)} records for AAPL from FMP")
        else:
            logger.error(" Failed to fetch data or no data returned from FMP")
            return False
    except Exception as e:
        logger.error(f" Error fetching data from FMP: {e}")
        return False
    
    # Test prediction generation
    logger.info("Testing prediction generation...")
    try:
        prediction = service.make_prediction('AAPL')
        if prediction:
            logger.info(f" Generated prediction: ${prediction['predicted_price']:.2f}")
            logger.info(f"  Confidence interval: ${prediction['confidence_low']:.2f} - ${prediction['confidence_high']:.2f}")
        else:
            logger.error(" Failed to generate prediction")
            return False
    except Exception as e:
        logger.error(f" Error generating prediction: {e}")
        return False
    
    logger.info(" All tests passed!")
    return True

if __name__ == "__main__":
    success = test_prediction_service()
    if success:
        print("\n Prediction service test completed successfully!")
    else:
        print("\n Prediction service test failed!")
        sys.exit(1)
