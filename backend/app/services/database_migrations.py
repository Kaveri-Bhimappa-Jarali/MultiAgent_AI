from sqlalchemy import DateTime, inspect, text
from sqlalchemy.engine import Engine


def ensure_event_processed_at_column(engine: Engine) -> None:
    ensure_schema_migrations(engine)


def ensure_schema_migrations(engine: Engine) -> None:
    inspector = inspect(engine)

    # 1. security_events: processed_at
    if inspector.has_table("security_events"):
        columns = {column["name"] for column in inspector.get_columns("security_events")}
        if "processed_at" not in columns:
            timestamp_type = DateTime(timezone=True).compile(dialect=engine.dialect)
            with engine.begin() as connection:
                connection.execute(
                    text(f"ALTER TABLE security_events ADD COLUMN processed_at {timestamp_type}")
                )

    # 2. agent_findings: incident_id, source_event_ids
    if inspector.has_table("agent_findings"):
        af_columns = {column["name"] for column in inspector.get_columns("agent_findings")}
        with engine.begin() as connection:
            if "incident_id" not in af_columns:
                connection.execute(text("ALTER TABLE agent_findings ADD COLUMN incident_id VARCHAR(64)"))
            if "source_event_ids" not in af_columns:
                connection.execute(text("ALTER TABLE agent_findings ADD COLUMN source_event_ids JSON DEFAULT '[]'"))

    # 3. incidents: finding_count, participating_agents, correlation_reasons, correlation_window_seconds
    if inspector.has_table("incidents"):
        inc_columns = {column["name"] for column in inspector.get_columns("incidents")}
        with engine.begin() as connection:
            if "finding_count" not in inc_columns:
                connection.execute(text("ALTER TABLE incidents ADD COLUMN finding_count INTEGER DEFAULT 0"))
            if "participating_agents" not in inc_columns:
                connection.execute(text("ALTER TABLE incidents ADD COLUMN participating_agents JSON DEFAULT '[]'"))
            if "correlation_reasons" not in inc_columns:
                connection.execute(text("ALTER TABLE incidents ADD COLUMN correlation_reasons JSON DEFAULT '[]'"))
            if "correlation_window_seconds" not in inc_columns:
                connection.execute(text("ALTER TABLE incidents ADD COLUMN correlation_window_seconds INTEGER DEFAULT 900"))
