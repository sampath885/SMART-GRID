from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.staticfiles import StaticFiles
import joblib
import pandas as pd
import numpy as np
import shutil
import os
from datetime import datetime
from app.data_loader import load_and_clean_data
from app.forecasting import (
    recursive_forecast_24h, 
    apply_whatif_scenario, 
    calculate_grid_stress, 
    calibrate_stress_weights,
    temperature_derated_usable_capacity_kw,
    calculate_sustainability_score,  # NEW: Time-of-use sustainability
    optimize_load_shift_autonomous,  # NEW: Auto-pilot optimizer
    detect_anomalies, 
    calculate_model_confidence
)
from app.kpi_tracker import record_commitment, get_kpi_metrics, get_commitment_history
from app.analysis_viz import build_safety_envelope_payload, build_xai_radar_payload

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    model = joblib.load('models/electricity_model.pkl')
    feature_names = joblib.load('models/feature_names.pkl')
    MODEL_READY = True
except:
    MODEL_READY = False

latest_df = None
latest_input_features = None
latest_threshold = None


def get_historical_total_loads(df: pd.DataFrame) -> list[float]:
    """Return historical total-load series used for stress-weight calibration."""
    total = df["residential_load"] + df["datacenter_load"] + df["industrial_load"]
    return [float(v) for v in total.tolist()]


def evaluate_peak_solar_shift_options(
    load_shifted_kw: float,
    source_hour: int,
    forecast_predictions: list[float],
    temperature_c: float | None = None,
    capacity: float = 100000,
) -> dict:
    """
    Evaluate candidate peak-solar transfer hours (10 AM-4 PM) and choose
    the best balance of CO2 savings and projected source/target hour stress.
    """
    solar_hours = list(range(10, 17))  # 10 AM through 4 PM
    available_capacity = temperature_derated_usable_capacity_kw(capacity, temperature_c)
    options = []

    for shifted_hour in solar_hours:
        sustainability = calculate_sustainability_score(
            load_shifted_kw=load_shifted_kw,
            original_hour=source_hour,
            shifted_hour=shifted_hour,
            duration_hours=1,
        )

        # Map absolute clock hour to the corresponding block in the 24h forecast
        # where block 0 is source_hour and each block contains 6x10-min points.
        hour_offset = (shifted_hour - source_hour) % 24
        start_idx = hour_offset * 6
        end_idx = start_idx + 6
        target_slice = forecast_predictions[start_idx:end_idx]

        baseline_target_avg_kw = (
            float(np.mean(target_slice)) if len(target_slice) == 6 else float(np.mean(forecast_predictions))
        )
        baseline_source_slice = forecast_predictions[0:6]
        baseline_source_avg_kw = (
            float(np.mean(baseline_source_slice))
            if len(baseline_source_slice) == 6
            else float(np.mean(forecast_predictions))
        )

        projected_source_avg_kw = max(0.0, baseline_source_avg_kw - float(load_shifted_kw))
        projected_target_avg_kw = baseline_target_avg_kw + float(load_shifted_kw)
        projected_system_peak_kw = max(projected_source_avg_kw, projected_target_avg_kw)

        projected_source_stress_pct = (
            (projected_source_avg_kw / available_capacity) * 100 if available_capacity > 0 else 0.0
        )
        projected_target_stress_pct = (
            (projected_target_avg_kw / available_capacity) * 100 if available_capacity > 0 else 0.0
        )
        projected_peak_stress_pct = (
            (projected_system_peak_kw / available_capacity) * 100 if available_capacity > 0 else 0.0
        )

        # Effective reduction versus the whole source-hour block (not just shifted slice).
        # This makes slider percentage visibly affect reduction/score in What-If.
        source_emission_factor = float(sustainability["original_emission_factor"])
        source_block_emissions_kg = baseline_source_avg_kw * source_emission_factor
        effective_reduction_pct = (
            (float(sustainability["co2_saved_kg"]) / source_block_emissions_kg) * 100
            if source_block_emissions_kg > 0
            else 0.0
        )
        effective_sustainability_score = min(100.0, max(0.0, 50.0 + (effective_reduction_pct / 2.0)))

        # Penalize hours that push either source or target block above ~90% usable headroom.
        risk_penalty = max(
            0.0,
            max(projected_target_stress_pct, projected_source_stress_pct, projected_peak_stress_pct) - 90.0,
        ) * 10.0
        optimization_score = float(sustainability["co2_saved_kg"]) - risk_penalty

        options.append(
            {
                "shifted_hour": int(shifted_hour),
                "shifted_hour_name": sustainability["shifted_hour_name"],
                "co2_saved_kg": float(sustainability["co2_saved_kg"]),
                "percentage_reduction": round(effective_reduction_pct, 2),
                "sustainability_score": round(effective_sustainability_score, 2),
                "shifted_load_reduction_pct": float(sustainability["percentage_reduction"]),
                "environmental_impact": sustainability["environmental_impact"],
                "message": (
                    f"Shifting {round(load_shifted_kw, 2)} KW from "
                    f"{sustainability['original_hour_name']} to {sustainability['shifted_hour_name']} "
                    f"saves {round(float(sustainability['co2_saved_kg']), 2)} kg CO2."
                ),
                "baseline_source_avg_kw": round(baseline_source_avg_kw, 2),
                "baseline_target_avg_kw": round(baseline_target_avg_kw, 2),
                "projected_source_avg_kw": round(projected_source_avg_kw, 2),
                "projected_target_avg_kw": round(projected_target_avg_kw, 2),
                "projected_source_stress_pct": round(projected_source_stress_pct, 2),
                "projected_target_stress_pct": round(projected_target_stress_pct, 2),
                "projected_peak_stress_pct": round(projected_peak_stress_pct, 2),
                "optimization_score": round(optimization_score, 3),
            }
        )

    best_option = max(
        options,
        key=lambda x: (x["optimization_score"], x["co2_saved_kg"], -x["projected_target_stress_pct"]),
    )

    return {
        "source_hour": int(source_hour),
        "source_hour_name": calculate_sustainability_score(
            load_shifted_kw=0,
            original_hour=source_hour,
            shifted_hour=source_hour,
            duration_hours=1,
        )["original_hour_name"],
        "candidate_hours": solar_hours,
        "best_option": best_option,
        "all_options": options,
    }


