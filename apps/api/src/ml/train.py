"""
Training Pipeline — Corpus Christi STR Dynamic Pricing

Trains XGBoost/LightGBM models on PricingTrainingExample data.
Tracks experiments with Weights & Biases.
Registers models in MLModel table with artifact storage.
"""

import os
import asyncio
import json
import hashlib
import joblib
import pickle
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, List, Tuple
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
import lightgbm as lgb
from sklearn.model_selection import train_test_split, TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, roc_auc_score
from sklearn.preprocessing import LabelEncoder
import wandb
from prisma import Prisma

# Initialize Prisma client
prisma = Prisma(auto_register=True)


def compute_data_hash(df: pd.DataFrame) -> str:
    """Compute deterministic hash of training data for reproducibility."""
    # Use a sample of the data for hashing (full hash would be slow)
    sample = df.head(10000).to_csv(index=False).encode()
    return hashlib.sha256(sample).hexdigest()[:16]


def prepare_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
    """
    Prepare features for training.
    Returns (X, y_regression, y_classification)
    """
    # Feature columns
    feature_cols = [
        "propertyType",
        "bedrooms",
        "baseRate",
        "dayOfWeek",
        "month",
        "isHoliday",
        "eventMultiplier",
        "occupancyRate14d",
        # "competitorAvgRate",  # Often null, skip for now
    ]
    
    # Categorical encoding
    X = df[feature_cols].copy()
    
    # Encode propertyType
    le = LabelEncoder()
    X["propertyType"] = le.fit_transform(X["propertyType"].astype(str))
    
    # Boolean to int
    X["isHoliday"] = X["isHoliday"].astype(int)
    
    # Fill missing competitor rates with median
    # X["competitorAvgRate"] = X["competitorAvgRate"].fillna(X["competitorAvgRate"].median())
    
    # Targets
    y_reg = df["finalRate"].fillna(0)  # Regression target (0 for unbooked)
    y_clf = df["wasBooked"].astype(int)  # Classification target
    
    return X, y_reg, y_clf


def train_xgboost(
    X_train: pd.DataFrame,
    y_train_reg: pd.Series,
    y_train_clf: pd.Series,
    X_val: pd.DataFrame,
    y_val_reg: pd.Series,
    y_val_clf: pd.Series,
    params: Optional[Dict] = None,
) -> Tuple[xgb.XGBRegressor, xgb.XGBClassifier, Dict]:
    """Train XGBoost regression + classification models."""
    
    default_params = {
        "n_estimators": 500,
        "max_depth": 6,
        "learning_rate": 0.05,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "random_state": 42,
        "n_jobs": -1,
        "early_stopping_rounds": 50,
    }
    if params:
        default_params.update(params)
    
    # Regression model (predict rate)
    reg_model = xgb.XGBRegressor(**default_params, objective="reg:squarederror")
    reg_model.fit(
        X_train, y_train_reg,
        eval_set=[(X_val, y_val_reg)],
        verbose=False,
    )
    
    # Classification model (predict booking probability)
    clf_model = xgb.XGBClassifier(**default_params, objective="binary:logistic")
    clf_model.fit(
        X_train, y_train_clf,
        eval_set=[(X_val, y_val_clf)],
        verbose=False,
    )
    
    # Evaluate
    reg_pred = reg_model.predict(X_val)
    clf_pred = clf_model.predict(X_val)
    clf_proba = clf_model.predict_proba(X_val)[:, 1]
    
    metrics = {
        "regression": {
            "mae": float(mean_absolute_error(y_val_reg, reg_pred)),
            "rmse": float(np.sqrt(mean_squared_error(y_val_reg, reg_pred))),
            "r2": float(r2_score(y_val_reg, reg_pred)),
        },
        "classification": {
            "accuracy": float(accuracy_score(y_val_clf, clf_pred)),
            "auc": float(roc_auc_score(y_val_clf, clf_proba)),
        },
        "feature_importance": dict(zip(X_train.columns, reg_model.feature_importances_.tolist())),
    }
    
    return reg_model, clf_model, metrics


