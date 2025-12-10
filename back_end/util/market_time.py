from datetime import datetime, timedelta
import pytz
import pandas_market_calendars as mcal

nyc = pytz.timezone("America/New_York")
nyse = mcal.get_calendar("NYSE")


def _today_schedule():
    """Returns schedule row for today, or None."""
    now = datetime.now(nyc)
    schedule = nyse.schedule(start_date=now.date(), end_date=now.date())
    return None if schedule.empty else schedule.iloc[0]


def is_trade_day() -> bool:
    """True if today is a valid NYSE trading day (not weekend/holiday)."""
    return _today_schedule() is not None


def is_market_open() -> bool:
    """True if the market is open right now."""
    session = _today_schedule()
    if session is None:
        return False

    now = datetime.now(nyc)
    open_time = session["market_open"].tz_convert(nyc)
    close_time = session["market_close"].tz_convert(nyc)

    return open_time <= now <= close_time


def time_until_next_market_open() -> float:
    """
    Returns seconds until the next NYSE opening time.
    Compatible with pandas-market-calendars <= 5.2 where next_session doesn't exist.
    """
    now = datetime.now(nyc)

    # 1️⃣ Check if today is a trade day and we're BEFORE the open
    session = _today_schedule()
    if session is not None:
        open_time = session["market_open"].tz_convert(nyc)
        if now < open_time:
            return (open_time - now).total_seconds()

    # 2️⃣ Get next valid trading day
    # We look ahead up to 10 days to cover long weekends
    future_days = nyse.valid_days(start_date=now.date(), end_date=now.date() + timedelta(days=10))

    next_day = None
    for day in future_days:
        if day.to_pydatetime().date() > now.date():
            next_day = day.date()
            break

    if next_day is None:
        # Should never happen, but fallback: wait a day
        return 24 * 3600

    next_schedule = nyse.schedule(start_date=next_day, end_date=next_day).iloc[0]
    next_open = next_schedule["market_open"].tz_convert(nyc)

    return max((next_open - now).total_seconds(), 0)
