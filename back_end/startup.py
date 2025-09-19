"""
Startup script to initialize the prediction service when the backend starts
"""
import logging
from stock_prediction_service import prediction_service

logger = logging.getLogger(__name__)

def initialize_prediction_service():
    """Initialize the prediction service on startup"""
    try:
        # Load the model
        if prediction_service.load_model():
            logger.info("Prediction service initialized successfully")
            # Optionally start predictions for default tickers
            # prediction_service.start_predictions(['AAPL'])
        else:
            logger.error("Failed to initialize prediction service - model could not be loaded")
    except Exception as e:
        logger.error(f"Error initializing prediction service: {e}")

def cleanup_prediction_service():
    """Cleanup the prediction service on shutdown"""
    try:
        prediction_service.stop_predictions()
        logger.info("Prediction service cleaned up successfully")
    except Exception as e:
        logger.error(f"Error cleaning up prediction service: {e}")

