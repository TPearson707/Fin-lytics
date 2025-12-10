def fetch_market_losers():
    """Fetch top market losers from FMP."""
    try:
        url = f"{FMP_BASE_URL}/stock_market/losers"
        params = {"apikey": FMP_API_KEY}
        res = requests.get(url, params=params, timeout=10)
        res.raise_for_status()
        data = res.json()

        cleaned = []
        for d in data:
            try:
                price = float(d.get("price", 0))
                change = float(d.get("change", 0))
                pct = float(str(d.get("changesPercentage", "0")).replace("%", "").replace("+", ""))
                symbol = d.get("symbol", "").upper()
                name = d.get("name") or symbol
                if not symbol or "ETF" in name or any(x in symbol for x in ["/", "="]):
                    continue
                cleaned.append({
                    "symbol": symbol,
                    "name": name,
                    "price": round(price, 2),
                    "change": round(change, 2),
                    "change_percent": round(pct, 2)
                })
            except (TypeError, ValueError):
                continue

        # prioritize high/mid/low price tiers
        high = [x for x in cleaned if x["price"] >= 80]
        mid = [x for x in cleaned if 20 <= x["price"] < 80]
        low = [x for x in cleaned if x["price"] < 20]
        return (high + mid + low)[:5]
    except Exception as e:
        print("Error fetching market losers:", e)
        return []
import os
import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from dotenv import load_dotenv
from database import SessionLocal
from models import Plaid_Investment, Plaid_Bank_Account, Plaid_Investment_Holding
from auth import get_current_user

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/overview", tags=["overview"])

FMP_API_KEY = os.getenv("FMP_API_KEY")
FMP_BASE_URL = "https://financialmodelingprep.com/api/v3"


# --- Dependency for database session ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Helper functions ---
def fetch_market_gainers():
    """Fetch top market gainers from FMP."""
    try:
        url = f"{FMP_BASE_URL}/stock_market/gainers"
        params = {"apikey": FMP_API_KEY}
        res = requests.get(url, params=params, timeout=10)
        res.raise_for_status()
        data = res.json()

        cleaned = []
        for d in data:
            try:
                price = float(d.get("price", 0))
                change = float(d.get("change", 0))
                pct = float(str(d.get("changesPercentage", "0")).replace("%", "").replace("+", ""))
                symbol = d.get("symbol", "").upper()
                name = d.get("name") or symbol
                if not symbol or "ETF" in name or any(x in symbol for x in ["/", "="]):
                    continue
                cleaned.append({
                    "symbol": symbol,
                    "name": name,
                    "price": round(price, 2),
                    "change": round(change, 2),
                    "change_percent": round(pct, 2)
                })
            except (TypeError, ValueError):
                continue

        # prioritize high/mid/low price tiers
        high = [x for x in cleaned if x["price"] >= 80]
        mid = [x for x in cleaned if 20 <= x["price"] < 80]
        low = [x for x in cleaned if x["price"] < 20]
        return (high + mid + low)[:5]
    except Exception as e:
        print("Error fetching market gainers:", e)
        return []


def fetch_market_indices():
    """Get basic index snapshot (S&P, Dow, NASDAQ)."""
    try:
        url = f"{FMP_BASE_URL}/quotes/index"
        params = {"apikey": FMP_API_KEY}
        res = requests.get(url, params=params, timeout=10)
        res.raise_for_status()
        data = res.json()
        wanted = ["^GSPC", "^DJI", "^IXIC"]
        return [
            {
                "index": d["name"],
                "price": d["price"],
                "change_percent": d["changesPercentage"]
            }
            for d in data if d["symbol"] in wanted
        ]
    except Exception:
        return []


def fetch_general_news():
    """Fetch a few top news headlines for the 'News Feed & Stock-AI Insights' section."""
    try:
        url = f"{FMP_BASE_URL}/stock_news"
        params = {"limit": 5, "apikey": FMP_API_KEY}
        res = requests.get(url, params=params, timeout=10)
        res.raise_for_status()
        news = res.json()[:5]
        return [
            {
                "title": n.get("title", ""),
                "site": n.get("site", ""),
                "publishedDate": n.get("publishedDate", ""),
                "url": n.get("url", ""),
                "image": n.get("image", "")
            }
            for n in news
        ]
    except Exception:
        return []


# --- /overview endpoint ---
@router.get("/")
async def get_dashboard_overview(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Combine all portfolio + market data into a single response.
    Provides: summary, allocation, top movers, market overview, and news.
    """
    try:
        # --- 1. Portfolio summary ---
        holdings = (
            db.query(Plaid_Investment_Holding)
            .join(Plaid_Investment)
            .filter(Plaid_Investment.user_id == user["id"])
            .all()
        )
        total_value = sum(h.value or 0 for h in holdings)
        total_gain = total_value * 0.14  # Placeholder until you store cost basis
        daily_gain = total_value * 0.01  # Placeholder daily gain

        summary = {
            "total_value": round(total_value, 2),
            "daily_gain": round(daily_gain, 2),
            "daily_gain_percent": 1.01,
            "total_gain": round(total_gain, 2),
            "total_gain_percent": 14.0,
        }

        # --- 2. Asset allocation ---
        banks = db.query(Plaid_Bank_Account).filter_by(user_id=user["id"]).all()
        invest_accounts = db.query(Plaid_Investment).filter_by(user_id=user["id"]).all()
        total_bank = sum(a.current_balance or 0 for a in banks)
        total_invest = sum(i.current_balance or 0 for i in invest_accounts)
        total_all = total_bank + total_invest

        allocation = {
            "stocks": round((total_invest / total_all) * 100, 2) if total_all else 0,
            "cash": round((total_bank / total_all) * 100, 2) if total_all else 0,
        }

        # --- 3. Top Movers (Portfolio) ---
        def fetch_yesterday_close(symbol):
            try:
                url = f"{FMP_BASE_URL}/historical-price-full/{symbol}?serietype=line&apikey={FMP_API_KEY}&timeseries=2"
                res = requests.get(url, timeout=8)
                res.raise_for_status()
                data = res.json()
                hist = data.get("historical", [])
                if len(hist) >= 2:
                    return float(hist[1]["close"])
                elif len(hist) == 1:
                    return float(hist[0]["close"])
                else:
                    return None
            except Exception:
                return None

        movers = []
        for h in holdings:
            if not h.symbol or not h.price:
                continue
            yclose = fetch_yesterday_close(h.symbol)
            if yclose is None or yclose == 0:
                continue
            change_value = round(h.price - yclose, 2)
            change_percent = round(((h.price - yclose) / yclose) * 100, 2)
            movers.append({
                "symbol": h.symbol,
                "name": h.name,
                "price": h.price,
                "change_value": change_value,
                "change_percent": change_percent,
            })

        # Sort by absolute percent change, then value
        top_movers = sorted(movers, key=lambda m: abs(m["change_percent"]), reverse=True)[:3]

        # --- 4. Market overview (Indices + Gainers) ---
        market_overview = {
            "indices": fetch_market_indices(),
            "gainers": fetch_market_gainers(),
            "losers": fetch_market_losers()
        }

        # --- 5. News Feed ---
        news_feed = fetch_general_news()

        return {
            "summary": summary,
            "allocation": allocation,
            "top_movers": top_movers,
            "market_overview": market_overview,
            "news_feed": news_feed,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build overview: {str(e)}")
