import json
import numpy as np
import joblib
from sklearn.pipeline import Pipeline
from sklearn.ensemble import HistGradientBoostingRegressor
from config import DURATION_MODEL_FILE, DURATION_METRICS_FILE, MODELS_STORE_DIR
from models.model_utils import make_preprocessor, temporal_split, prepare_X


def train(df):
    # Use only right-censored-excluded rows with valid duration
    trainable = df[df["duration_trainable"]].copy()
    print(f"Duration model: {len(trainable)} trainable rows")

    train_df, test_df = temporal_split(trainable)
    print(f"Train: {len(train_df)}, Test: {len(test_df)}")

    X_train = prepare_X(train_df)
    y_train = np.log1p(train_df["duration_hours"].values)

    X_test = prepare_X(test_df)
    y_test = test_df["duration_hours"].values

    pipeline = Pipeline([
        ("pre", make_preprocessor()),
        ("model", HistGradientBoostingRegressor(random_state=42)),
    ])
    pipeline.fit(X_train, y_train)

    y_pred_log = pipeline.predict(X_test)
    y_pred = np.expm1(y_pred_log)

    mae = float(np.mean(np.abs(y_pred - y_test)))
    rmse = float(np.sqrt(np.mean((y_pred - y_test) ** 2)))
    print(f"Duration model — MAE: {mae:.2f} h, RMSE: {rmse:.2f} h")

    MODELS_STORE_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, DURATION_MODEL_FILE)
    metrics = {"mae_hours": mae, "rmse_hours": rmse,
               "n_train": len(train_df), "n_test": len(test_df)}
    with open(DURATION_METRICS_FILE, "w") as f:
        json.dump(metrics, f)
    print(f"Saved: {DURATION_MODEL_FILE}")
    return pipeline, metrics


if __name__ == "__main__":
    from data_pipeline import load_processed
    df = load_processed()
    train(df)
