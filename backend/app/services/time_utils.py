from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Union


INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")


def ensure_utc(value: Union[datetime, str]) -> datetime:
    if isinstance(value, str):
        cleaned = value.replace("Z", "+00:00")
        try:
            value = datetime.fromisoformat(cleaned)
        except ValueError:
            return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def utc_isoformat(value: Union[datetime, str]) -> str:
    return ensure_utc(value).isoformat()


def format_ist(value: Union[datetime, str]) -> str:
    return ensure_utc(value).astimezone(INDIA_TIMEZONE).strftime(
        "%d %b %Y, %I:%M:%S %p IST"
    )