@app.get("/")
def home():
    status = "Ready" if MODEL_READY else "Model not found. Run model_trainer.py first."
    return {"Project": "Smart Electricity Advisory", "Model_Status": status}

@app.post("/predict-and-advise")
async def predict_and_advise(file: UploadFile = File(...)):
    global latest_df, latest_input_features, latest_threshold
    
    file_path = os.path.join("data", file.filename)
    try:
        contents = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as e:
        return {"error": f"Failed to upload file: {str(e)}"}
    
    # 1. Clean the incoming data 
    try:
        df, threshold = load_and_clean_data(file.filename)
    except Exception as e:
        return {"error": f"Failed to process file: {str(e)}"}
    
    latest_df = df
    latest_threshold = threshold
    
    # 2. Prepare features for prediction
    latest_data = df.iloc[-1]
    datetime_val = pd.to_datetime(latest_data['Datetime'])
    hour = datetime_val.hour
    
    # Compute all required features (matching model_trainer.py)
    input_features = pd.DataFrame([{
        'Temperature': latest_data['Temperature'],
        'Humidity': latest_data['Humidity'],
        'hour': hour,
        'day_of_week': datetime_val.dayofweek,
        'month': datetime_val.month,
        'day_of_month': datetime_val.day,
        'hour_sin': np.sin(2 * np.pi * hour / 24),
        'hour_cos': np.cos(2 * np.pi * hour / 24),
        'residential_lag_1h': df.iloc[-6]['residential_load'] if len(df) >= 6 else latest_data['residential_load'],
        'residential_lag_2h': df.iloc[-12]['residential_load'] if len(df) >= 12 else latest_data['residential_load'],
        'datacenter_lag_1h': df.iloc[-6]['datacenter_load'] if len(df) >= 6 else latest_data['datacenter_load'],
        'datacenter_lag_2h': df.iloc[-12]['datacenter_load'] if len(df) >= 12 else latest_data['datacenter_load'],
        'industrial_lag_1h': df.iloc[-6]['industrial_load'] if len(df) >= 6 else latest_data['industrial_load'],
        'temp_rolling_3h': df['Temperature'].tail(18).mean(),
        'humidity_rolling_3h': df['Humidity'].tail(18).mean()
    }])
    latest_input_features = input_features

    # 3. THE PREDICTION
    prediction = model.predict(input_features)[0]

    # 4. ADVISORY LOGIC 
    importances = model.feature_importances_
    top_feature = feature_names[np.argmax(importances)]

    current_temp_c = float(latest_data["Temperature"])
    safety_envelope = build_safety_envelope_payload(latest_df, prediction, current_temp_c)
    xai_radar = build_xai_radar_payload(list(feature_names), importances.tolist())

    status = "NORMAL"
    advisory = "Grid is stable. Routine operations recommended."
    
    if prediction > threshold:
        status = "CRITICAL STRESS"
        if top_feature == 'Temperature':
            advisory = "ALERT: Predicted peak due to thermal load. Pre-cool Data Center server halls."
        else:
            advisory = "ALERT: Predicted peak due to historical trend. Shift non-critical backups to 2 AM."

    # 5. DYNAMIC SUSTAINABILITY SCORECARD (SOURCE = NEXT HOUR, TARGET = BEST SOLAR HOUR)
    datacenter_current = float(latest_df.iloc[-1]['datacenter_load'])

    latest_state = {
        'Temperature': latest_data['Temperature'],
        'Humidity': latest_data['Humidity'],
        'hour': hour,
        'day_of_week': datetime_val.dayofweek,
        'month': datetime_val.month,
        'day_of_month': datetime_val.day,
        'residential_lag_1h': df.iloc[-6]['residential_load'] if len(df) >= 6 else latest_data['residential_load'],
        'residential_lag_2h': df.iloc[-12]['residential_load'] if len(df) >= 12 else latest_data['residential_load'],
        'datacenter_lag_1h': df.iloc[-6]['datacenter_load'] if len(df) >= 6 else latest_data['datacenter_load'],
        'datacenter_lag_2h': df.iloc[-12]['datacenter_load'] if len(df) >= 12 else latest_data['datacenter_load'],
        'industrial_lag_1h': df.iloc[-6]['industrial_load'] if len(df) >= 6 else latest_data['industrial_load'],
    }
    forecast_24h_predictions = recursive_forecast_24h(
        model=model,
        latest_data=latest_state,
        feature_names=feature_names,
        steps=144,
    )
    source_hour = (hour + 1) % 24  # Sustainability context aligns with next-hour prediction window
    sustainability_eval = evaluate_peak_solar_shift_options(
        load_shifted_kw=datacenter_current,
        source_hour=source_hour,
        forecast_predictions=forecast_24h_predictions,
        temperature_c=current_temp_c,
    )
    sustainability = sustainability_eval["best_option"]

    return {
        "prediction_next_hour_kw": round(prediction, 2),
        "grid_status": status,
        "ai_reason": f"High impact from {top_feature}",
        "advisory": advisory,
        # NEW: Detailed sustainability metrics
        "sustainability_impact": sustainability['message'],
        "co2_saved_kg": sustainability['co2_saved_kg'],
        "sustainability_score": sustainability['sustainability_score'],
        "environmental_impact": sustainability['environmental_impact'],
        "percentage_reduction": sustainability['percentage_reduction'],
        "sustainability_source_hour": sustainability_eval["source_hour"],
        "sustainability_source_hour_name": sustainability_eval["source_hour_name"],
        "sustainability_best_shift_hour": sustainability["shifted_hour"],
        "sustainability_best_shift_hour_name": sustainability["shifted_hour_name"],
        "sustainability_projected_target_stress_pct": sustainability["projected_target_stress_pct"],
        "sustainability_options_solar_window": sustainability_eval["all_options"],
        # Analysis visualizations (thermal SOA + grouped XAI)
        "safety_envelope": safety_envelope,
        "xai_radar": xai_radar,
        "top_feature": top_feature,
    }


