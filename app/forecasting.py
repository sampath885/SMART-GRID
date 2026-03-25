import pandas as pd
import numpy as np
from typing import List, Dict

def recursive_forecast_24h(
    model, 
    latest_data: Dict,
    feature_names: List[str],
    steps: int = 144  # 144 * 10 min = 1440 min (24 hours)
) -> List[float]:
    """
    Recursively forecast load for the next 24 hours.
    
    The model predicts T+10 min, then uses that prediction as context to predict T+20 min, etc.
    
    Args:
        model: Trained RandomForest model
        latest_data: Dictionary with latest values: {
            'Temperature': float,
            'Humidity': float,
            'hour': int,
            'day_of_week': int,
            'residential_lag': float,
            'datacenter_lag': float
        }
        feature_names: List of feature column names in correct order
        steps: Number of 10-min steps to forecast (default 144 = 24 hours)
    
    Returns:
        List of predictions for next 24 hours
    """
    
    predictions = []
    current_state = latest_data.copy()
    
    for step in range(steps):
        # Create feature vector in the correct order
        features = pd.DataFrame([[
            current_state.get('Temperature', 20),
            current_state.get('Humidity', 50),
            current_state.get('hour', 12),
            current_state.get('day_of_week', 0),
            current_state.get('residential_lag', 25000),  # Default to 25000 KW if missing
            current_state.get('datacenter_lag', 15000)    # Default to 15000 KW if missing
        ]], columns=feature_names)
        
        # Predict next 10-min interval
        next_prediction = model.predict(features)[0]
        predictions.append(next_prediction)
        
        # Update context for next iteration:
        # - Shift the lag features forward (now this prediction becomes the past)
        # - Update hour if 6 steps (60 min) have passed
        current_state['residential_lag'] = next_prediction
        
        # Update hour every 6 steps (60 minutes)
        if (step + 1) % 6 == 0:
            current_state['hour'] = (current_state['hour'] + 1) % 24
            # Update day_of_week if day changes
            if current_state['hour'] == 0:
                current_state['day_of_week'] = (current_state['day_of_week'] + 1) % 7
    
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
    
    # Assuming we shift from peak hours (roughly 8am-8pm) to off-peak (8pm-8am)
    # This is a simplified model - in production, you'd have more granular shift data
    
    adjusted = []
    for idx, pred in enumerate(original_predictions):
        # Every 10-min step represents a different hour in rough terms
        hour_index = (idx // 6) % 24  # Which hour of day (0-23)
        
        # Peak hours: 8am to 8pm (hours 8-20)
        if 8 <= hour_index <= 20:
            # Reduce load during peak
            adjusted_load = pred - (load_to_shift / 13)  # 13 peak hours
        else:
            # Increase slightly during off-peak (distributed more)
            adjusted_load = pred + (load_to_shift / 11)  # 11 off-peak hours
        
        adjusted.append(max(adjusted_load, 0))  # Ensure no negative loads
    
    return adjusted


def calculate_grid_stress(loads: List[float], capacity: float = 100000) -> Dict:
    """
    Calculate grid stress metrics from load predictions.
    
    Args:
        loads: List of predicted loads (KW)
        capacity: Grid capacity (default 100,000 KW)
    
    Returns:
        Dictionary with stress metrics
    """
    
    max_load = max(loads)
    avg_load = np.mean(loads)
    min_load = min(loads)
    
    stress_percentage = (max_load / capacity) * 100
    
    # Determine status
    if stress_percentage > 95:
        status = "CRITICAL STRESS"
    elif stress_percentage > 80:
        status = "HIGH STRESS"
    elif stress_percentage > 60:
        status = "MODERATE STRESS"
    else:
        status = "SAFE"
    
    return {
        'max_load': round(max_load, 2),
        'avg_load': round(avg_load, 2),
        'min_load': round(min_load, 2),
        'stress_percentage': round(stress_percentage, 2),
        'status': status
    }
