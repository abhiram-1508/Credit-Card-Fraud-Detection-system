import sqlite3
import json
import os

DB_PATH = 'users.db'
JSON_PATH = 'data/user_profiles.json'

def setup_db():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"Removed old {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            account_number TEXT NOT NULL,
            balance REAL NOT NULL,
            role TEXT NOT NULL,
            age INTEGER NOT NULL,
            card_age REAL NOT NULL
        )
    ''')

    with open(JSON_PATH, 'r') as f:
        profiles = json.load(f)

    for p in profiles:
        cursor.execute('''
            INSERT INTO users (id, name, email, password, account_number, balance, role, age, card_age)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (p['id'], p['name'], p['email'], p['password'], p['account_number'], p['balance'], p['role'], p['age'], p['card_age']))

    conn.commit()
    conn.close()
    print(f"Successfully inserted {len(profiles)} profiles into {DB_PATH}.")

if __name__ == '__main__':
    setup_db()