@app.get("/what-if-scenario")
def what_if_scenario(shift_percentage: float = 0):
    """
    Prescriptive Optimization: Simulate shifting Data Center load to off-peak hours.
    
    The model now predicts TOTAL grid load (residential + datacenter + industrial).
    When shifting DC load, we reduce total grid load by that percentage of DC's current contribution.
    
    Formula: 
    - Baseline_Load = Total predicted load (all three zones)
    - Load_to_Shift = DataCenter_Load × (Shift% / 100)
    - New_Load = Baseline_Load - Load_to_Shift
    
    Args:
        shift_percentage: Percentage of data center load to shift (0-100)
    
    Returns:
        Original vs. New grid stress comparison
    """
    
    if latest_input_features is None or latest_df is None:
        return {"error": "Please run /predict-and-advise first to load data"}
    
    # Get baseline prediction (now predicts TOTAL grid load)
    baseline_prediction = model.predict(latest_input_features)[0]
    
    # Get current data center load from the latest data
    current_datacenter_load = latest_df.iloc[-1]['datacenter_load']
    
    # Calculate load to shift (percentage of data center only)
    load_to_shift = current_datacenter_load * (shift_percentage / 100)
    adjusted_prediction = baseline_prediction - load_to_shift
    
    # Calculate stress for both scenarios with temperature-derated capacity + calibrated weights
    current_temp_c = float(latest_df.iloc[-1]["Temperature"])
    calibrated_weights = calibrate_stress_weights(get_historical_total_loads(latest_df))
    original_stress = calculate_grid_stress(
        [baseline_prediction],
        temperature_c=current_temp_c,
        stress_weights=calibrated_weights,
    )
    new_stress_after_shift = calculate_grid_stress(
        [adjusted_prediction],
        temperature_c=current_temp_c,
        stress_weights=calibrated_weights,
    )
    
    # Build recursive forecast context so we can evaluate every peak-solar hour (10 AM-4 PM)
    latest_data = latest_df.iloc[-1]
    datetime_val = pd.to_datetime(latest_data['Datetime'])
    current_hour = datetime_val.hour
    latest_state = {
        'Temperature': latest_data['Temperature'],
        'Humidity': latest_data['Humidity'],
        'hour': current_hour,
        'day_of_week': datetime_val.dayofweek,
        'month': datetime_val.month,
        'day_of_month': datetime_val.day,
        'residential_lag_1h': latest_df.iloc[-6]['residential_load'] if len(latest_df) >= 6 else latest_data['residential_load'],
        'residential_lag_2h': latest_df.iloc[-12]['residential_load'] if len(latest_df) >= 12 else latest_data['residential_load'],
        'datacenter_lag_1h': latest_df.iloc[-6]['datacenter_load'] if len(latest_df) >= 6 else latest_data['datacenter_load'],
        'datacenter_lag_2h': latest_df.iloc[-12]['datacenter_load'] if len(latest_df) >= 12 else latest_data['datacenter_load'],
        'industrial_lag_1h': latest_df.iloc[-6]['industrial_load'] if len(latest_df) >= 6 else latest_data['industrial_load'],
    }
    forecast_24h_predictions = recursive_forecast_24h(
        model=model,
        latest_data=latest_state,
        feature_names=feature_names,
        steps=144,
    )

    source_hour = (current_hour + 1) % 24
    sustainability_eval = evaluate_peak_solar_shift_options(
        load_shifted_kw=float(load_to_shift),
        source_hour=source_hour,
        forecast_predictions=forecast_24h_predictions,
        temperature_c=current_temp_c,
    )
    best_solar_option = sustainability_eval["best_option"]
    
    return {
        # === GRID STRESS ANALYSIS ===
        "original_stress": original_stress,
        "new_stress_after_shift": new_stress_after_shift,
        "shift_percentage": shift_percentage,
        "datacenter_load_current": round(current_datacenter_load, 2),
        "load_shifted_kw": round(load_to_shift, 2),
        "load_reduction_kw": round(baseline_prediction - adjusted_prediction, 2),
        "baseline_total_load": round(baseline_prediction, 2),
        "adjusted_total_load": round(adjusted_prediction, 2),
        
        # === NEW: SUSTAINABILITY IMPACT ===
        "sustainability_metrics": {
            "co2_saved_kg": best_solar_option['co2_saved_kg'],
            "percentage_reduction": best_solar_option['percentage_reduction'],
            "sustainability_score": best_solar_option['sustainability_score'],
            "environmental_impact": best_solar_option['environmental_impact'],
            "message": best_solar_option['message']
        },
        "solar_shift_analysis": sustainability_eval,
        "best_solar_hour": best_solar_option["shifted_hour"],
        "best_solar_hour_name": best_solar_option["shifted_hour_name"],
        "projected_target_stress_pct": best_solar_option["projected_target_stress_pct"],
        
        # === RECOMMENDATIONS ===
        "grid_recommendation": f"Shifting {shift_percentage}% of data center load ({round(load_to_shift, 2)} KW) would change grid stress from {original_stress['status']} to {new_stress_after_shift['status']}",
        "sustainability_recommendation": best_solar_option['message'],
        "combined_advisory": (
            f"✅ Shift {shift_percentage}% toward {best_solar_option['shifted_hour_name']}: "
            f"Projected target stress {best_solar_option['projected_target_stress_pct']}%, "
            f"CO2 reduction {best_solar_option['percentage_reduction']}%"
        ),
    }



