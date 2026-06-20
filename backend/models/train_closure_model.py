import json
import numpy as np
import joblib
from sklearn.pipeline import Pipeline
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score
from config import CLOSURE_MODEL_FILE, CLOSURE_METRICS_FILE, MODELS_STORE_DIR
from models.model_utils import make_preprocessor, temporal_split, prepare_X


def train(df):
    data = df.dropna(subset=["requires_road_closure"]).copy()
    print(f"Closure model: {len(data)} rows")

    train_df, test_df = temporal_split(data)
    print(f"Train: {len(train_df)}, Test: {len(test_df)}")

    X_train = prepare_X(train_df, for_closure=True)
    y_train = train_df["requires_road_closure"].astype(int).values

    X_test = prepare_X(test_df, for_closure=True)
    y_test = test_df["requires_road_closure"].astype(int).values

    pipeline = Pipeline([
        ("pre", make_preprocessor()),
        ("model", HistGradientBoostingClassifier(random_state=42)),
    ])
    pipeline.fit(X_train, y_train)

    y_prob = pipeline.predict_proba(X_test)[:, 1]
    auc = float(roc_auc_score(y_test, y_prob))

    # Calibration check: predicted prob vs actual rate in 5 bins
    bins = np.percentile(y_prob, [0, 20, 40, 60, 80, 100])
    cal_check = []
    for i in range(len(bins) - 1):
        mask = (y_prob >= bins[i]) & (y_prob < bins[i+1])
        if mask.sum() > 0:
            cal_check.append({
                "pred_mean": float(y_prob[mask].mean()),
                "actual_rate": float(y_test[mask].mean()),
                "n": int(mask.sum()),
            })
    print(f"Closure model — ROC-AUC: {auc:.3f}")

    MODELS_STORE_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, CLOSURE_MODEL_FILE)
    metrics = {"roc_auc": auc, "calibration": cal_check,
               "n_train": len(train_df), "n_test": len(test_df)}
    with open(CLOSURE_METRICS_FILE, "w") as f:
        json.dump(metrics, f)
    print(f"Saved: {CLOSURE_MODEL_FILE}")
    return pipeline, metrics


if __name__ == "__main__":
    from data_pipeline import load_processed
    df = load_processed()
    train(df)
