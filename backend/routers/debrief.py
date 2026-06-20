from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas import PendingDebriefResponse, PendingDebriefEvent, DebriefRequest, DebriefResponse
from db import get_db, Prediction, Debrief

router = APIRouter(prefix="/debrief")


@router.get("/pending", response_model=PendingDebriefResponse)
def pending(db: Session = Depends(get_db)):
    rows = db.query(Prediction).filter(Prediction.has_debrief == False).order_by(
        Prediction.triaged_at.desc()
    ).all()
    events = [
        PendingDebriefEvent(
            event_id=r.event_id,
            event_cause=r.event_cause or "",
            predicted_duration_hours=r.predicted_duration_hours or 0.0,
            eis=r.eis or 0.0,
            triaged_at=r.triaged_at.isoformat() if r.triaged_at else "",
        )
        for r in rows
    ]
    return PendingDebriefResponse(events=events)


@router.post("", response_model=DebriefResponse)
def submit_debrief(req: DebriefRequest, db: Session = Depends(get_db)):
    debrief = Debrief(
        event_id=req.event_id,
        actual_duration_hours=req.actual_duration_hours,
        officers_used=req.officers_used,
        diversion_used=req.diversion_used,
        accuracy_rating=req.accuracy_rating,
        notes=req.notes,
    )
    db.add(debrief)
    # Mark prediction as debriefed
    pred = db.query(Prediction).filter(Prediction.event_id == req.event_id).first()
    if pred:
        pred.has_debrief = True
    db.commit()
    return DebriefResponse(saved=True)
