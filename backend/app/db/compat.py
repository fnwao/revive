"""Database compatibility layer for Postgres and SQLite."""
import uuid
from sqlalchemy import String, Text, TypeDecorator, JSON
from sqlalchemy.dialects import postgresql
from app.config import settings


def is_sqlite():
    return settings.database_url.startswith("sqlite")


class CompatUUID(TypeDecorator):
    """UUID type that works with both Postgres and SQLite."""
    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(postgresql.UUID(as_uuid=True))
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            return uuid.UUID(str(value))
        return value


class CompatJSONB(TypeDecorator):
    """JSONB type that falls back to JSON/Text for SQLite."""
    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(postgresql.JSONB)
        return dialect.type_descriptor(JSON)

    def process_bind_param(self, value, dialect):
        return value

    def process_result_value(self, value, dialect):
        return value