@app.get("/forecast-24h")
def forecast_24h():
    """
    Recursive Forecasting: Predict grid load for next 24 hours (144 points at 10-min intervals).
    
    Uses recursive approach: predict T+10, then use that prediction as context to predict T+20, etc.
    
    Returns:
        - predictions: List of 144 load values (KW) for next 24 hours
        - stress_metrics: Grid stress analysis for the forecast period
        - anomalies: Anomaly detection results
        - timeline: Hour labels for the 24-hour period
    """
    
    if latest_input_features is None or latest_df is None:
        return {"error": "Please run /predict-and-advise first to load data"}
    
    # Get latest data as dict for forecasting function
    latest_data = latest_df.iloc[-1]
    datetime_val = pd.to_datetime(latest_data['Datetime'])
    
    latest_state = {
        'Temperature': latest_data['Temperature'],
        'Humidity': latest_data['Humidity'],
        'hour': datetime_val.hour,
        'day_of_week': datetime_val.dayofweek,
        'month': datetime_val.month,
        'day_of_month': datetime_val.day,
        'residential_lag_1h': latest_df.iloc[-6]['residential_load'] if len(latest_df) >= 6 else latest_data['residential_load'],
        'residential_lag_2h': latest_df.iloc[-12]['residential_load'] if len(latest_df) >= 12 else latest_data['residential_load'],
        'datacenter_lag_1h': latest_df.iloc[-6]['datacenter_load'] if len(latest_df) >= 6 else latest_data['datacenter_load'],
        'datacenter_lag_2h': latest_df.iloc[-12]['datacenter_load'] if len(latest_df) >= 12 else latest_data['datacenter_load'],
        'industrial_lag_1h': latest_df.iloc[-6]['industrial_load'] if len(latest_df) >= 6 else latest_data['industrial_load']
    }
    
    # Generate 24-hour recursive forecast 
    forecast_24h_predictions = recursive_forecast_24h(
        model=model,
        latest_data=latest_state,
        feature_names=feature_names,
        steps=144
    )
    
    # Round predictions for consistency (BEFORE calculating metrics)
    forecast_24h_rounded = [round(p, 2) for p in forecast_24h_predictions]
    
    # Calculate stress metrics on rounded values with thermal derating and calibrated weights.
    calibrated_weights = calibrate_stress_weights(get_historical_total_loads(latest_df))
    stress_metrics = calculate_grid_stress(
        forecast_24h_rounded,
        temperature_c=float(latest_data["Temperature"]),
        stress_weights=calibrated_weights,
    )
    
    # Detect anomalies in the forecast
    anomalies = detect_anomalies(forecast_24h_rounded)
    
    # Generate timeline labels
    current_hour = latest_state['hour']
    timeline = []
    for i in range(24):
        hour_label = (current_hour + i) % 24
        timeline.append(f"T+{i}h")
    
    # Create hourly summary (AVERAGE of 6 ten-minute intervals per hour)
    hourly_predictions = []
    for hour in range(24):
        start_idx = hour * 6
        end_idx = (hour + 1) * 6
        average = np.mean(forecast_24h_rounded[start_idx:end_idx])
        hourly_predictions.append(round(average, 2))
    
    return {
        "all_predictions_10m": forecast_24h_rounded,
        "hourly_summary": hourly_predictions,
        "stress_metrics": stress_metrics,
        "anomalies": anomalies,
        "timeline": timeline,
        "forecast_period": "24 hours (144 x 10-min intervals)"
    }


