"""
Flask API server for Credit Card Fraud Detection.
Provides endpoints for predictions, stats, and transaction history.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import json
import numpy as np
import pandas as pd
import os
from datetime import datetime, timedelta
import random

app = Flask(__name__)
CORS(app)

# Load model, scaler, and metrics
MODEL_PATH = 'models/fraud_model.pkl'
SCALER_PATH = 'models/scaler.pkl'
METRICS_PATH = 'models/metrics.json'
DATA_PATH = 'data/credit_card_transactions.csv'

model = None
scaler = None
metrics = None
feature_columns = None

def load_resources():
    global model, scaler, metrics, feature_columns
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        with open(METRICS_PATH, 'r') as f:
            metrics = json.load(f)
        feature_columns = metrics['feature_columns']
        print("Model and resources loaded successfully.")
    else:
        print("WARNING: Model not found. Run train_model.py first.")


# ─── Merchant category labels ────────────────────────────────
MERCHANT_CATEGORIES = {
    0: "Grocery & Supermarket",
    1: "Gas Station",
    2: "Restaurant & Dining",
    3: "Online Shopping",
    4: "Travel & Airlines",
    5: "Entertainment",
    6: "Electronics",
    7: "Cash Advance",
    8: "Jewelry & Luxury",
    9: "Money Transfer"
}


# ─── Simulated transaction store ────────────────────────────
recent_transactions = []

def generate_sample_transactions(n=50):
    """Generate sample recent transactions for the dashboard."""
    transactions = []
    names = [
        "Alice Johnson", "Bob Smith", "Carlos Rivera", "Diana Chen", "Ethan Brown",
        "Fiona O'Brien", "George Kim", "Hannah Lee", "Ivan Petrov", "Julia Santos",
        "Kevin Wu", "Laura Martinez", "Michael Davis", "Nina Patel", "Oscar Taylor",
        "Patricia Williams", "Quincy Adams", "Rachel Green", "Samuel Jackson", "Tina Turner"
    ]
    cities = [
        "New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
        "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose",
        "London", "Tokyo", "Mumbai", "Sydney", "Toronto"
    ]
    
    for i in range(n):
        is_fraud = random.random() < 0.08
        
        if is_fraud:
            amount = round(random.uniform(200, 15000), 2)
        else:
            amount = round(random.uniform(5, 2000), 2)
        
        cat_idx = random.choice([7, 8, 9]) if is_fraud else random.choice(range(7))
        
        dt = datetime.now() - timedelta(
            hours=random.randint(0, 72),
            minutes=random.randint(0, 59)
        )
        
        transactions.append({
            'id': f'TXN-{10000 + i}',
            'cardholder': random.choice(names),
            'amount': amount,
            'category': MERCHANT_CATEGORIES[cat_idx],
            'city': random.choice(cities),
            'datetime': dt.strftime('%Y-%m-%d %H:%M:%S'),
            'is_fraud': is_fraud,
            'confidence': round(random.uniform(0.85, 0.99), 2) if is_fraud else round(random.uniform(0.01, 0.15), 2),
            'card_last4': f'{random.randint(1000,9999)}'
        })
    
    transactions.sort(key=lambda x: x['datetime'], reverse=True)
    return transactions


# ─── API Endpoints ──────────────────────────────────────────

@app.route('/api/predict', methods=['POST'])
def predict():
    """Predict if a transaction is fraudulent."""
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        data = request.get_json()
        
        features = []
        for col in feature_columns:
            if col not in data:
                return jsonify({'error': f'Missing feature: {col}'}), 400
            features.append(float(data[col]))
        
        features_array = np.array(features).reshape(1, -1)
        features_scaled = scaler.transform(features_array)
        
        prediction = model.predict(features_scaled)[0]
        probability = model.predict_proba(features_scaled)[0]
        
        # Get feature importance for this prediction
        feature_contributions = {}
        importances = model.feature_importances_
        for col, val, imp in zip(feature_columns, features, importances):
            feature_contributions[col] = {
                'value': val,
                'importance': round(float(imp), 4)
            }
        
        result = {
            'is_fraud': bool(prediction),
            'fraud_probability': round(float(probability[1]), 4),
            'legitimate_probability': round(float(probability[0]), 4),
            'risk_level': 'HIGH' if probability[1] > 0.7 else 'MEDIUM' if probability[1] > 0.4 else 'LOW',
            'feature_contributions': feature_contributions
        }
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get dashboard statistics."""
    if metrics is None:
        return jsonify({'error': 'Metrics not loaded'}), 500
    
    # Load transaction data for stats
    total_transactions = 15000
    fraud_count = int(total_transactions * metrics['fraud_ratio'])
    legit_count = total_transactions - fraud_count
    
    stats = {
        'total_transactions': total_transactions,
        'fraud_detected': fraud_count,
        'legitimate': legit_count,
        'fraud_rate': round(metrics['fraud_ratio'] * 100, 2),
        'total_amount_protected': round(random.uniform(2000000, 5000000), 2),
        'model_accuracy': metrics['accuracy'],
        'model_precision': metrics['precision'],
        'model_recall': metrics['recall'],
        'model_f1': metrics['f1_score'],
        'model_auc_roc': metrics['auc_roc'],
        'active_cards': random.randint(8000, 12000),
        'alerts_today': random.randint(5, 25)
    }
    
    return jsonify(stats)


