"""
Configuration for the stock prediction service
"""

# Default tickers to predict (can be modified via API)
DEFAULT_TICKERS = ['AAPL']

# Prediction settings
PREDICTION_INTERVAL_MINUTES = 5
HISTORICAL_DAYS_BACK = 30
PREDICTION_HORIZON_MINUTES = 5

# Model settings
MODEL_PATH = "../AI_model/AutoGluonModels_multi"

# Database settings
MAX_PREDICTIONS_TO_KEEP = 1000  # Keep last 1000 predictions per ticker

# API settings
MAX_PREDICTIONS_PER_REQUEST = 100

