"""
Train a Random Forest model for credit card fraud detection.
Saves the trained model, scaler, and performance metrics.
"""

import pandas as pd
import numpy as np
import joblib
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score, classification_report
)


def train():
    # Load data
    data_path = 'data/credit_card_transactions.csv'
    if not os.path.exists(data_path):
        print("Dataset not found. Run generate_data.py first.")
        return
    
    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} transactions")
    
    # Features and target
    feature_cols = [
        'amount', 'time_seconds', 'distance_from_home', 'transaction_frequency',
        'merchant_risk_score', 'hour_of_day', 'day_of_week', 'merchant_category',
        'cardholder_age', 'card_age_years', 'velocity_24h', 'amount_deviation',
        'is_international', 'is_online', 'pin_used'
    ]
    
    X = df[feature_cols]
    y = df['is_fraud']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Random Forest
    print("Training Random Forest model...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    y_prob = model.predict_proba(X_test_scaled)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc_roc = roc_auc_score(y_test, y_prob)
    cm = confusion_matrix(y_test, y_pred)
    
    print("\n=== Model Performance ===")
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print(f"AUC-ROC:   {auc_roc:.4f}")
    print(f"\nConfusion Matrix:")
    print(cm)
    print(f"\n{classification_report(y_test, y_pred, target_names=['Legitimate', 'Fraud'])}")
    
    # Feature importance
    importances = model.feature_importances_
    feature_importance = dict(zip(feature_cols, importances.tolist()))
    sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
    
    print("\nFeature Importance (Top 10):")
    for feat, imp in sorted_features[:10]:
        print(f"  {feat}: {imp:.4f}")
    
    # Save model and scaler
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/fraud_model.pkl')
    joblib.dump(scaler, 'models/scaler.pkl')
    
    # Save metrics
    metrics = {
        'accuracy': round(accuracy, 4),
        'precision': round(precision, 4),
        'recall': round(recall, 4),
        'f1_score': round(f1, 4),
        'auc_roc': round(auc_roc, 4),
        'confusion_matrix': cm.tolist(),
        'feature_importance': feature_importance,
        'feature_columns': feature_cols,
        'training_samples': len(X_train),
        'test_samples': len(X_test),
        'fraud_ratio': round(y.mean(), 4)
    }
    
    with open('models/metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)
    
    print("\nModel saved to models/fraud_model.pkl")
    print("Scaler saved to models/scaler.pkl")
    print("Metrics saved to models/metrics.json")


if __name__ == '__main__':
    train()