def train_lightgbm(
    X_train: pd.DataFrame,
    y_train_reg: pd.Series,
    y_train_clf: pd.Series,
    X_val: pd.DataFrame,
    y_val_reg: pd.Series,
    y_val_clf: pd.Series,
    params: Optional[Dict] = None,
) -> Tuple[lgb.LGBMRegressor, lgb.LGBMClassifier, Dict]:
    """Train LightGBM regression + classification models."""
    
    default_params = {
        "n_estimators": 500,
        "max_depth": 6,
        "learning_rate": 0.05,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "random_state": 42,
        "n_jobs": -1,
        "verbose": -1,
    }
    if params:
        default_params.update(params)
    
    # Regression
    reg_model = lgb.LGBMRegressor(**default_params, objective="regression")
    reg_model.fit(
        X_train, y_train_reg,
        eval_set=[(X_val, y_val_reg)],
        callbacks=[lgb.early_stopping(50), lgb.log_evaluation(0)],
    )
    
    # Classification
    clf_model = lgb.LGBMClassifier(**default_params, objective="binary")
    clf_model.fit(
        X_train, y_train_clf,
        eval_set=[(X_val, y_val_clf)],
        callbacks=[lgb.early_stopping(50), lgb.log_evaluation(0)],
    )
    
    # Evaluate
    reg_pred = reg_model.predict(X_val)
    clf_pred = clf_model.predict(X_val)
    clf_proba = clf_model.predict_proba(X_val)[:, 1]
    
    metrics = {
        "regression": {
            "mae": float(mean_absolute_error(y_val_reg, reg_pred)),
            "rmse": float(np.sqrt(mean_squared_error(y_val_reg, reg_pred))),
            "r2": float(r2_score(y_val_reg, reg_pred)),
        },
        "classification": {
            "accuracy": float(accuracy_score(y_val_clf, clf_pred)),
            "auc": float(roc_auc_score(y_val_clf, clf_proba)),
        },
        "feature_importance": dict(zip(X_train.columns, reg_model.feature_importances_.tolist())),
    }
    
    return reg_model, clf_model, metrics


async def save_model_artifacts(
    model_name: str,
    version: str,
    reg_model: Any,
    clf_model: Any,
    label_encoder: LabelEncoder,
    feature_cols: List[str],
    metrics: Dict,
    data_hash: str,
    framework: str,
) -> Tuple[str, str]:
    """Save model artifacts to local filesystem (or S3/GCS in production)."""
    
    artifact_dir = Path(f"/tmp/ml_artifacts/{model_name}/{version}")
    artifact_dir.mkdir(parents=True, exist_ok=True)
    
    # Save models
    reg_path = artifact_dir / "regressor.pkl"
    clf_path = artifact_dir / "classifier.pkl"
    encoder_path = artifact_dir / "label_encoder.pkl"
    meta_path = artifact_dir / "metadata.json"
    
    joblib.dump(reg_model, reg_path)
    joblib.dump(clf_model, clf_path)
    joblib.dump(label_encoder, encoder_path)
    
    # Save metadata
    metadata = {
        "model_name": model_name,
        "version": version,
        "framework": framework,
        "feature_columns": feature_cols,
        "metrics": metrics,
        "training_data_hash": data_hash,
        "created_at": datetime.utcnow().isoformat(),
    }
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    
    # Compute artifact hash
    artifact_hash = hashlib.sha256()
    for p in [reg_path, clf_path, encoder_path, meta_path]:
        artifact_hash.update(p.read_bytes())
    artifact_hash = artifact_hash.hexdigest()[:16]
    
    return str(artifact_dir), artifact_hash


