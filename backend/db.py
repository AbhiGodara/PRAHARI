import json
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, String, Float, Integer, Boolean, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker
from config import SQLITE_FILE

engine = create_engine(f"sqlite:///{SQLITE_FILE}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Prediction(Base):
    __tablename__ = "predictions"

    event_id = Column(String, primary_key=True)
    inputs_json = Column(Text)   # JSON-serialized TriageRequest
    eis = Column(Float)
    predicted_duration_hours = Column(Float)
    closure_probability = Column(Float)
    event_cause = Column(String)
    triaged_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    has_debrief = Column(Boolean, default=False)


class Debrief(Base):
    __tablename__ = "debriefs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String)
    actual_duration_hours = Column(Float)
    officers_used = Column(Integer)
    diversion_used = Column(Boolean)
    accuracy_rating = Column(Integer)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