@app.get("/auto-pilot-optimizer")
def auto_pilot_optimizer():
    """
    ===================================
    MULTI-AGENT AUTO-PILOT OPTIMIZER
    ===================================
    
    Autonomously finds the OPTIMAL load shift percentage that:
    1. Keeps grid stress SAFE (< 80%)
    2. Maximizes CO2 savings (Sustainability Score > 90%)
    3. Minimizes economic impact
    
    Uses Pareto Optimization to test 1,000 scenarios and find the best balance.
    
    Returns:
        - optimal_shift_percentage: Best shift amount
        - optimal_grid_stress: Resulting stress level
        - optimal_sustainability: CO2 savings potential
        - alternatives_top_5: Other viable options for comparison
        - recommendation: Auto-pilot advisory message
    """
    
    if latest_input_features is None or latest_df is None:
        return {"error": "Please run /predict-and-advise first to load data"}
    
    # Generate 24-hour baseline forecast
    latest_data = latest_df.iloc[-1]
    datetime_val = pd.to_datetime(latest_data['Datetime'])
    
    latest_state = {
        'Temperature': latest_data['Temperature'],
        'Humidity': latest_data['Humidity'],
        'hour': datetime_val.hour,
        'day_of_week': datetime_val.dayofweek,
        'month': datetime_val.month,
        'day_of_month': datetime_val.day,
        'residential_lag_1h': latest_df.iloc[-6]['residential_load'] if len(latest_df) >= 6 else latest_data['residential_load'],
        'residential_lag_2h': latest_df.iloc[-12]['residential_load'] if len(latest_df) >= 12 else latest_data['residential_load'],
        'datacenter_lag_1h': latest_df.iloc[-6]['datacenter_load'] if len(latest_df) >= 6 else latest_data['datacenter_load'],
        'datacenter_lag_2h': latest_df.iloc[-12]['datacenter_load'] if len(latest_df) >= 12 else latest_data['datacenter_load'],
        'industrial_lag_1h': latest_df.iloc[-6]['industrial_load'] if len(latest_df) >= 6 else latest_data['industrial_load']
    }
    
    # Generate baseline forecast
    baseline_predictions = recursive_forecast_24h(
        model=model,
        latest_data=latest_state,
        feature_names=feature_names,
        steps=144
    )
    
    # Get current datacenter load
    current_datacenter_load = latest_data['datacenter_load']
    current_hour = datetime_val.hour
    
    # Run the auto-pilot optimizer
    optimization_result = optimize_load_shift_autonomous(
        baseline_predictions=baseline_predictions,
        datacenter_load=current_datacenter_load,
        original_hour=current_hour,
        capacity=100000,
        verbose=True
    )
    
    return optimization_result


