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


def ensure_incident_event_unique_constraint(engine: Engine) -> None:
    """
    Applies a unique constraint on (incident_id, event_id) in the incident_events table
    to prevent duplicate event-to-incident linkages at the database level.
    """
    inspector = inspect(engine)
    if not inspector.has_table("incident_events"):
        return

    with engine.begin() as conn:
        # Remove duplicates — keep only the row with the smallest id
        conn.execute(text("""
            DELETE FROM incident_events
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM incident_events
                GROUP BY incident_id, event_id
            )
        """))

        # Create a unique index if it doesn't exist yet (idempotent)
        existing_indexes = {
            idx["name"]
            for idx in inspector.get_indexes("incident_events")
        }
        if "uq_incident_event" not in existing_indexes:
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_incident_event
                ON incident_events (incident_id, event_id)
            """))


def recalculate_incident_event_counts(engine: Engine) -> None:
    """
    Recalculates the event_count on all incidents to match the actual number
    of unique events linked in incident_events (fixes stale/inflated counts).
    """
    if not inspect(engine).has_table("incidents"):
        return

    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE incidents
            SET event_count = (
                SELECT COUNT(*)
                FROM incident_events ie
                WHERE ie.incident_id = incidents.incident_id
            )
        """))
