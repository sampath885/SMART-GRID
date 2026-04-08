import pandas as pd
import numpy as np
from typing import List, Dict
from sklearn.ensemble import IsolationForest

def recursive_forecast_24h(
    model, 
    latest_data: Dict,
    feature_names: List[str],
    steps: int = 144  
) -> List[float]:
    """
    Recursively forecast load for the next 24 hours.
    
    The model predicts T+10 min, then uses that prediction as context to predict T+20 min, etc.
    
    Args:
        model: Trained RandomForest model
        latest_data: Dictionary with latest values including Temperature, Humidity, hour, etc.
        feature_names: List of feature column names in correct order
        steps: Number of 10-min steps to forecast (default 144 = 24 hours)
    
    Returns:
        List of predictions for next 24 hours
    """
    
    predictions = []
    current_state = latest_data.copy()
    
    # Initialize rolling windows for temperature and humidity
    temp_window = [current_state.get('Temperature', 20)] * 18
    humidity_window = [current_state.get('Humidity', 50)] * 18
    
    # Initialize lag windows (6 lags = 1 hour, 12 lags = 2 hours)
    residential_window = [current_state.get('residential_lag_1h', 25000)] * 12
    datacenter_window = [current_state.get('datacenter_lag_1h', 15000)] * 12
    industrial_window = [current_state.get('industrial_lag_1h', 15000)] * 12
    
    # Calculate the initial proportions of each load type
    # These are used to decompose total predictions back into components
    initial_residential = current_state.get('residential_lag_1h', 25000)
    initial_datacenter = current_state.get('datacenter_lag_1h', 15000)
    initial_industrial = current_state.get('industrial_lag_1h', 15000)
    initial_total = initial_residential + initial_datacenter + initial_industrial
    
    # Prevent division by zero
    if initial_total == 0:
        initial_total = 1
    
    residential_proportion = initial_residential / initial_total
    datacenter_proportion = initial_datacenter / initial_total
    industrial_proportion = initial_industrial / initial_total
    
    for step in range(steps):
        hour = current_state.get('hour', 12)
        
        # Create all 15 features
        features_dict = {
            'Temperature': current_state.get('Temperature', 20),
            'Humidity': current_state.get('Humidity', 50),
            'hour': hour,
            'day_of_week': current_state.get('day_of_week', 0),
            'month': current_state.get('month', 1),
            'day_of_month': current_state.get('day_of_month', 1),
            'hour_sin': np.sin(2 * np.pi * hour / 24),
            'hour_cos': np.cos(2 * np.pi * hour / 24),
            'residential_lag_1h': residential_window[0],
            'residential_lag_2h': residential_window[6] if len(residential_window) > 6 else residential_window[0],
            'datacenter_lag_1h': datacenter_window[0],
            'datacenter_lag_2h': datacenter_window[6] if len(datacenter_window) > 6 else datacenter_window[0],
            'industrial_lag_1h': industrial_window[0],
            'temp_rolling_3h': np.mean(temp_window[-18:]),
            'humidity_rolling_3h': np.mean(humidity_window[-18:])
        }
        
        # Create DataFrame with features in correct order
        features = pd.DataFrame([
            [features_dict[name] for name in feature_names]
        ], columns=feature_names)
        
        # Predict next 10-min interval (TOTAL load)
        next_total_prediction = model.predict(features)[0]
        predictions.append(next_total_prediction)
        
        # Decompose total prediction back into individual components
        # using the proportions from the initial state
        pred_residential = next_total_prediction * residential_proportion
        pred_datacenter = next_total_prediction * datacenter_proportion
        pred_industrial = next_total_prediction * industrial_proportion
        
        # Update all three lag windows with their decomposed values
        residential_window.pop()
        residential_window.insert(0, pred_residential)
        
        datacenter_window.pop()
        datacenter_window.insert(0, pred_datacenter)
        
        industrial_window.pop()
        industrial_window.insert(0, pred_industrial)
        
        # Temperature and humidity stay mostly constant in forecast (smoother progression)
        temp_window.pop()
        temp_window.insert(0, current_state.get('Temperature', 20))
        humidity_window.pop()
        humidity_window.insert(0, current_state.get('Humidity', 50))
        
        # Update hour every 6 steps (60 minutes)
        if (step + 1) % 6 == 0:
            current_state['hour'] = (current_state['hour'] + 1) % 24
            if current_state['hour'] == 0:
                current_state['day_of_week'] = (current_state['day_of_week'] + 1) % 7
                current_state['day_of_month'] = (current_state.get('day_of_month', 1) % 28) + 1
    
    return predictions


