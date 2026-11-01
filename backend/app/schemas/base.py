from datetime import datetime

from pydantic import BaseModel, field_validator

from app.services.time_utils import ensure_utc


class UTCBaseModel(BaseModel):
    @field_validator("*", mode="after")
    @classmethod
    def normalize_datetime_values(cls, value):
        return ensure_utc(value) if isinstance(value, datetime) else value