@app.get("/api/anomalies")
def get_anomalies():
    """
    Analyze load predictions for anomalies.
    
    Uses Isolation Forest to detect unusual patterns that may indicate:
    - Data quality issues
    - Unusual grid conditions
    - Edge cases not seen in training data
    
    Returns:
        - anomaly_analysis: Anomaly detection results
        - model_confidence: Prediction confidence score
        - recommendation: Suggested actions
    """
    
    if latest_input_features is None or latest_df is None:
        return {"error": "Please run /predict-and-advise first to load data"}
    
    # Generate 24-hour forecast for anomaly analysis
    latest_data = latest_df.iloc[-1]
    datetime_val = pd.to_datetime(latest_data['Datetime'])
    
    latest_state = {
        'Temperature': latest_data['Temperature'],
        'Humidity': latest_data['Humidity'],
        'hour': datetime_val.hour,
        'day_of_week': datetime_val.dayofweek,
        'month': datetime_val.month,
        'day_of_month': datetime_val.day,
        'residential_lag_1h': latest_df.iloc[-6]['residential_load'] if len(latest_df) >= 6 else latest_data['residential_load'],
        'residential_lag_2h': latest_df.iloc[-12]['residential_load'] if len(latest_df) >= 12 else latest_data['residential_load'],
        'datacenter_lag_1h': latest_df.iloc[-6]['datacenter_load'] if len(latest_df) >= 6 else latest_data['datacenter_load'],
        'datacenter_lag_2h': latest_df.iloc[-12]['datacenter_load'] if len(latest_df) >= 12 else latest_data['datacenter_load'],
        'industrial_lag_1h': latest_df.iloc[-6]['industrial_load'] if len(latest_df) >= 6 else latest_data['industrial_load']
    }
    
    forecast_predictions = recursive_forecast_24h(
        model=model,
        latest_data=latest_state,
        feature_names=feature_names,
        steps=144
    )
    
    # Detect anomalies
    anomaly_analysis = detect_anomalies(forecast_predictions)
    
    # Calculate model confidence
    baseline_pred = model.predict(latest_input_features)[0]
    confidence = calculate_model_confidence(latest_df, baseline_pred, forecast_predictions)
    
    # Generate recommendation
    if anomaly_analysis['confidence_score'] > 85:
        recommendation = "Model confidence is high. Proceed with predictions and recommendations."
    elif anomaly_analysis['confidence_score'] > 70:
        recommendation = "Model confidence is moderate. Monitor anomalies but predictions are generally reliable."
    else:
        recommendation = "Model confidence is low. Recommended: Review data quality and check assumptions."
    
    return {
        "anomaly_analysis": anomaly_analysis,
        "model_confidence": confidence,
        "recommendation": recommendation,
        "generated_at": datetime.now().isoformat()
    }


