from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware # <--- 1. Import this
from fastapi.staticfiles import StaticFiles
import joblib
import pandas as pd
import numpy as np
import shutil
import os
from app.data_loader import load_and_clean_data
from app.forecasting import recursive_forecast_24h, apply_whatif_scenario, calculate_grid_stress

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

# Store latest data for Week 6 & 7 features
latest_df = None
latest_input_features = None
latest_threshold = None

# ... keep the rest of your @app.post and @app.get routes below ...

@app.get("/")
def home():
    status = "Ready" if MODEL_READY else "Model not found. Run model_trainer.py first."
    return {"Project": "Smart Electricity Advisory", "Model_Status": status}

@app.post("/predict-and-advise")
async def predict_and_advise(file: UploadFile = File(...)):
    global latest_df, latest_input_features, latest_threshold
    
    # Save the uploaded file to data folder first
    file_path = os.path.join("data", file.filename)
    try:
        # Read and save the uploaded file
        contents = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as e:
        return {"error": f"Failed to upload file: {str(e)}"}
    
    # 1. Clean the incoming data (Week 2 logic)
    try:
        df, threshold = load_and_clean_data(file.filename)
    except Exception as e:
        return {"error": f"Failed to process file: {str(e)}"}
    
    latest_df = df
    latest_threshold = threshold
    
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
    latest_input_features = input_features

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


# ============ WEEK 6: WHAT-IF SIMULATOR ============

@app.get("/what-if-scenario")
def what_if_scenario(shift_percentage: float = 0):
    """
    Prescriptive Optimization: Simulate shifting Data Center load to off-peak hours.
    
    Formula: New_Load = Predicted_Load - (DataCenter_Load × Shift%)
    
    Args:
        shift_percentage: Percentage of data center load to shift (0-100)
    
    Returns:
        Original vs. New grid stress comparison
    """
    
    if latest_input_features is None or latest_df is None:
        return {"error": "Please run /predict-and-advise first to load data"}
    
    # Get baseline prediction
    baseline_prediction = model.predict(latest_input_features)[0]
    
    # Get current data center load
    current_datacenter_load = latest_df.iloc[-1]['datacenter_load']
    
    # Apply what-if scenario
    load_to_shift = current_datacenter_load * (shift_percentage / 100)
    adjusted_prediction = baseline_prediction - load_to_shift
    
    # Calculate stress for both scenarios
    original_stress = calculate_grid_stress([baseline_prediction])
    new_stress = calculate_grid_stress([adjusted_prediction])
    
    return {
        "original": original_stress,
        "with_shift": new_stress,
        "shift_percentage": shift_percentage,
        "load_shifted_kw": round(load_to_shift, 2),
        "load_reduction_kw": round(baseline_prediction - adjusted_prediction, 2),
        "recommendation": f"Shifting {shift_percentage}% of data center load would reduce stress from {original_stress['status']} to {new_stress['status']}"
    }


# ============ WEEK 7: 24-HOUR MULTI-STEP FORECASTING ============

@app.get("/forecast-24h")
def forecast_24h():
    """
    Recursive Forecasting: Predict grid load for next 24 hours (144 points at 10-min intervals).
    
    Uses recursive approach: predict T+10, then use that prediction as context to predict T+20, etc.
    
    Returns:
        - predictions: List of 144 load values (KW) for next 24 hours
        - stress_metrics: Grid stress analysis for the forecast period
        - timeline: Hour labels for the 24-hour period
    """
    
    if latest_input_features is None or latest_df is None:
        return {"error": "Please run /predict-and-advise first to load data"}
    
    # Get latest data as dict for forecasting function
    latest_data = latest_df.iloc[-1]
    latest_state = {
        'Temperature': latest_data['Temperature'],
        'Humidity': latest_data['Humidity'],
        'hour': pd.to_datetime(latest_data['Datetime']).hour,
        'day_of_week': pd.to_datetime(latest_data['Datetime']).dayofweek,
        'residential_lag': latest_data['residential_load'],
        'datacenter_lag': latest_data['datacenter_load']
    }
    
    # Generate 24-hour recursive forecast (144 points)
    forecast_24h_predictions = recursive_forecast_24h(
        model=model,
        latest_data=latest_state,
        feature_names=feature_names,
        steps=144
    )
    
    # Calculate stress metrics
    stress_metrics = calculate_grid_stress(forecast_24h_predictions)
    
    # Generate timeline labels (every hour for display purposes)
    current_hour = latest_state['hour']
    timeline = []
    for i in range(24):
        hour_label = (current_hour + i) % 24
        timeline.append(f"T+{i}h")
    
    # Create hourly summary (average of 6 points per hour)
    hourly_predictions = []
    for hour in range(24):
        start_idx = hour * 6
        end_idx = (hour + 1) * 6
        average = np.mean(forecast_24h_predictions[start_idx:end_idx])
        hourly_predictions.append(round(average, 2))
    
    return {
        "all_predictions_10m": [round(p, 2) for p in forecast_24h_predictions],
        "hourly_summary": hourly_predictions,
        "stress_metrics": stress_metrics,
        "timeline": timeline,
        "forecast_period": "24 hours (144 x 10-min intervals)"
    }


# ============ MOUNT FRONTEND LAST (after all API routes) ============
# This must be the LAST app mount so API routes are matched first
app.mount("/", StaticFiles(directory="frontend_new/dist", html=True), name="frontend")