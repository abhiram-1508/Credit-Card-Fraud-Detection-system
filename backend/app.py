"""
Flask API server for Credit Card Fraud Detection.
Provides endpoints for predictions, stats, transaction history, and user management.
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
import uuid

app = Flask(__name__, static_folder='../frontend', static_url_path='/static')
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def static_proxy(path):
    return app.send_static_file(path)

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


# ─── Mock Database ──────────────────────────────────────────

# Users with default balance of ₹10,000
users = {
    "user1": {
        "id": "user1",
        "name": "Ananya Sharma",
        "email": "ananya@example.com",
        "password": "password123",
        "account_number": "ACC-8829-1001",
        "balance": 10000.0,
        "role": "user",
        "age": 28,
        "card_age": 2.5
    },
    "user2": {
        "id": "user2",
        "name": "Rahul Verma",
        "email": "rahul@example.com",
        "password": "password123",
        "account_number": "ACC-3341-2002",
        "balance": 10000.0,
        "role": "user",
        "age": 42,
        "card_age": 5.1
    },
    "user3": {
        "id": "user3",
        "name": "Vikram Malhotra",
        "email": "vikram@example.com",
        "password": "password123",
        "account_number": "ACC-5529-3003",
        "balance": 10000.0,
        "role": "user",
        "age": 35,
        "card_age": 1.2
    },
    "admin1": {
        "id": "admin1",
        "name": "System Admin",
        "email": "admin@fraudshield.ai",
        "password": "admin",
        "role": "admin"
    }
}

# Transaction store
recent_transactions = []

def generate_sample_transactions(n=50):
    """Generate sample recent transactions for the dashboard."""
    transactions = []
    user_ids = ["user1", "user2", "user3"]
    cities = [
        "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai",
        "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Surat"
    ]
    
    for i in range(n):
        u_id = random.choice(user_ids)
        user = users[u_id]
        
        is_fraud = random.random() < 0.08
        
        if is_fraud:
            amount = round(random.uniform(2000, 15000), 2)
        else:
            amount = round(random.uniform(50, 5000), 2)
        
        cat_idx = random.choice([7, 8, 9]) if is_fraud else random.choice(range(7))
        
        dt = datetime.now() - timedelta(
            hours=random.randint(0, 72),
            minutes=random.randint(0, 59)
        )
        
        transactions.append({
            'id': f'TXN-{10000 + i}',
            'user_id': u_id,
            'cardholder': user['name'],
            'amount': amount,
            'category': MERCHANT_CATEGORIES[cat_idx],
            'city': random.choice(cities),
            'datetime': dt.strftime('%Y-%m-%d %H:%M:%S'),
            'is_fraud': is_fraud,
            'status': 'Blocked' if is_fraud else 'Completed',
            'confidence': round(random.uniform(0.85, 0.99), 2) if is_fraud else round(random.uniform(0.01, 0.15), 2),
            'card_last4': f'{random.randint(1000,9999)}'
        })
    
    transactions.sort(key=lambda x: x['datetime'], reverse=True)
    return transactions


# ─── Auth Logic ─────────────────────────────────────────────

def get_auth_context():
    """Retrieve user context from simulated auth headers."""
    return {
        'role': request.headers.get('X-User-Role', 'guest'),
        'user_id': request.headers.get('X-User-Id', None)
    }

def is_admin():
    """Check if the current simulated user is an admin."""
    return get_auth_context()['role'] == 'admin'

def is_authorized(target_user_id):
    """Check if the current user is authorized to see target_user_id's data."""
    ctx = get_auth_context()
    return ctx['role'] == 'admin' or ctx['user_id'] == target_user_id


# ─── Helper Functions ───────────────────────────────────────