@app.post("/api/commit-shift")
async def commit_shift(
    original_load: float,
    optimized_load: float,
    shift_percentage: float,
    grid_status: str = "MODERATE",
    reason: str = "",
    operator_id: str = "System"
):
    """
    Record a load shift commitment to the audit trail.
    
    This endpoint logs when an operator commits to following the AI's recommendation.
    Used for Week 8: Shift Confirmation Module
    
    Args:
        original_load: Load before shift (KW)
        optimized_load: Load after shift (KW)
        shift_percentage: Percentage of load shifted (0-100)
        grid_status: Grid status at commitment (CRITICAL/HIGH/MODERATE/SAFE)
        reason: Why the shift was made
        operator_id: ID of operator making commitment
    
    Returns:
        - commitment: Recorded commitment details
        - kpi_impact: How this affects overall KPIs
    """
    
    # Calculate CO2 saved (0.5 kg per MWh)
    load_shifted_kw = original_load - optimized_load
    
    # NEW: Calculate CO2 saved using time-of-use carbon intensity
    # Assume shift occurs at current hour, optimized for 2 PM (peak solar)
    current_hour = pd.to_datetime(datetime.now()).hour
    sustainability = calculate_sustainability_score(
        load_shifted_kw=load_shifted_kw,
        original_hour=current_hour,
        shifted_hour=14,  # 2 PM - peak solar
        duration_hours=1
    )
    co2_saved = sustainability['co2_saved_kg']
    
    # Record commitment
    commitment = record_commitment(
        original_load_kw=original_load,
        optimized_load_kw=optimized_load,
        shift_percentage=shift_percentage,
        grid_status=grid_status,
        co2_saved_estimate=co2_saved,
        operator_id=operator_id,
        reason=reason
    )
    
    # Get updated KPIs
    kpi_metrics = get_kpi_metrics()
    
    return {
        "success": True,
        "commitment": commitment,
        "sustainability_metrics": {
            "co2_saved_kg": sustainability['co2_saved_kg'],
            "percentage_reduction": sustainability['percentage_reduction'],
            "environmental_impact": sustainability['environmental_impact']
        },
        "updated_kpis": kpi_metrics,
        "message": f"Commitment recorded. CO2 saved: {co2_saved} kg. Total: {kpi_metrics['total_co2_saved_kg']} kg"
    }