def apply_whatif_scenario(
    original_predictions: List[float],
    datacenter_load: float,
    shift_percentage: float
) -> List[float]:
    """
    Apply a "what-if" scenario to load predictions.
    
    Simulates shifting a percentage of data center load to off-peak hours.
    
    Args:
        original_predictions: List of predicted load values (KW)
        datacenter_load: Current data center load (KW)
        shift_percentage: Percentage of data center load to shift (0-100)
    
    Returns:
        List of adjusted predictions
    """
    
    if shift_percentage < 0 or shift_percentage > 100:
        return original_predictions
    
    # Calculate the load to shift
    load_to_shift = datacenter_load * (shift_percentage / 100)
    
    
    adjusted = []
    for idx, pred in enumerate(original_predictions):
        hour_index = (idx // 6) % 24  
        
        if 8 <= hour_index <= 20:
            # Reduce load during peak
            adjusted_load = pred - (load_to_shift / 13)  
        else:
            adjusted_load = pred + (load_to_shift / 11)  # 11 off-peak hours
        
        adjusted.append(max(adjusted_load, 0))
    
    return adjusted


def calculate_grid_stress(loads: List[float], capacity: float = 100000) -> Dict:
    """
    Calculate grid stress metrics from load predictions.
    Uses reserve margin and combined peak/average stress for more realistic assessment.
    
    Args:
        loads: List of predicted loads (KW)
        capacity: Grid capacity (default 100,000 KW)
    
    Returns:
        Dictionary with stress metrics
    """
    
    max_load = max(loads)
    avg_load = np.mean(loads)
    min_load = min(loads)
    
    # Apply 10% reserve buffer (only 90% of capacity is usable)
    available_capacity = capacity * 0.90
    
    # Calculate individual stress percentages
    peak_stress = (max_load / available_capacity) * 100
    avg_stress = (avg_load / available_capacity) * 100
    
    # Combine metrics: 70% weight on peak (immediate concern), 30% on average (trend)
    combined_stress = (0.7 * peak_stress) + (0.3 * avg_stress)
    
    # Determine status with refined thresholds
    if combined_stress > 95:
        status = "CRITICAL STRESS"
    elif combined_stress > 85:
        status = "HIGH STRESS"
    elif combined_stress > 70:
        status = "MODERATE STRESS"
    elif combined_stress > 50:
        status = "CAUTION"
    else:
        status = "SAFE"
    
    return {
        'max_load': round(max_load, 2),
        'avg_load': round(avg_load, 2),
        'min_load': round(min_load, 2),
        'peak_stress': round(peak_stress, 2),
        'avg_stress': round(avg_stress, 2),
        'combined_stress': round(combined_stress, 2),
        'status': status
    }


def detect_anomalies(
    predictions: List[float],
    historical_data: List[float] = None,
    contamination: float = 0.1
) -> Dict:
    """
    Detect anomalies in load predictions using Isolation Forest.
    
    Args:
        predictions: List of predicted load values (KW)
        historical_data: Optional historical data for context (for training)
        contamination: Expected proportion of anomalies (default 0.1 = 10%)
    
    Returns:
        Dictionary with anomaly analysis including:
        - anomaly_flags: Binary list (1 = anomaly, -1 = normal)
        - anomaly_scores: Anomaly scores (-1.0 to 1.0, higher = more anomalous)
        - anomalies_detected: Count of anomalies found
        - confidence_score: Model confidence (0-100)
        - anomaly_hours: List of hour indices flagged as anomalies
        - anomaly_explanation: Human-readable reasoning
    """
    
    predictions_array = np.array(predictions).reshape(-1, 1)
    
    # Train Isolation Forest
    iso_forest = IsolationForest(
        contamination=contamination,
        random_state=42,
        n_estimators=100
    )
    
    # Fit the model on the predictions
    iso_forest.fit(predictions_array)
    
    # Predict anomalies
    anomaly_flags = iso_forest.predict(predictions_array)  # 1 = normal, -1 = anomaly
    anomaly_scores = iso_forest.score_samples(predictions_array)  # Higher = more anomalous
    
    # Calculate metrics
    anomalies_detected = np.sum(anomaly_flags == -1)
    anomaly_indices = list(np.where(anomaly_flags == -1)[0])
    
    # Calculate model confidence (% of points that are NOT anomalies)
    confidence_score = ((len(predictions) - anomalies_detected) / len(predictions)) * 100
    
    # Convert to 0-based for hour labels
    anomaly_hours = [(idx // 6) % 24 for idx in anomaly_indices]
    
    # Generate explanation
    if anomalies_detected == 0:
        explanation = "All load predictions are within normal range. Grid pattern appears stable."
    elif anomalies_detected <= 2:
        explanation = f"Minor anomalies detected in {anomalies_detected} time periods. Consider monitoring but not critical."
    else:
        explanation = f"Significant anomalies detected in {anomalies_detected} periods. Recommend manual review of load assumptions."
    
    return {
        'anomaly_flags': [int(f) for f in anomaly_flags.tolist()],  # 1 = normal, -1 = anomaly
        'anomaly_scores': [round(float(score), 3) for score in anomaly_scores],
        'anomalies_detected': int(anomalies_detected),
        'total_periods_analyzed': int(len(predictions)),
        'confidence_score': float(round(confidence_score, 2)),
        'anomaly_indices': [int(idx) for idx in anomaly_indices],
        'anomaly_hours': sorted(list(set([int(h) for h in anomaly_hours]))),  # Unique hours
        'explanation': explanation
    }


def calculate_model_confidence(
    latest_df: pd.DataFrame,
    baseline_prediction: float,
    forecast_predictions: List[float]
) -> Dict:
    """
    Calculate model confidence score based on data consistency and pattern stability.
    
    Args:
        latest_df: Latest data frame with historical loads
        baseline_prediction: Single prediction for next hour
        forecast_predictions: List of 24-hour predictions
    
    Returns:
        Dictionary with confidence metrics
    """
    
    if len(latest_df) < 10:
        # Not enough data for confidence calculation
        return {
            'confidence_level': "LOW",
            'confidence_score': 60.0,
            'reasoning': "Limited historical data available for validation"
        }
    
    # Calculate variability in recent data
    recent_loads = latest_df['total_load'].tail(20).values \
        if 'total_load' in latest_df.columns \
        else (latest_df['residential_load'] + latest_df['datacenter_load']).tail(20).values
    
    load_std = np.std(recent_loads)
    load_mean = np.mean(recent_loads)
    
    # Check if prediction is within reasonable bounds
    cv = load_std / load_mean if load_mean > 0 else 0  # Coefficient of variation
    
    # Prediction reasonableness check
    within_bounds = load_mean - (3 * load_std) <= baseline_prediction <= load_mean + (3 * load_std)
    
    # Calculate confidence
    if cv > 0.3 or not within_bounds:
        confidence_score = 70.0
        confidence_level = "MODERATE"
    elif cv > 0.15:
        confidence_score = 82.0
        confidence_level = "GOOD"
    else:
        confidence_score = 90.0
        confidence_level = "HIGH"
    
    return {
        'confidence_level': confidence_level,
        'confidence_score': round(confidence_score, 2),
        'reasoning': f"Load variability: {round(cv * 100, 1)}%. Recent patterns are {confidence_level.lower()}."
    }
