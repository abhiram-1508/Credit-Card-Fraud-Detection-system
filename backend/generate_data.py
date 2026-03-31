"""
Generate synthetic credit card transaction data for fraud detection.
Creates a realistic dataset with features mimicking real-world transactions.
"""

import numpy as np
import pandas as pd
import os

np.random.seed(42)

def generate_dataset(n_samples=10000, fraud_ratio=0.05):
    """Generate synthetic credit card transaction data."""
    
    n_fraud = int(n_samples * fraud_ratio)
    n_legit = n_samples - n_fraud

    # --- Legitimate Transactions ---
    legit_amount = np.random.lognormal(mean=3.5, sigma=1.2, size=n_legit)
    legit_amount = np.clip(legit_amount, 1, 5000)
    
    legit_time = np.random.uniform(0, 172800, size=n_legit)  # 48 hours in seconds
    
    legit_distance = np.random.exponential(scale=15, size=n_legit)
    legit_distance = np.clip(legit_distance, 0, 200)
    
    legit_frequency = np.random.poisson(lam=3, size=n_legit)
    
    legit_merchant_risk = np.random.beta(2, 8, size=n_legit)
    
    legit_hour = np.random.choice(range(24), size=n_legit, 
                                   p=[0.01, 0.01, 0.01, 0.01, 0.02, 0.03, 
                                      0.05, 0.07, 0.08, 0.08, 0.07, 0.06,
                                      0.06, 0.06, 0.05, 0.05, 0.05, 0.05,
                                      0.04, 0.04, 0.03, 0.03, 0.02, 0.02])
    
    legit_day = np.random.choice(range(7), size=n_legit)
    
    legit_category = np.random.choice(range(10), size=n_legit,
                                       p=[0.20, 0.15, 0.15, 0.12, 0.10,
                                          0.08, 0.07, 0.05, 0.05, 0.03])
    
    legit_age = np.random.normal(loc=40, scale=12, size=n_legit)
    legit_age = np.clip(legit_age, 18, 85)
    
    legit_card_age = np.random.exponential(scale=3, size=n_legit)
    legit_card_age = np.clip(legit_card_age, 0.1, 20)
    
    legit_velocity_24h = np.random.poisson(lam=2, size=n_legit)
    legit_amount_deviation = np.random.normal(loc=0, scale=0.5, size=n_legit)
    legit_is_international = np.random.choice([0, 1], size=n_legit, p=[0.92, 0.08])
    legit_is_online = np.random.choice([0, 1], size=n_legit, p=[0.60, 0.40])
    legit_pin_used = np.random.choice([0, 1], size=n_legit, p=[0.30, 0.70])

    # --- Fraudulent Transactions ---
    fraud_amount = np.random.lognormal(mean=5.5, sigma=1.5, size=n_fraud)
    fraud_amount = np.clip(fraud_amount, 50, 25000)
    
    fraud_time = np.random.uniform(0, 172800, size=n_fraud)
    
    fraud_distance = np.random.exponential(scale=80, size=n_fraud)
    fraud_distance = np.clip(fraud_distance, 10, 1000)
    
    fraud_frequency = np.random.poisson(lam=8, size=n_fraud)
    
    fraud_merchant_risk = np.random.beta(6, 3, size=n_fraud)
    
    fraud_hour = np.random.choice(range(24), size=n_fraud,
                                   p=[0.08, 0.08, 0.09, 0.08, 0.06, 0.04,
                                      0.03, 0.02, 0.02, 0.02, 0.02, 0.03,
                                      0.03, 0.03, 0.03, 0.03, 0.03, 0.03,
                                      0.03, 0.04, 0.04, 0.04, 0.05, 0.05])
    
    fraud_day = np.random.choice(range(7), size=n_fraud)
    
    fraud_category = np.random.choice(range(10), size=n_fraud,
                                       p=[0.05, 0.05, 0.05, 0.05, 0.08,
                                          0.10, 0.12, 0.15, 0.15, 0.20])
    
    fraud_age = np.random.normal(loc=35, scale=15, size=n_fraud)
    fraud_age = np.clip(fraud_age, 18, 85)
    
    fraud_card_age = np.random.exponential(scale=1.5, size=n_fraud)
    fraud_card_age = np.clip(fraud_card_age, 0.1, 20)
    
    fraud_velocity_24h = np.random.poisson(lam=7, size=n_fraud)
    fraud_amount_deviation = np.random.normal(loc=3, scale=1.5, size=n_fraud)
    fraud_is_international = np.random.choice([0, 1], size=n_fraud, p=[0.50, 0.50])
    fraud_is_online = np.random.choice([0, 1], size=n_fraud, p=[0.20, 0.80])
    fraud_pin_used = np.random.choice([0, 1], size=n_fraud, p=[0.85, 0.15])

    # --- Combine into DataFrame ---
    data = {
        'amount': np.concatenate([legit_amount, fraud_amount]),
        'time_seconds': np.concatenate([legit_time, fraud_time]),
        'distance_from_home': np.concatenate([legit_distance, fraud_distance]),
        'transaction_frequency': np.concatenate([legit_frequency, fraud_frequency]),
        'merchant_risk_score': np.concatenate([legit_merchant_risk, fraud_merchant_risk]),
        'hour_of_day': np.concatenate([legit_hour, fraud_hour]),
        'day_of_week': np.concatenate([legit_day, fraud_day]),
        'merchant_category': np.concatenate([legit_category, fraud_category]),
        'cardholder_age': np.concatenate([legit_age, fraud_age]),
        'card_age_years': np.concatenate([legit_card_age, fraud_card_age]),
        'velocity_24h': np.concatenate([legit_velocity_24h, fraud_velocity_24h]),
        'amount_deviation': np.concatenate([legit_amount_deviation, fraud_amount_deviation]),
        'is_international': np.concatenate([legit_is_international, fraud_is_international]),
        'is_online': np.concatenate([legit_is_online, fraud_is_online]),
        'pin_used': np.concatenate([legit_pin_used, fraud_pin_used]),
        'is_fraud': np.concatenate([np.zeros(n_legit), np.ones(n_fraud)])
    }

    df = pd.DataFrame(data)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    return df


if __name__ == '__main__':
    print("Generating synthetic credit card transaction data...")
    df = generate_dataset(n_samples=15000, fraud_ratio=0.06)
    
    os.makedirs('data', exist_ok=True)
    df.to_csv('data/credit_card_transactions.csv', index=False)
    
    print(f"Dataset generated: {len(df)} transactions")
    print(f"  Legitimate: {len(df[df['is_fraud'] == 0])}")
    print(f"  Fraudulent: {len(df[df['is_fraud'] == 1])}")
    print(f"  Fraud ratio: {df['is_fraud'].mean():.2%}")
    print(f"Saved to data/credit_card_transactions.csv")
