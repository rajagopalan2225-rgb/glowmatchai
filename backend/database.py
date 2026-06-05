"""
database.py — NO-DATABASE MODE
Uses real SQLAlchemy Base so model class definitions work,
but NO engine or session is created. Everything runs in-memory/mock.
"""
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session
from typing import Optional

# Real Base so model classes (User, Image, etc.) can be defined normally
Base = declarative_base()

# No engine, no session — all None
engine = None
SessionLocal = None
DB_AVAILABLE = False


def get_db():
    """Dependency — always yields None (no DB mode)."""
    yield None