def run_prediction(features_data):
    """Internal helper to run model prediction."""
    if model is None:
        return None
    
    features = []
    for col in feature_columns:
        features.append(float(features_data.get(col, 0)))
    
    features_array = np.array(features).reshape(1, -1)
    features_scaled = scaler.transform(features_array)
    
    prediction = model.predict(features_scaled)[0]
    probability = model.predict_proba(features_scaled)[0]
    
    return {
        'is_fraud': bool(prediction),
        'fraud_probability': round(float(probability[1]), 4),
        'risk_level': 'HIGH' if probability[1] > 0.7 else 'MEDIUM' if probability[1] > 0.4 else 'LOW'
    }


# ─── API Endpoints ──────────────────────────────────────────

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    for user_id, user in users.items():
        if user['email'] == email and user['password'] == password:
            # In a real app, generate a JWT. Here we just return user info.
            return jsonify({
                'success': True,
                'user': {
                    'id': user['id'],
                    'name': user['name'],
                    'email': user['email'],
                    'role': user['role']
                }
            })
    
    return jsonify({'success': False, 'error': 'Invalid credentials'}), 401


@app.route('/api/user/profile/<user_id>', methods=['GET'])
def get_profile(user_id):
    if user_id not in users:
        return jsonify({'error': 'User not found'}), 404
    
    user = users[user_id].copy()
    user.pop('password')
    return jsonify(user)


@app.route('/api/transaction/create', methods=['POST'])
def create_transaction():
    """Process a new transaction with fraud detection."""
    data = request.get_json()
    user_id = data.get('user_id')
    
    if user_id not in users:
        return jsonify({'error': 'User not found'}), 404
    
    user = users[user_id]
    amount = float(data.get('amount', 0))
    
    if user['balance'] < amount:
        return jsonify({'error': 'Insufficient balance'}), 400
    
    # Prepare features for prediction
    # If UI doesn't provide all ML features, we use defaults or user metadata
    ml_features = {
        'amount': amount,
        'distance_from_home': float(data.get('distance_from_home', random.uniform(1, 50))),
        'transaction_frequency': float(data.get('transaction_frequency', 1)),
        'merchant_risk_score': float(data.get('merchant_risk_score', 0.2)),
        'hour_of_day': datetime.now().hour,
        'day_of_week': datetime.now().weekday(),
        'merchant_category': int(data.get('merchant_category', 0)),
        'cardholder_age': user.get('age', 30),
        'card_age_years': user.get('card_age', 2.0),
        'velocity_24h': float(data.get('velocity_24h', 1)),
        'amount_deviation': float(data.get('amount_deviation', 0.5)),
        'is_international': int(data.get('is_international', 0)),
        'is_online': int(data.get('is_online', 1)),
        'pin_used': int(data.get('pin_used', 1)),
        'time_seconds': (datetime.now() - datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)).total_seconds()
    }
    
    prediction = run_prediction(ml_features)
    is_fraud = prediction['is_fraud'] if prediction else False
    
    txn_id = f'TXN-{random.randint(10000, 99999)}'
    
    new_txn = {
        'id': txn_id,
        'user_id': user_id,
        'cardholder': user['name'],
        'amount': amount,
        'category': MERCHANT_CATEGORIES.get(ml_features['merchant_category'], 'Other'),
        'city': data.get('city', 'Mumbai'),
        'datetime': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'is_fraud': is_fraud,
        'status': 'Blocked' if is_fraud else 'Completed',
        'confidence': prediction['fraud_probability'] if prediction else 0.0,
        'card_last4': '4492'
    }
    
    recent_transactions.insert(0, new_txn)
    
    if not is_fraud:
        user['balance'] -= amount
        return jsonify({
            'success': True,
            'message': 'Transaction successful',
            'transaction': new_txn
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Transaction BLOCKED! Fraudulent activity detected.',
            'transaction': new_txn
        }), 403


@app.route('/api/admin/customers', methods=['GET'])
def get_customers():
    if not is_admin():
        return jsonify({'error': 'Unauthorized! Admin access required.'}), 403

    cust_list = []
    for uid, u in users.items():
        if u['role'] == 'user':
            cust_list.append({
                'id': u['id'],
                'name': u['name'],
                'email': u['email'],
                'account_number': u['account_number'],
                'balance': u['balance']
            })
    return jsonify(cust_list)


