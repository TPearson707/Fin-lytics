#!/usr/bin/env python
import os, sys, time, argparse, random
from typing import List, Dict, Any, Optional, Tuple
import datetime as dt
import pandas as pd
import numpy as np
import requests

FMT = "%Y-%m-%d %H:%M:%S"

# Intraday endpoints
FMP_1M   = "https://financialmodelingprep.com/stable/historical-chart/1min"
FMP_5M   = "https://financialmodelingprep.com/stable/historical-chart/5min"
FMP_15M  = "https://financialmodelingprep.com/stable/historical-chart/15min"
FMP_30M  = "https://financialmodelingprep.com/stable/historical-chart/30min"
FMP_1H   = "https://financialmodelingprep.com/stable/historical-chart/1hour"

# Daily endpoint (JSON has {"symbol": "...", "historical": [...]})
FMP_DAILY = "https://financialmodelingprep.com/api/v3/historical-price-full"

# Map CLI freq -> endpoint + pandas freq alias
ENDPOINT_FOR_FREQ = {
    "5min":   (FMP_5M,  "5min",  False),
    "15min":  (FMP_15M, "15min", False),
    "30min":  (FMP_30M, "30min", False),
    "1hour":  (FMP_1H,  "60min", False),
    "1day":   (FMP_DAILY, "D",    True),   # daily via historical-price-full
}

# Candidate endpoints for S&P 500 constituents (stable + legacy)
SP500_ENDPOINTS = [
    "https://financialmodelingprep.com/stable/sp-500",
    "https://financialmodelingprep.com/api/v3/sp500_constituent",
    "https://financialmodelingprep.com/api/v4/sp500_constituent",
]

# ----------------- helpers -----------------

def month_start(d: dt.date) -> dt.date:
    return d.replace(day=1)

def month_end(d: dt.date) -> dt.date:
    next_m = (d.replace(day=28) + dt.timedelta(days=4)).replace(day=1)
    return next_m - dt.timedelta(days=1)

def fetch_chunk(endpoint: str, symbol: str, start_d: dt.date, end_d: dt.date, apikey: str, timeout: int = 30) -> List[Dict[str, Any]]:
    params = {"symbol": symbol, "from": start_d.strftime("%Y-%m-%d"), "to": end_d.strftime("%Y-%m-%d"), "apikey": apikey}
    r = requests.get(endpoint, params=params, timeout=timeout)
    r.raise_for_status()
    data = r.json()

    # daily endpoint returns a dict with "historical"
    if isinstance(data, dict) and "historical" in data and isinstance(data["historical"], list):
        return data["historical"]

    if isinstance(data, dict) and data.get("Error Message"):
        raise RuntimeError(f"FMP error: {data['Error Message']}")
    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(f"FMP error: {data['error']}")
    if not isinstance(data, list):
        raise RuntimeError(f"Unexpected FMP response type: {type(data)}; content head: {str(data)[:200]}")
    return data

