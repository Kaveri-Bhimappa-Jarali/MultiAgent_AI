from datetime import datetime, timezone
from zoneinfo import ZoneInfo


INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def utc_isoformat(value: datetime) -> str:
    return ensure_utc(value).isoformat()


def format_ist(value: datetime) -> str:
    return ensure_utc(value).astimezone(INDIA_TIMEZONE).strftime(
        "%d %b %Y, %I:%M:%S %p IST"
    )
