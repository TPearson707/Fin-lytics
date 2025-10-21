import os
import threading
import time
from datetime import datetime, timedelta
from typing import List, Optional

import pandas as pd
from zoneinfo import ZoneInfo

# Reuse the fetch/regularize helpers from AI_model/data_downloader.py
from pathlib import Path
import sys

# Ensure AI_model is importable when backend is the CWD
THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
AI_MODEL_DIR = ROOT_DIR / "AI_model"
if str(AI_MODEL_DIR) not in sys.path:
    sys.path.insert(0, str(AI_MODEL_DIR))

from data_downloader import ENDPOINT_FOR_FREQ, fetch_all, regularize_intraday  # type: ignore


class EndOfDayUpdater:
    """
    Background service that, after U.S. market close (16:00 America/New_York),
    updates 5m and 15m datasets for configured tickers and writes both CSV and Excel.
    """

    def __init__(self, tickers: Optional[List[str]] = None):
        self.tickers = tickers or self._load_ticker_list()
        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        # Output folders under AI_model
        self.base_5m_raw = AI_MODEL_DIR / "5minutecharts" / "raw"
        self.base_5m_clean = AI_MODEL_DIR / "5minutecharts" / "clean"
        self.base_15m_raw = AI_MODEL_DIR / "15minutecharts" / "raw"
        self.base_15m_clean = AI_MODEL_DIR / "15minutecharts" / "clean"
        for p in [self.base_5m_raw, self.base_5m_clean, self.base_15m_raw, self.base_15m_clean]:
            p.mkdir(parents=True, exist_ok=True)

        # FMP API key
        self.fmp_api_key = os.getenv("FMP_API_KEY", "")

        # Last run time to debounce manual triggers
        self._last_run_at: Optional[datetime] = None

    def _load_ticker_list(self) -> List[str]:
        """Load ticker list from stock_tickers.txt file"""
        try:
            ticker_file = ROOT_DIR / "stock_tickers.txt"
            if ticker_file.exists():
                with open(ticker_file, 'r', encoding ='utf-8-sig') as f:  # utf-8-sig handles BOM
                    tickers = [line.strip() for line in f if line.strip()]
                print(f"Loaded {len(tickers)} tickers from stock_tickers.txt")
                return tickers
            else:
                print("stock_tickers.txt not found, using default ticker list")
                return ["AAPL"]
        except Exception as e:
            print(f"Error loading ticker list: {e}")
            return ["AAPL"]

    def _now_ny(self) -> datetime:
        return datetime.now(ZoneInfo("America/New_York"))

    def _next_market_close_run(self, after: Optional[datetime] = None) -> datetime:
        now_ny = after or self._now_ny()
        close_today = now_ny.replace(hour=16, minute=10, second=0, microsecond=0)
        # Run at 16:10 NY time to allow feeds to settle
        if now_ny <= close_today:
            return close_today
        # Otherwise schedule for next weekday (skip Sat/Sun)
        next_day = (now_ny + timedelta(days=1)).replace(hour=16, minute=10, second=0, microsecond=0)
        while next_day.weekday() >= 5:  # 5=Sat, 6=Sun
            next_day += timedelta(days=1)
        return next_day

    def _write_outputs(self, df_raw: pd.DataFrame, clean: pd.DataFrame, symbol: str, freq: str, raw_dir: Path, clean_dir: Path):
        raw_csv = raw_dir / f"{symbol}_{freq}.csv"
        clean_csv = clean_dir / f"{symbol}_{freq}_clean.csv"
        raw_xlsx = raw_dir / f"{symbol}_{freq}.xlsx"
        clean_xlsx = clean_dir / f"{symbol}_{freq}_clean.xlsx"

        df_raw.to_csv(raw_csv, index=False)
        clean.to_csv(clean_csv, index=False)
        try:
            df_raw.to_excel(raw_xlsx, index=False)
            clean.to_excel(clean_xlsx, index=False)
        except Exception:
            # Excel export is best-effort; CSVs are primary artifacts
            pass

    def _get_last_trading_day(self, symbol: str, freq: str) -> Optional[datetime]:
        """Get the last trading day we have data for a symbol"""
        try:
            if freq == "5min":
                clean_file = self.base_5m_clean / f"{symbol}_{freq}_clean.csv"
            elif freq == "15min":
                clean_file = self.base_15m_clean / f"{symbol}_{freq}_clean.csv"
            else:
                return None
                
            if not clean_file.exists():
                return None
                
            # Read the last few lines to get the most recent date
            df = pd.read_csv(clean_file)
            if df.empty:
                return None
                
            # Get the last datetime from the clean data
            last_dt = pd.to_datetime(df['datetime'].iloc[-1])
            return last_dt
            
        except Exception:
            return None

    def _fetch_incremental_data(self, symbol: str, freq: str, last_trading_day: Optional[datetime]) -> Optional[pd.DataFrame]:
        """Fetch only new data since the last trading day"""
        try:
            endpoint, pandas_freq, is_daily = ENDPOINT_FOR_FREQ[freq]
            
            # Calculate date range for incremental fetch
            if last_trading_day:
                # Start from the day after last trading day
                start_date = last_trading_day.date() + timedelta(days=1)
            else:
                # No existing data, fetch last 30 days
                start_date = (datetime.now() - timedelta(days=30)).date()
            
            end_date = datetime.now().date()
            
            # Skip if start_date is in the future
            if start_date > end_date:
                return None
                
            # For intraday data, fetch month by month to respect FMP limits
            if not is_daily:
                return self._fetch_intraday_incremental(symbol, endpoint, start_date, end_date)
            else:
                return self._fetch_daily_incremental(symbol, endpoint, start_date, end_date)
                
        except Exception as e:
            print(f"Error fetching incremental data for {symbol}: {e}")
            return None

    def _fetch_intraday_incremental(self, symbol: str, endpoint: str, start_date, end_date) -> Optional[pd.DataFrame]:
        """Fetch intraday data month by month"""
        import sys
        sys.path.insert(0, str(AI_MODEL_DIR))
        from data_downloader import fetch_chunk
        
        all_data = []
        current_date = start_date
        
        while current_date <= end_date:
            # Calculate month boundaries
            month_start = current_date.replace(day=1)
            if current_date.month == 12:
                month_end = current_date.replace(year=current_date.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                month_end = (current_date.replace(month=current_date.month + 1, day=1) - timedelta(days=1))
            
            # Don't go beyond our end_date
            month_end = min(month_end, end_date)
            
            try:
                chunk = fetch_chunk(endpoint, symbol, month_start, month_end, self.fmp_api_key)
                if chunk:
                    all_data.extend(chunk)
                time.sleep(0.2)  # Rate limiting
            except Exception as e:
                print(f"Error fetching chunk for {symbol} {month_start} to {month_end}: {e}")
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1, day=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1, day=1)
        
        if not all_data:
            return None
            
        df = pd.DataFrame(all_data)
        df = df.rename(columns={"date": "datetime"})
        df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce")
        for c in ["open", "high", "low", "close", "volume"]:
            df[c] = pd.to_numeric(df[c], errors="coerce")
        df = df.dropna(subset=["datetime"]).sort_values("datetime").reset_index(drop=True)
        return df

    def _fetch_daily_incremental(self, symbol: str, endpoint: str, start_date, end_date) -> Optional[pd.DataFrame]:
        """Fetch daily data for the date range"""
        import sys
        sys.path.insert(0, str(AI_MODEL_DIR))
        from data_downloader import fetch_chunk
        
        try:
            chunk = fetch_chunk(endpoint, symbol, start_date, end_date, self.fmp_api_key)
            if not chunk:
                return None
                
            df = pd.DataFrame(chunk)
            df = df.rename(columns={"date": "datetime"})
            df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce")
            for c in ["open", "high", "low", "close", "volume"]:
                df[c] = pd.to_numeric(df[c], errors="coerce")
            df = df.dropna(subset=["datetime"]).sort_values("datetime").reset_index(drop=True)
            return df
        except Exception as e:
            print(f"Error fetching daily data for {symbol}: {e}")
            return None

    def _append_to_existing_data(self, new_df: pd.DataFrame, symbol: str, freq: str):
        """Append new data to existing files, avoiding duplicates"""
        try:
            if freq == "5min":
                raw_file = self.base_5m_raw / f"{symbol}_{freq}.csv"
                clean_file = self.base_5m_clean / f"{symbol}_{freq}_clean.csv"
            elif freq == "15min":
                raw_file = self.base_15m_raw / f"{symbol}_{freq}.csv"
                clean_file = self.base_15m_clean / f"{symbol}_{freq}_clean.csv"
            else:
                return
                
            # Read existing data
            existing_raw = pd.DataFrame()
            existing_clean = pd.DataFrame()
            
            if raw_file.exists():
                existing_raw = pd.read_csv(raw_file)
                existing_raw['datetime'] = pd.to_datetime(existing_raw['datetime'])
            if clean_file.exists():
                existing_clean = pd.read_csv(clean_file)
                existing_clean['datetime'] = pd.to_datetime(existing_clean['datetime'])
            
            # Combine and remove duplicates
            if not existing_raw.empty:
                combined_raw = pd.concat([existing_raw, new_df], ignore_index=True)
                combined_raw = combined_raw.drop_duplicates(subset=['datetime']).sort_values('datetime')
            else:
                combined_raw = new_df
                
            # Regularize the combined data
            endpoint, pandas_freq, is_daily = ENDPOINT_FOR_FREQ[freq]
            session = "all" if is_daily else "0930-1600"
            
            clean = regularize_intraday(
                combined_raw[["datetime", "open", "high", "low", "close", "volume"]].copy(),
                pandas_freq=pandas_freq,
                session=session,
                fill_mode="ffill_zero_vol",
                round_decimals=6,
            )
            
            # Write updated files
            combined_raw.to_csv(raw_file, index=False)
            clean.to_csv(clean_file, index=False)
            
            # Also write Excel versions
            try:
                combined_raw.to_excel(raw_file.with_suffix('.xlsx'), index=False)
                clean.to_excel(clean_file.with_suffix('.xlsx'), index=False)
            except Exception:
                pass  # Excel export is best-effort
                
        except Exception as e:
            print(f"Error appending data for {symbol} {freq}: {e}")

    def _update_for_freq(self, symbols: List[str], freq: str, max_months: int = 36):
        """Update data for each symbol, fetching only missing data"""
        print(f"Updating {len(symbols)} symbols for {freq} frequency...")
        for i, sym in enumerate(symbols, 1):
            try:
                print(f"[{i}/{len(symbols)}] Processing {sym} for {freq}...")
                # Check what's the last trading day we have
                last_trading_day = self._get_last_trading_day(sym, freq)
                
                # Fetch only new data since last trading day
                new_data = self._fetch_incremental_data(sym, freq, last_trading_day)
                
                if new_data is not None and not new_data.empty:
                    # Append to existing data
                    self._append_to_existing_data(new_data, sym, freq)
                    print(f"✓ Updated {sym} {freq}: added {len(new_data)} new records")
                else:
                    print(f"✓ No new data for {sym} {freq}")
                    
            except Exception as e:
                print(f"✗ Error updating {sym} {freq}: {e}")
                continue

    def run_once(self, tickers: Optional[List[str]] = None):
        symbols = [s.strip().upper().replace(".", "-") for s in (tickers or self.tickers)]
        self._update_for_freq(symbols, "5min")
        self._update_for_freq(symbols, "15min")
        self._last_run_at = datetime.utcnow()

    def update_all_stocks(self):
        """Update all stocks from the ticker list"""
        print(f"Starting update for all {len(self.tickers)} stocks...")
        self.run_once()
        print("Update completed for all stocks")

    def loop(self):
        while self.is_running:
            try:
                next_run = self._next_market_close_run()
                now_ny = self._now_ny()
                sleep_s = max(5.0, (next_run - now_ny).total_seconds())
                time.sleep(sleep_s)
                if not self.is_running:
                    break
                self.run_once()
                # After running, wait at least 30 minutes before scheduling again
                time.sleep(30 * 60)
            except Exception:
                time.sleep(60)

    def start(self, tickers: Optional[List[str]] = None):
        if self.is_running:
            return
        if tickers:
            self.tickers = tickers
        self.is_running = True
        self.thread = threading.Thread(target=self.loop, daemon=True)
        self.thread.start()

    def stop(self):
        if not self.is_running:
            return
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=10)

    def status(self) -> dict:
        return {
            "is_running": self.is_running,
            "ticker_count": len(self.tickers),
            "tickers": self.tickers[:10] if len(self.tickers) > 10 else self.tickers,  # Show first 10 for brevity
            "last_run_at": self._last_run_at,
        }



eod_updater = EndOfDayUpdater()