async def run_training(
    model_name: str = "corpus-christi-pricing",
    version: Optional[str] = None,
    framework: str = "xgboost",
    lookback_days: int = 730,
    test_size: float = 0.2,
    val_size: float = 0.1,
    hyperparameters: Optional[Dict] = None,
    wandb_project: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main training pipeline.
    """
    # Generate version if not provided
    if version is None:
        version = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    
    # Initialize W&B if project provided
    run = None
    if wandb_project:
        run = wandb.init(
            project=wandb_project,
            name=f"{model_name}-{version}",
            config={
                "model_name": model_name,
                "version": version,
                "framework": framework,
                "lookback_days": lookback_days,
                "test_size": test_size,
                "val_size": val_size,
                "hyperparameters": hyperparameters or {},
            },
            tags=["pricing", "str", "corpus-christi"],
        )
    
    await prisma.connect()
    
    try:
        # Create training run record
        training_run = await prisma.mltrainingrun.create(
            data={
                "modelId": "",  # Will update after model creation
                "hyperparameters": hyperparameters or {},
                "trainDataStart": datetime.utcnow() - timedelta(days=lookback_days),
                "trainDataEnd": datetime.utcnow(),
                "nExamples": 0,  # Will update
                "status": "RUNNING",
            }
        )
        
        # Fetch training data
        print("Fetching training data...")
        examples = await prisma.pricingtrainingexample.find_many(
            where={
                "dataSource": "ACTUAL",
                "stayDate": {
                    "gte": datetime.utcnow() - timedelta(days=lookback_days),
                    "lte": datetime.utcnow(),
                },
            },
            take=50000,  # Limit for memory
        )
        
        if len(examples) < 100:
            raise ValueError(f"Insufficient training data: {len(examples)} examples")
        
        print(f"Loaded {len(examples)} training examples")
        
        # Convert to DataFrame
        df = pd.DataFrame([{
            "id": e.id,
            "propertyType": e.propertyType,
            "bedrooms": e.bedrooms,
            "baseRate": float(e.baseRate),
            "dayOfWeek": e.dayOfWeek,
            "month": e.month,
            "isHoliday": e.isHoliday,
            "eventMultiplier": float(e.eventMultiplier),
            "occupancyRate14d": float(e.occupancyRate14d),
            "wasBooked": e.wasBooked,
            "finalRate": float(e.finalRate) if e.finalRate else 0,
            "revenue": float(e.revenue) if e.revenue else 0,
        } for e in examples])
        
        # Update training run with example count
        await prisma.mltrainingrun.update(
            where={"id": training_run.id},
            data={"nExamples": len(df)}
        )
        
        # Prepare features
        X, y_reg, y_clf = prepare_features(df)
        feature_cols = X.columns.tolist()
        
        # Time-series split (chronological)
        split_idx = int(len(df) * (1 - test_size - val_size))
        val_split_idx = int(len(df) * (1 - test_size))
        
        X_train = X.iloc[:split_idx]
        y_train_reg = y_reg.iloc[:split_idx]
        y_train_clf = y_clf.iloc[:split_idx]
        
        X_val = X.iloc[split_idx:val_split_idx]
        y_val_reg = y_reg.iloc[split_idx:val_split_idx]
        y_val_clf = y_clf.iloc[split_idx:val_split_idx]
        
        X_test = X.iloc[val_split_idx:]
        y_test_reg = y_reg.iloc[val_split_idx:]
        y_test_clf = y_clf.iloc[val_split_idx:]
        
        print(f"Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")
        
        # Train model
        print(f"Training {framework} model...")
        if framework == "xgboost":
            reg_model, clf_model, metrics = train_xgboost(
                X_train, y_train_reg, y_train_clf,
                X_val, y_val_reg, y_val_clf,
                hyperparameters,
            )
        elif framework == "lightgbm":
            reg_model, clf_model, metrics = train_lightgbm(
                X_train, y_train_reg, y_train_clf,
                X_val, y_val_reg, y_val_clf,
                hyperparameters,
            )
        else:
            raise ValueError(f"Unknown framework: {framework}")
        
        # Test evaluation
        test_reg_pred = reg_model.predict(X_test)
        test_clf_pred = clf_model.predict(X_test)
        test_clf_proba = clf_model.predict_proba(X_test)[:, 1]
        
        test_metrics = {
            "regression": {
                "mae": float(mean_absolute_error(y_test_reg, test_reg_pred)),
                "rmse": float(np.sqrt(mean_squared_error(y_test_reg, test_reg_pred))),
                "r2": float(r2_score(y_test_reg, test_reg_pred)),
            },
            "classification": {
                "accuracy": float(accuracy_score(y_test_clf, test_clf_pred)),
                "auc": float(roc_auc_score(y_test_clf, test_clf_proba)),
            },
        }
        
        metrics["test"] = test_metrics
        
        print(f"Validation metrics: {metrics}")
        print(f"Test metrics: {test_metrics}")
        
        # Save artifacts
        artifact_path, artifact_hash = await save_model_artifacts(
            model_name, version, reg_model, clf_model, None, feature_cols, metrics, 
            compute_data_hash(df), framework
        )
        
        # Create or update MLModel
        existing_model = await prisma.mlmodel.find_first(
            where={"name": model_name, "version": version}
        )
        
        if existing_model:
            model = await prisma.mlmodel.update(
                where={"id": existing_model.id},
                data={
                    "framework": framework,
                    "artifactPath": artifact_path,
                    "artifactHash": artifact_hash,
                    "metrics": {**metrics, **test_metrics},
                    "trainingDataHash": compute_data_hash(df),
                    "status": "STAGING",
                }
            )
        else:
            model = await prisma.mlmodel.create(
                data={
                    "name": model_name,
                    "version": version,
                    "framework": framework,
                    "artifactPath": artifact_path,
                    "artifactHash": artifact_hash,
                    "metrics": {**metrics, **test_metrics},
                    "trainingDataHash": compute_data_hash(df),
                    "status": "STAGING",
                }
            )
        
        # Update training run
        await prisma.mltrainingrun.update(
            where={"id": training_run.id},
            data={
                "modelId": model.id,
                "metrics": metrics,
                "featureImportance": metrics.get("feature_importance", {}),
                "status": "COMPLETED",
                "completedAt": datetime.utcnow(),
            }
        )
        
        # Log to W&B
        if run:
            run.log({
                "val/mae": metrics["regression"]["mae"],
                "val/rmse": metrics["regression"]["rmse"],
                "val/r2": metrics["regression"]["r2"],
                "val/accuracy": metrics["classification"]["accuracy"],
                "val/auc": metrics["classification"]["auc"],
                "test/mae": test_metrics["regression"]["mae"],
                "test/rmse": test_metrics["regression"]["rmse"],
                "test/r2": test_metrics["regression"]["r2"],
                "test/accuracy": test_metrics["classification"]["accuracy"],
                "test/auc": test_metrics["classification"]["auc"],
            })
            
            # Log feature importance
            if "feature_importance" in metrics:
                for feat, imp in metrics["feature_importance"].items():
                    run.log({f"feature_importance/{feat}": imp})
            
            # Save model as artifact
            artifact = wandb.Artifact(f"{model_name}-{version}", type="model")
            artifact.add_dir(artifact_path)
            run.log_artifact(artifact)
            
            run.finish()
        
        return {
            "status": "success",
            "model_id": model.id,
            "model_name": model_name,
            "version": version,
            "metrics": metrics,
            "test_metrics": test_metrics,
            "artifact_path": artifact_path,
            "artifact_hash": artifact_hash,
        }
        
    except Exception as e:
        # Update training run with error
        await prisma.mltrainingrun.update(
            where={"id": training_run.id},
            data={
                "status": "FAILED",
                "errorMessage": str(e),
                "completedAt": datetime.utcnow(),
            }
        )
        
        if run:
            run.log({"error": str(e)})
            run.finish()
        
        raise
        
    finally:
        await prisma.disconnect()


async def main():
    """CLI entry point."""
    import argparse
    parser = argparse.ArgumentParser(description="Train pricing ML model")
    parser.add_argument("--model-name", type=str, default="corpus-christi-pricing")
    parser.add_argument("--version", type=str, default=None)
    parser.add_argument("--framework", type=str, choices=["xgboost", "lightgbm"], default="xgboost")
    parser.add_argument("--lookback-days", type=int, default=730)
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--val-size", type=float, default=0.1)
    parser.add_argument("--wandb-project", type=str, default=None)
    parser.add_argument("--hyperparameters", type=str, default=None, help="JSON string")
    args = parser.parse_args()
    
    hyperparams = json.loads(args.hyperparameters) if args.hyperparameters else None
    
    result = await run_training(
        model_name=args.model_name,
        version=args.version,
        framework=args.framework,
        lookback_days=args.lookback_days,
        test_size=args.test_size,
        val_size=args.val_size,
        hyperparameters=hyperparams,
        wandb_project=args.wandb_project,
    )
    
    print(f"Training complete: {json.dumps(result, indent=2, default=str)}")


if __name__ == "__main__":
    asyncio.run(main())