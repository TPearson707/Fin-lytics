import time
import requests
from fastapi import HTTPException
import os
from dotenv import load_dotenv

load_dotenv()

# FMP API
fmp_api_key = os.getenv("FMP_API_KEY")
fmp_base_url = "https://financialmodelingprep.com/api/v3"

# In-memory cache
symbol_cache = {}
company_cache = {}
CACHE_TTL = 60 * 60 * 12  # 12 hours


def get_cached_symbol(ticker: str):
    now = time.time()
    entry = symbol_cache.get(ticker.upper())
    if entry and (now - entry["timestamp"] < CACHE_TTL):
        return entry["exchange"]
    return None


def set_cached_symbol(ticker: str, exchange: str):
    symbol_cache[ticker.upper()] = {"exchange": exchange, "timestamp": time.time()}


def get_cached_company(ticker: str):
    now = time.time()
    entry = company_cache.get(ticker.upper())
    if entry and (now - entry["timestamp"] < CACHE_TTL):
        return entry["data"]
    return None


def set_cached_company(ticker: str, data: dict):
    company_cache[ticker.upper()] = {"data": data, "timestamp": time.time()}


def fetch_symbol_from_fmp(ticker: str):
    """Fetch exchange info for a ticker via FMP and cache it."""
    cached = get_cached_symbol(ticker)
    if cached:
        return cached

    url = f"{fmp_base_url}/profile/{ticker.upper()}"
    params = {"apikey": fmp_api_key}
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        if not data or not isinstance(data, list) or len(data) == 0:
            raise HTTPException(status_code=404, detail=f"No company profile found for {ticker}")

        company = data[0]
        exchange = company.get("exchangeShortName", "NASDAQ") or "NASDAQ"
        set_cached_symbol(ticker, exchange)
        return exchange
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch symbol: {str(e)}")


def fetch_company_snapshot(ticker: str):
    """Fetch detailed company info with caching."""
    cached = get_cached_company(ticker)
    if cached:
        return cached

    url = f"{fmp_base_url}/profile/{ticker.upper()}"
    params = {"apikey": fmp_api_key}
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if not data or not isinstance(data, list) or len(data) == 0:
            raise HTTPException(status_code=404, detail=f"No company profile found for {ticker}")

        company = data[0]
        cleaned = {
            "symbol": company.get("symbol", ticker.upper()),
            "companyName": company.get("companyName") or company.get("name") or ticker.upper(),
            "exchange": company.get("exchangeShortName", ""),
            "industry": company.get("industry", ""),
            "sector": company.get("sector", ""),
            "ceo": company.get("ceo", ""),
            "marketCap": company.get("mktCap", 0),
            "website": company.get("website", ""),
            "description": company.get("description", ""),
        }

        set_cached_company(ticker, cleaned)
        return cleaned
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch company info: {str(e)}")

def normalize_ticker_symbol(ticker: str, for_tradingview=False) -> str:
    """
    Normalize ticker for either FMP or TradingView compatibility.
    - For FMP: BRK.B → BRK-B
    - For TradingView: BRK.B → BRK/B
    """
    ticker = ticker.upper().strip()
    if for_tradingview:
        return ticker.replace(".", "/")
    return ticker.replace(".", "-")