@app.route('/api/model-info', methods=['GET'])
def model_info():
    """Get model performance metrics and feature importance."""
    if metrics is None:
        return jsonify({'error': 'Metrics not loaded'}), 500
    
    return jsonify({
        'accuracy': metrics['accuracy'],
        'precision': metrics['precision'],
        'recall': metrics['recall'],
        'f1_score': metrics['f1_score'],
        'auc_roc': metrics['auc_roc'],
        'confusion_matrix': metrics['confusion_matrix'],
        'feature_importance': metrics['feature_importance'],
        'feature_columns': metrics['feature_columns'],
        'training_samples': metrics['training_samples'],
        'test_samples': metrics['test_samples']
    })


@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    """Get recent transactions."""
    global recent_transactions
    if not recent_transactions:
        recent_transactions = generate_sample_transactions(50)
    
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    filter_type = request.args.get('filter', 'all')
    
    filtered = recent_transactions
    if filter_type == 'fraud':
        filtered = [t for t in recent_transactions if t['is_fraud']]
    elif filter_type == 'legitimate':
        filtered = [t for t in recent_transactions if not t['is_fraud']]
    
    start = (page - 1) * per_page
    end = start + per_page
    
    return jsonify({
        'transactions': filtered[start:end],
        'total': len(filtered),
        'page': page,
        'per_page': per_page,
        'total_pages': (len(filtered) + per_page - 1) // per_page
    })


@app.route('/api/chart-data', methods=['GET'])
def chart_data():
    """Get data for dashboard charts."""
    # Fraud by category
    fraud_by_category = {}
    for idx, name in MERCHANT_CATEGORIES.items():
        if idx >= 7:
            fraud_by_category[name] = random.randint(30, 80)
        else:
            fraud_by_category[name] = random.randint(2, 20)
    
    # Fraud by hour
    fraud_by_hour = []
    for h in range(24):
        if 0 <= h <= 5:
            fraud_by_hour.append(random.randint(15, 40))
        elif 22 <= h <= 23:
            fraud_by_hour.append(random.randint(12, 30))
        else:
            fraud_by_hour.append(random.randint(2, 12))
    
    # Weekly trend (last 7 days)
    weekly_trend = []
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    for d in days:
        weekly_trend.append({
            'day': d,
            'total': random.randint(1800, 2500),
            'fraud': random.randint(8, 35)
        })
    
    # Amount distribution
    amount_ranges = ['$0-50', '$50-200', '$200-500', '$500-1K', '$1K-5K', '$5K+']
    fraud_by_amount = [random.randint(5, 15), random.randint(10, 25), 
                       random.randint(20, 45), random.randint(30, 60),
                       random.randint(40, 70), random.randint(50, 90)]
    
    return jsonify({
        'fraud_by_category': fraud_by_category,
        'fraud_by_hour': fraud_by_hour,
        'weekly_trend': weekly_trend,
        'amount_ranges': amount_ranges,
        'fraud_by_amount': fraud_by_amount
    })


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat()
    })


if __name__ == '__main__':
    load_resources()
    print("\n🚀 Credit Card Fraud Detection API running on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