@app.route('/api/predict', methods=['POST'])
def predict():
    """Predict if a transaction is fraudulent (Legacy/Standalone)."""
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        data = request.get_json()
        result = run_prediction(data)
        
        # Get feature importance for this prediction
        feature_contributions = {}
        importances = model.feature_importances_
        features = [float(data.get(col, 0)) for col in feature_columns]
        for col, val, imp in zip(feature_columns, features, importances):
            feature_contributions[col] = {
                'value': val,
                'importance': round(float(imp), 4)
            }
        
        result['feature_contributions'] = feature_contributions
        result['legitimate_probability'] = round(1 - result['fraud_probability'], 4)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get dashboard statistics."""
    if metrics is None:
        return jsonify({'error': 'Metrics not loaded'}), 500
    
    user_id = request.args.get('user_id')
    
    # Check if the caller is authorized for this user's stats
    if user_id and not is_authorized(user_id):
         return jsonify({'error': 'Unauthorized! You can only see your own stats.'}), 403

    # Global stats for admin
    if not user_id:
        if not is_admin():
            return jsonify({'error': 'Unauthorized! Global stats require admin access.'}), 403

        base_total = 284808
        base_fraud = 492
        
        # Add session transactions to base
        current_txns = len(recent_transactions)
        current_fraud = len([t for t in recent_transactions if t['is_fraud']])
        
        stats = {
            'total_transactions': base_total + current_txns,
            'fraud_detected': base_fraud + current_fraud,
            'legitimate': base_total - base_fraud + (current_txns - current_fraud),
            'fraud_rate': round((base_fraud + current_fraud) / (base_total + current_txns) * 100, 3),
            'false_alarm_rate': 0.024,
            'model_accuracy': metrics['accuracy'],
            'model_precision': metrics['precision'],
            'model_recall': metrics['recall'],
            'active_cards': 10420,
            'alerts_today': current_fraud + random.randint(2, 5)
        }
    else:
        # User specific stats
        u_txns = [t for t in recent_transactions if t['user_id'] == user_id]
        stats = {
            'total_transactions': len(u_txns),
            'fraud_detected': len([t for t in u_txns if t['is_fraud']]),
            'balance': users[user_id]['balance'],
            'model_accuracy': metrics['accuracy'],
            'alerts_today': len([t for t in u_txns if t['is_fraud'] and 'datetime' in t and t['datetime'].startswith(datetime.now().strftime('%Y-%m-%d'))])
        }
    
    return jsonify(stats)


@app.route('/api/model-info', methods=['GET'])
def model_info():
    """Get model performance metrics."""
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
        'feature_columns': metrics['feature_columns']
    })


@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    """Get recent transactions."""
    global recent_transactions
    if not recent_transactions:
        recent_transactions = generate_sample_transactions(50)
    
    user_id = request.args.get('user_id')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    filter_type = request.args.get('filter', 'all')
    
    # Security: If no user_id or requesting global transactions, check admin
    if not user_id:
        if not is_admin():
            return jsonify({'error': 'Unauthorized! Global history requires admin access.'}), 403
    else:
        # If user_id provided, check if authorized
        if not is_authorized(user_id):
            return jsonify({'error': 'Unauthorized! You can only see your own transactions.'}), 403

    filtered = recent_transactions
    
    if user_id:
        filtered = [t for t in filtered if t['user_id'] == user_id]
    
    if filter_type == 'fraud':
        filtered = [t for t in filtered if t['is_fraud']]
    elif filter_type == 'legitimate':
        filtered = [t for t in filtered if not t['is_fraud']]
    
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
    # Simulating data
    fraud_by_category = {}
    for idx, name in MERCHANT_CATEGORIES.items():
        fraud_by_category[name] = random.randint(2, 80)
    
    fraud_by_hour = [random.randint(2, 40) for _ in range(24)]
    
    return jsonify({
        'fraud_by_category': fraud_by_category,
        'fraud_by_hour': fraud_by_hour,
        'class_distribution': {'legitimate': 284315, 'fraud': 492}
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