def fetch_all(endpoint: str, symbol: str, apikey: str, max_months: int, is_daily: bool, pause_s: float = 0.2) -> pd.DataFrame:
    """
    Fetch history; returns ascending df with datetime, open, high, low, close, volume.
    - Intraday endpoints: page month-by-month (FMP’s intraday limits).
    - Daily endpoint: one call using from/to (span ~max_months months).
    """
    today = dt.date.today()

    if is_daily:
        # For daily, a single call is typically enough; approximate months->days
        approx_days = max(1, int(round(max_months * 30.5)))
        start_d = today - dt.timedelta(days=approx_days)
        end_d   = today
        rows = fetch_chunk(endpoint, symbol, start_d, end_d, apikey)
        if not rows:
            raise RuntimeError(f"No daily data returned for {symbol}.")
    else:
        # Intraday: walk month-by-month, newest->older
        end = month_end(today)
        start = month_start(today)
        rows: List[Dict[str, Any]] = []
        months = 0
        while months < max_months:
            chunk = fetch_chunk(endpoint, symbol, start, end, apikey)
            if chunk:
                rows.extend(chunk)
            else:
                break
            end = start - dt.timedelta(days=1)
            start = month_start(end)
            months += 1
            time.sleep(pause_s)
        if not rows:
            raise RuntimeError(f"No intraday data returned for {symbol}. Check plan or try smaller windows.")

    df = pd.DataFrame(rows)
    # FMP fields vary slightly but these should exist:
    # intraday: ["date","open","high","low","close","volume"]
    # daily:    ["date","open","high","low","close","volume", ...]
    req = {"date", "open", "high", "low", "close", "volume"}
    if not req.issubset(df.columns):
        missing = sorted(req - set(df.columns))
        raise ValueError(f"{symbol}: FMP missing columns {missing}")

    df = df.rename(columns={"date": "datetime"})
    # FMP formats:
    # - intraday: "YYYY-MM-DD HH:MM:SS"
    # - daily:    "YYYY-MM-DD"
    # Using pandas to parse both safely
    df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce")
    for c in ["open", "high", "low", "close", "volume"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.dropna(subset=["datetime"]).sort_values("datetime").reset_index(drop=True)
    return df

def parse_session(session: str) -> Optional[Tuple[int,int,int,int]]:
    if session == "all":
        return None
    if not (len(session) == 9 and session[4] == "-"):
        raise ValueError("session must be 'all' or HHMM-HHMM, e.g., 0930-1600")
    s_h, s_m = int(session[:2]), int(session[2:4])
    e_h, e_m = int(session[5:7]), int(session[7:9])
    return (s_h, s_m, e_h, e_m)

def in_session(ts: pd.Timestamp, sess) -> bool:
    if sess is None:
        return True
    s_h, s_m, e_h, e_m = sess
    t = ts.time()
    start_t = pd.Timestamp(ts.date()).replace(hour=s_h, minute=s_m).time()
    end_t   = pd.Timestamp(ts.date()).replace(hour=e_h, minute=e_m).time()
    return (t >= start_t) and (t <= end_t)

def regularize_intraday(df: pd.DataFrame, pandas_freq: str, session: str,
                        fill_mode: str = "ffill_zero_vol",
                        round_decimals: int = 6) -> pd.DataFrame:
    """
    Input df: columns [datetime, open, high, low, close, volume] with gaps allowed.
    Output: strict per-day grid at `pandas_freq`, session-filtered, with within-day fills only.
    fill_mode:
      - 'ffill_zero_vol' : missing slots -> O/H/L/C=prev close, volume=0 (after leading-drop)
      - 'ffill_only'     : forward-fill numeric; drops leading pre-first-print rows
      - 'drop_missing'   : keep only existing bars (no synthesis)
    """
    need = {"datetime", "open", "high", "low", "close", "volume"}
    if not need.issubset(df.columns):
        raise ValueError(f"regularize_intraday missing columns: {sorted(need - set(df.columns))}")

    # Handle daily freq specially: just return sorted, no session filtering
    if pandas_freq == "D":
        out = df.drop_duplicates(subset=["datetime"]).sort_values("datetime").reset_index(drop=True).copy()
        for c in ["open", "high", "low", "close"]:
            out[c] = pd.to_numeric(out[c], errors="coerce").round(round_decimals)
        out["volume"] = pd.to_numeric(out["volume"], errors="coerce").fillna(0)
        return out

    # drop rows where all OHLCV are NaN/blank
    all_nan = df[["open","high","low","close","volume"]].isna().all(axis=1)
    df = df.loc[~all_nan].copy()
    if df.empty:
        return df

    # de-dupe & sort
    df = df.drop_duplicates(subset=["datetime"]).sort_values("datetime").reset_index(drop=True)

    sess = parse_session(session)
    out_parts = []

    for day, d in df.groupby(df["datetime"].dt.date, sort=True):
        day_df = d.set_index("datetime")[["open","high","low","close","volume"]].copy()
        if day_df.empty:
            continue

        start_ts = day_df.index.min().floor(pandas_freq)
        end_ts   = day_df.index.max().ceil(pandas_freq)
        rng = pd.date_range(start_ts, end_ts, freq=pandas_freq)
        day_df = day_df.reindex(rng)

        if fill_mode == "drop_missing":
            day_df = day_df.dropna()
        else:
            # within-day forward fill
            day_df[["open","high","low","close","volume"]] = day_df[["open","high","low","close","volume"]].ffill()
            # drop leading rows before first print
            lead_mask = day_df["close"].isna()
            if lead_mask.any():
                day_df = day_df.loc[~lead_mask]
            if fill_mode == "ffill_zero_vol":
                day_df["volume"] = day_df["volume"].fillna(0)

        for c in ["open","high","low","close"]:
            if c in day_df.columns:
                day_df[c] = day_df[c].round(round_decimals)

        # session filter
        if sess is not None and not day_df.empty:
            mask = [in_session(ts, sess) for ts in day_df.index]
            day_df = day_df.loc[mask]

        if not day_df.empty:
            day_df = day_df.reset_index().rename(columns={"index": "datetime"})
            out_parts.append(day_df)

    if not out_parts:
        return pd.DataFrame(columns=["datetime","open","high","low","close","volume"])

    clean = pd.concat(out_parts, ignore_index=True)
    clean = clean.sort_values("datetime").reset_index(drop=True)
    return clean

def fetch_sp500_symbols(apikey: str) -> List[str]:
    errors = []
    for url in SP500_ENDPOINTS:
        try:
            r = requests.get(url, params={"apikey": apikey}, timeout=30)
            r.raise_for_status()
            data = r.json()
            if isinstance(data, dict) and "constituents" in data:
                syms = [row.get("symbol") for row in data["constituents"]]
            elif isinstance(data, list):
                syms = [row.get("symbol") for row in data]
            else:
                continue
            syms = [s.strip().upper() for s in syms if s and isinstance(s, str)]
            syms = [s.replace(".", "-") for s in syms]  # BRK.B -> BRK-B
            syms = sorted(set(syms))
            if syms:
                return syms
        except Exception as e:
            errors.append(f"{url}: {e}")
    raise RuntimeError("Failed to fetch S&P 500 symbols.\n" + "\n".join(errors))

# ----------------- CLI -----------------

def main():
    ap = argparse.ArgumentParser(description="Fetch intraday/daily JSON from FMP and write regularized CSVs.")
    ap.add_argument("--apikey", default=os.getenv("FMP_API_KEY", ""), help="FMP API key (or env FMP_API_KEY)")
    ap.add_argument("--symbols", nargs="+", help="One or more tickers, e.g., AAPL MSFT NVDA")
    ap.add_argument("--symbols-from-sp500", action="store_true",
                    help="Fetch current S&P 500 constituents from FMP instead of passing --symbols")
    ap.add_argument("--max_symbols", type=int, default=0, help="Limit number of symbols (0 = all)")
    ap.add_argument("--shuffle", action="store_true", help="Shuffle symbol order")
    ap.add_argument("--freq", default="15min",
                    choices=["5min", "15min", "30min", "1hour", "1day"],
                    help="Bar frequency to fetch & regularize")
    ap.add_argument("--max_months", type=int, default=36,
                    help="How many months back to fetch (approx for daily)")
    ap.add_argument("--session", default="0930-1600", help="HHMM-HHMM or 'all' (ignored for 1day)")
    ap.add_argument("--fill", choices=["ffill_zero_vol","ffill_only","drop_missing"], default="ffill_zero_vol")
    ap.add_argument("--round", type=int, default=6, help="Decimals for price rounding")
    ap.add_argument("--out_raw", required=True, help="Folder to write raw CSVs")
    ap.add_argument("--out_clean", required=True, help="Folder to write cleaned CSVs")
    args = ap.parse_args()

    if not args.apikey:
        print("ERROR: provide FMP API key via --apikey or env FMP_API_KEY", file=sys.stderr)
        sys.exit(2)

    # Build symbol list
    if args.symbols_from_sp500:
        print("[sp500] fetching S&P 500 symbols from FMP...")
        symbols = fetch_sp500_symbols(args.apikey)
    elif args.symbols:
        symbols = [s.strip().upper().replace(".", "-") for s in args.symbols]
    else:
        print("ERROR: provide --symbols SYMBOLS... or --symbols-from-sp500", file=sys.stderr)
        sys.exit(2)

    if args.shuffle:
        random.shuffle(symbols)
    if args.max_symbols and args.max_symbols > 0:
        symbols = symbols[:args.max_symbols]

    endpoint, pandas_freq, is_daily = ENDPOINT_FOR_FREQ[args.freq]
    # For 1day we ignore session
    effective_session = "all" if is_daily else args.session

    os.makedirs(args.out_raw, exist_ok=True)
    os.makedirs(args.out_clean, exist_ok=True)

    for i, sym in enumerate(symbols, 1):
        try:
            print(f"[{i}/{len(symbols)}] {sym}: fetching {args.freq} JSON...")
            df_raw = fetch_all(endpoint, sym, args.apikey, max_months=args.max_months, is_daily=is_daily)
            raw_csv = os.path.join(args.out_raw, f"{sym}_{args.freq}.csv")
            df_raw.to_csv(raw_csv, index=False)
            print(f"    wrote raw:   {raw_csv}  ({len(df_raw)} rows)")

            print(f"    regularizing -> pandas_freq={pandas_freq}, session={effective_session}, fill={args.fill}")
            clean = regularize_intraday(
                df_raw[["datetime","open","high","low","close","volume"]].copy(),
                pandas_freq=pandas_freq, session=effective_session,
                fill_mode=args.fill, round_decimals=args.round
            )
            clean_csv = os.path.join(args.out_clean, f"{sym}_{args.freq}_clean.csv")
            clean.to_csv(clean_csv, index=False)
            print(f"    wrote clean: {clean_csv}  ({len(clean)} rows)")
            # gentle pacing
            if (i % 10) == 0:
                time.sleep(0.5)
            else:
                time.sleep(0.2)
        except Exception as e:
            print(f"    WARN: {sym} failed: {e}")

if __name__ == "__main__":
    main()