@app.get("/api/kpi-metrics")
def get_kpi_dashboard():
    """
    Get current KPI metrics for sustainability dashboard.
    
    Returns real-time metrics for:
    - Total CO2 Saved
    - Total Load Shifted
    - Audit Trail Count
    - Sustainability Progress (% toward Net Zero contribution)
    
    Used for Week 8/9: KPI Dashboard & Sustainability Reporting
    
    Returns:
        - metrics: Current KPI values
        - progress: Sustainability progress tracking
        - audit_trail: Recent commitment entries
    """
    
    kpi_metrics = get_kpi_metrics()
    audit_history = get_commitment_history(limit=5)
    
    return {
        "metrics": {
            "total_commitments": kpi_metrics['total_commitments'],
            "total_co2_saved_kg": kpi_metrics['total_co2_saved_kg'],
            "total_load_shifted_kwh": kpi_metrics['total_load_shifted_kwh'],
            "average_shift_percentage": kpi_metrics['total_reduction_percent'],
            "audit_trail_entries": kpi_metrics['audit_trail_entries']
        },
        "sustainability_progress": {
            "score": kpi_metrics['sustainability_score'],
            "net_zero_contribution": kpi_metrics['net_zero_contribution_percent'],
            "target": "India Net Zero 2070",
            "progress_description": f"{kpi_metrics['sustainability_score']:.1f}% of demo target (1000 kg CO2)"
        },
        "recent_commitments": audit_history,
        "last_update": datetime.now().isoformat()
    }


@app.get("/api/commitment-history")
def get_full_audit_trail(limit: int = 50):
    """
    Get complete commitment audit trail for reporting.
    
    Args:
        limit: Maximum records to return
    
    Returns:
        List of all recorded commitments
    """
    
    return {
        "total_records": len(get_commitment_history(limit=1000)),
        "returned_records": len(get_commitment_history(limit=limit)),
        "audit_trail": get_commitment_history(limit=limit)
    }


app.mount("/", StaticFiles(directory="frontend_new/dist", html=True), name="frontend")