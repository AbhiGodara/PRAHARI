from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas import RetrainResponse
from db import get_db
from learn import retrain_duration_model
from data_pipeline import load_processed

router = APIRouter(prefix="/learn")
_df = None


def get_df():
    global _df
    if _df is None:
        _df = load_processed()
    return _df


@router.post("/retrain", response_model=RetrainResponse)
def retrain(db: Session = Depends(get_db)):
    df = get_df()
    result = retrain_duration_model(db, df)
    return RetrainResponse(**result)
