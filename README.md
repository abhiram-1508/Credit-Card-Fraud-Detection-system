# FraudShield - Credit Card Fraud Detection System

FraudShield is a modern, end-to-end machine learning application designed to detect fraudulent credit card transactions in real-time. It features a robust Python/Flask backend for reliable predictions and a sleek, interactive frontend dashboard built with HTML, CSS, and vanilla JavaScript.

## 🚀 Features

* **Machine Learning Backend**: Trained `scikit-learn` Random Forest model for high-accuracy transaction classification.
* **Interactive Dashboard**: Modern dark-themed, glassmorphism UI offering real-time analytics.
* **Data Visualization**: Integrated with `Chart.js` for monitoring hourly trends, merchant categories, and fraud probabilities.
* **Transaction Simulator**: Built-in simulator to generate and visualize realistic credit card activity out of the box.
* **One-Click Setup**: Automated `.ps1` script to set up virtual environments, install dependencies, train the model, and launch both the API and the dashboard.

## 📁 Project Structure

```text
CREDIT_CARD_Fraud/
│
├── backend/
│   ├── app.py                 # Main Flask server and API endpoints
│   ├── generate_data.py       # Script to generate synthetic credit card data
│   ├── train_model.py         # Script to train the ML model and output .pkl metrics
│   ├── models/                # Directory where compiled models are saved
│   ├── data/                  # Synthetically generated dataset directory
│   └── requirements.txt       # Python dependencies
│
├── frontend/
│   ├── index.html             # Dashboard UI
│   ├── style.css              # Custom styling (Glassmorphism + Dark Mode)
│   └── app.js                 # Frontend interactions and API data fetching
│
└── run.ps1                    # Windows automation script to start the project
```

## ⚙️ How to Run

### Windows (Recommended)
You can set up and run the entire system with a single command. Open **PowerShell**, navigate to the project directory, and execute:
```powershell
.\run.ps1
```
This script will automatically:
1. Create a Python virtual environment (`.venv`).
2. Install the necessary packages (`flask`, `scikit-learn`, `pandas`, etc.).
3. Generate synthetic data and pre-train the model (if no model is found).
4. Start the Flask Backend on `http://localhost:5000`.
5. Open the Frontend Dashboard in your default web browser.

### Manual Setup (Linux / Mac / Windows)
If you prefer to start it manually:

1. **Set up the virtual environment & install requirements:**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. **Train the initial machine learning model:**
   ```bash
   python train_model.py
   ```
3. **Start the API Server:**
   ```bash
   python app.py
   ```
4. **Launch the Dashboard:**
   Open `frontend/index.html` in your favorite web browser.

## 🛠️ Built With
* **Python** (Flask, Pandas, NumPy, Scikit-Learn)
* **Frontend** (HTML5, CSS3, Vanilla JS, Chart.js)
