from sqlalchemy import DateTime, inspect, text
from sqlalchemy.engine import Engine


def ensure_event_processed_at_column(engine: Engine) -> None:
    inspector = inspect(engine)
    if not inspector.has_table("security_events"):
        return

    columns = {column["name"] for column in inspector.get_columns("security_events")}
    if "processed_at" in columns:
        return

    timestamp_type = DateTime(timezone=True).compile(dialect=engine.dialect)
    with engine.begin() as connection:
        connection.execute(
            text(f"ALTER TABLE security_events ADD COLUMN processed_at {timestamp_type}")
        )
