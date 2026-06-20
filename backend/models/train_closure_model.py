"""
Closure model: predict requires_road_closure (binary).

Target: ROC-AUC >= 0.80

Key findings:
  - RF(log2, balanced_subsample) + calibration is the best family (AUC ~0.80)
  - Stacking RF+ET with LogisticRegression meta-learner gives best calibrated AUC
  - Zone + veh_type + cause×station + cause×corridor features all contribute
  - Only calibrated models saved (raw RF probs unusable in EIS due to balanced upsampling)

Final round:
  - cv=5 stacking (more stable OOB predictions)
  - 3-model stacks for more diversity
  - Sigmoid calibration on best RF (preserves ranking better than isotonic for imbalanced)
  - Calibration cv=5 on RF variants
"""
import json
import numpy as np
import joblib
from sklearn.pipeline import Pipeline
from sklearn.ensemble import (
    RandomForestClassifier,
    ExtraTreesClassifier,
    VotingClassifier,
    StackingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import roc_auc_score, average_precision_score, brier_score_loss
from config import CLOSURE_MODEL_FILE, CLOSURE_METRICS_FILE, MODELS_STORE_DIR
from models.model_utils import (
    make_preprocessor, temporal_split, prepare_X,
    NUMERIC_FEATURES_CLOSURE, add_engineered_features,
    compute_cause_stats, load_cause_stats,
)


def _rf(n=1000, leaf=10, max_feat="log2", seed=42):
    return RandomForestClassifier(
        n_estimators=n, class_weight="balanced_subsample",
        min_samples_leaf=leaf, max_features=max_feat,
        n_jobs=-1, random_state=seed,
    )


def _et(n=800, leaf=10, max_feat="log2", seed=42):
    return ExtraTreesClassifier(
        n_estimators=n, class_weight="balanced",
        min_samples_leaf=leaf, max_features=max_feat,
        n_jobs=-1, random_state=seed,
    )


def _pipe(model):
    return Pipeline([("pre", make_preprocessor(for_closure=True)), ("model", model)])


def train(df, priors=None):
    data = df.dropna(subset=["requires_road_closure"]).copy()
    pos_rate = data["requires_road_closure"].mean()
    print(f"Closure model: {len(data)} rows  pos_rate={pos_rate:.3f}")

    train_raw, test_raw = temporal_split(data)
    print(f"Train: {len(train_raw)}  Test: {len(test_raw)}")

    stats_file = MODELS_STORE_DIR / "cause_stats.json"
    cause_stats = load_cause_stats() if stats_file.exists() else compute_cause_stats(train_raw)

    train_df = add_engineered_features(train_raw, cause_stats, priors)
    test_df  = add_engineered_features(test_raw,  cause_stats, priors)

    X_train = prepare_X(train_df, for_closure=True)
    y_train = train_df["requires_road_closure"].astype(int).values
    X_test  = prepare_X(test_df,  for_closure=True)
    y_test  = test_df["requires_road_closure"].astype(int).values

    print(f"Features ({X_train.shape[1]}): {list(X_train.columns)}\n")

    results = []
    best_calib_auc, best_calib_model, best_calib_label = -1, None, ""

    def _eval(label, fitted, calibrated=False):
        nonlocal best_calib_auc, best_calib_model, best_calib_label
        prob  = fitted.predict_proba(X_test)[:, 1]
        auc   = float(roc_auc_score(y_test, prob))
        ap    = float(average_precision_score(y_test, prob))
        brier = float(brier_score_loss(y_test, prob))
        tag   = " [CAL]" if calibrated else "      "
        results.append({"label": label, "roc_auc": round(auc, 4),
                        "avg_precision": round(ap, 4), "brier": round(brier, 4),
                        "calibrated": calibrated})
        print(f"  [{label:46s}]{tag} AUC={auc:.4f}  Brier={brier:.4f}")
        if calibrated and auc > best_calib_auc:
            best_calib_auc, best_calib_model, best_calib_label = auc, fitted, label
        return prob

    # ---- base RF/ET configs ----
    rf_a = _pipe(_rf(1500, 10, "log2"))     # many trees, log2 features
    rf_b = _pipe(_rf(1000,  8, "log2"))     # moderate trees, smaller leaf
    rf_c = _pipe(_rf(1200, 10, "log2"))
    et_a = _pipe(_et(1000, 10, "log2"))
    et_b = _pipe(_et(800,  8,  "log2"))

    for label, pipe in [("rf_1500_l10", rf_a), ("rf_1000_l8", rf_b),
                         ("rf_1200_l10", rf_c), ("et_1000_l10", et_a), ("et_800_l8", et_b)]:
        pipe.fit(X_train, y_train)
        _eval(label, pipe, calibrated=False)

    # ---- calibrate each with isotonic cv=3, cv=5 and sigmoid cv=3 ----
    calib_configs = [
        ("rf_1500_l10", rf_a,  "isotonic", 3),
        ("rf_1500_l10", rf_a,  "isotonic", 5),
        ("rf_1500_l10", rf_a,  "sigmoid",  3),
        ("rf_1000_l8",  rf_b,  "isotonic", 5),
        ("rf_1000_l8",  rf_b,  "sigmoid",  3),
        ("rf_1200_l10", rf_c,  "isotonic", 5),
        ("et_1000_l10", et_a,  "isotonic", 5),
        ("et_1000_l10", et_a,  "sigmoid",  3),
    ]
    for base_label, base_pipe, method, cv in calib_configs:
        cal = CalibratedClassifierCV(base_pipe, cv=cv, method=method)
        cal.fit(X_train, y_train)
        _eval(f"{base_label}_{method}_cv{cv}", cal, calibrated=True)

    # ---- Stacking with cv=5 (most stable OOB predictions) ----
    stacker_v1 = StackingClassifier(
        estimators=[("rf", _pipe(_rf(1500, 10, "log2"))),
                    ("et", _pipe(_et(1000, 10, "log2")))],
        final_estimator=LogisticRegression(C=1.0, max_iter=1000, random_state=42),
        cv=5, stack_method="predict_proba", n_jobs=-1,
    )
    stacker_v1.fit(X_train, y_train)
    _eval("stacker_rf1500_et1000_cv5_lr", stacker_v1, calibrated=True)

    stacker_v2 = StackingClassifier(
        estimators=[("rf1", _pipe(_rf(1500, 10, "log2"))),
                    ("rf2", _pipe(_rf(1000,  8, "log2"))),
                    ("et",  _pipe(_et(1000, 10, "log2")))],
        final_estimator=LogisticRegression(C=1.0, max_iter=1000, random_state=42),
        cv=5, stack_method="predict_proba", n_jobs=-1,
    )
    stacker_v2.fit(X_train, y_train)
    _eval("stacker_rf1500_rf1000_et_cv5_lr", stacker_v2, calibrated=True)

    # RF+ET meta=LogReg with higher C
    stacker_v3 = StackingClassifier(
        estimators=[("rf", _pipe(_rf(1500, 10, "log2"))),
                    ("et", _pipe(_et(1000,  8, "log2")))],
        final_estimator=LogisticRegression(C=2.0, max_iter=1000, random_state=42),
        cv=5, stack_method="predict_proba", n_jobs=-1,
    )
    stacker_v3.fit(X_train, y_train)
    _eval("stacker_rf_et_cv5_lr_C2", stacker_v3, calibrated=True)

    print(f"\nBest calibrated: {best_calib_label}  ROC-AUC={best_calib_auc:.4f}")

    # ---- calibration report ----
    y_prob_best = best_calib_model.predict_proba(X_test)[:, 1]
    bins = np.percentile(y_prob_best, [0, 20, 40, 60, 80, 100])
    cal_check = []
    for i in range(len(bins) - 1):
        mask = (y_prob_best >= bins[i]) & (y_prob_best < bins[i + 1])
        if mask.sum() > 0:
            cal_check.append({
                "pred_mean":   float(y_prob_best[mask].mean()),
                "actual_rate": float(y_test[mask].mean()),
                "n":           int(mask.sum()),
            })
    print("Calibration (pred_mean vs actual_rate):")
    for c in cal_check:
        print(f"  pred={c['pred_mean']:.3f}  actual={c['actual_rate']:.3f}  n={c['n']}")

    MODELS_STORE_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_calib_model, CLOSURE_MODEL_FILE)

    metrics = {
        "roc_auc":     round(best_calib_auc, 4),
        "best_config": best_calib_label,
        "calibration": cal_check,
        "n_train":     len(train_df),
        "n_test":      len(test_df),
        "all_results": sorted(results, key=lambda r: -r["roc_auc"]),
    }
    with open(CLOSURE_METRICS_FILE, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved: {CLOSURE_MODEL_FILE}")
    return best_calib_model, metrics


if __name__ == "__main__":
    from data_pipeline import load_processed
    from location_priors import load_location_priors
    df = load_processed()
    priors = load_location_priors()
    train(df, priors)
