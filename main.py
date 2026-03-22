from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware # <--- 1. Import this
import joblib
import pandas as pd
import numpy as np
import shutil
import os
from app.data_loader import load_and_clean_data

app = FastAPI()

# 2. Add this block IMMEDIATELY after 'app = FastAPI()'
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # This tells the browser to allow any website to access the API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Load the model (Your Week 3/4 code)
try:
    model = joblib.load('models/electricity_model.pkl')
    feature_names = joblib.load('models/feature_names.pkl')
    MODEL_READY = True
except:
    MODEL_READY = False

# ... keep the rest of your @app.post and @app.get routes below ...

@app.get("/")
def home():
    status = "Ready" if MODEL_READY else "Model not found. Run model_trainer.py first."
    return {"Project": "Smart Electricity Advisory", "Model_Status": status}

@app.post("/predict-and-advise")
async def predict_and_advise(file: UploadFile = File(...)):
    # 1. Clean the incoming data (Week 2 logic)
    df, threshold = load_and_clean_data(file.filename)
    
    # 2. Prepare features for prediction
    # We take the last row of data to predict the next hour
    latest_data = df.iloc[-1]
    input_features = pd.DataFrame([{
        'Temperature': latest_data['Temperature'],
        'Humidity': latest_data['Humidity'],
        'hour': pd.to_datetime(latest_data['Datetime']).hour,
        'day_of_week': pd.to_datetime(latest_data['Datetime']).dayofweek,
        'residential_lag': latest_data['residential_load'],
        'datacenter_lag': latest_data['datacenter_load']
    }])

    # 3. THE PREDICTION
    prediction = model.predict(input_features)[0]

    # 4. ADVISORY LOGIC (Week 4 Focus)
    # We look at 'Feature Importance' to see WHY the AI made this choice
    importances = model.feature_importances_
    top_feature = feature_names[np.argmax(importances)]

    status = "NORMAL"
    advisory = "Grid is stable. Routine operations recommended."
    
    if prediction > threshold:
        status = "CRITICAL STRESS"
        if top_feature == 'Temperature':
            advisory = "ALERT: Predicted peak due to thermal load. Pre-cool Data Center server halls."
        else:
            advisory = "ALERT: Predicted peak due to historical trend. Shift non-critical backups to 2 AM."

    # 5. SUSTAINABILITY SCORECARD
    co2_saved = round((prediction * 0.0005), 2) # Mock calculation: 0.5kg CO2 per KW shifted

    return {
        "prediction_next_hour_kw": round(prediction, 2),
        "grid_status": status,
        "ai_reason": f"High impact from {top_feature}",
        "advisory": advisory,
        "sustainability_impact": f"Action saves approx {co2_saved}kg of CO2"
    }