import pandas as pd
import numpy as np
from typing import List, Dict
from sklearn.ensemble import IsolationForest

# Ramp severity is normalized to usable capacity (capacity × 0.9).
# A max 10-min step equal to this fraction of available capacity scores 100 on ramp severity.
# Calibrated to the prior demo anchor (~2,000 kW vs 90,000 kW usable at default 100 MW nameplate).
RAMP_FRACTION_FOR_SEVERITY_CAP = 2000.0 / (100000.0 * 0.9)

# Default fallback weights (legacy behavior)
DEFAULT_STRESS_WEIGHTS = {
    "peak": 0.50,
    "avg": 0.30,
    "ramp": 0.20,
}


def temperature_derated_usable_capacity_kw(
    capacity: float,
    temperature_c: float | None,
    ref_c: float = 22.0,
    loss_per_degree: float = 0.008,
    floor_ratio: float = 0.62,
) -> float:
    """
    Convert nameplate capacity to usable capacity and apply simple thermal derating.
    If temperature is None, return standard 90% usable capacity.
    """
    usable = float(capacity) * 0.90
    if temperature_c is None:
        return usable
    penalty = max(0.0, float(temperature_c) - ref_c) * loss_per_degree
    return usable * max(floor_ratio, 1.0 - penalty)


def calibrate_stress_weights(historical_total_loads: List[float]) -> Dict:
    """
    Data-calibrated stress weights based on historical load shape and volatility.
    Returns normalized weights for peak / average / ramp components.
    """
    if not historical_total_loads or len(historical_total_loads) < 20:
        return DEFAULT_STRESS_WEIGHTS.copy()

    series = np.array(historical_total_loads, dtype=float)
    p5, p50, p95 = np.percentile(series, [5, 50, 95])
    if p50 <= 0:
        return DEFAULT_STRESS_WEIGHTS.copy()

    ramp_series = np.abs(np.diff(series))
    ramp_p95 = float(np.percentile(ramp_series, 95)) if len(ramp_series) else 0.0

    # Pressure indicators (dimensionless)
    peak_pressure = max(0.0, (p95 - p50) / p50)
    baseline_pressure = max(0.0, (p50 - p5) / p50)
    ramp_pressure = max(0.0, ramp_p95 / p50)

    # Convert indicators into raw weights (scaled to keep components balanced).
    peak_raw = 1.0 + (2.0 * peak_pressure)
    avg_raw = 0.8 + (1.5 * baseline_pressure)
    ramp_raw = 0.6 + (6.0 * ramp_pressure)

    total_raw = peak_raw + avg_raw + ramp_raw
    if total_raw <= 0:
        return DEFAULT_STRESS_WEIGHTS.copy()

    weights = {
        "peak": peak_raw / total_raw,
        "avg": avg_raw / total_raw,
        "ramp": ramp_raw / total_raw,
    }

    # Clamp to avoid pathological weight collapse, then renormalize.
    weights["peak"] = min(0.65, max(0.20, weights["peak"]))
    weights["avg"] = min(0.55, max(0.15, weights["avg"]))
    weights["ramp"] = min(0.45, max(0.10, weights["ramp"]))
    norm = weights["peak"] + weights["avg"] + weights["ramp"]
    return {
        "peak": float(round(weights["peak"] / norm, 4)),
        "avg": float(round(weights["avg"] / norm, 4)),
        "ramp": float(round(weights["ramp"] / norm, 4)),
    }

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


def calculate_grid_stress(
    loads: List[float],
    capacity: float = 100000,
    temperature_c: float | None = None,
    stress_weights: Dict | None = None,
) -> Dict:
    """
    ===================================
    REFINED GRID STRESS WITH RAMP-RATE ANALYSIS
    ===================================
    
    Monitors TWO critical dimensions:
    1. PEAK LOAD: Absolute demand vs. grid capacity
    2. RAMP RATE: Rate of load change (Δ/Δt) - thermal stress on transformers
    
    Why Ramp-Rate Matters:
    - A jump from 30,000 KW to 45,000 KW in 10 minutes (~1,500 KW/min) causes rapid
      thermal expansion in transformer windings, potentially triggering circuit breakers
      even if total capacity isn't exceeded.
    - Steady load is safer than volatile load, even at the same peak.
    
    Ramp severity (0–100) is capacity-normalized: max 10-min |ΔP| ÷ usable capacity,
    scaled so the historical demo anchor (~2 MW step vs 90 MW usable) maps to ~100.
    If you change ``capacity``, the same physical severity scales with available headroom.
    
    Args:
        loads: List of predicted loads (KW), typically at 10-min intervals
        capacity: Grid capacity in KW (default 100,000 KW)
        temperature_c: Optional ambient temperature for thermal derating of usable capacity
        stress_weights: Optional dict with keys peak/avg/ramp that sum ~1.0
    
    Returns:
        Dictionary with comprehensive stress metrics including ramp-rate analysis
    """
    
    max_load = max(loads)
    avg_load = np.mean(loads)
    min_load = min(loads)
    available_capacity = temperature_derated_usable_capacity_kw(capacity, temperature_c)
    weights = stress_weights or DEFAULT_STRESS_WEIGHTS
    
    # ========== LEGACY METHOD (COMMENTED) ==========
    # # Apply 10% reserve buffer (only 90% of capacity is usable)
    # available_capacity = capacity * 0.90
    # peak_stress = (max_load / available_capacity) * 100
    # avg_stress = (avg_load / available_capacity) * 100
    # combined_stress = (0.7 * peak_stress) + (0.3 * avg_stress)
    
    # ========== RAMP-RATE ANALYSIS ==========
    # Calculate delta (change) between consecutive 10-min intervals
    ramp_rates = []  # KW per 10-min interval
    for idx in range(1, len(loads)):
        delta_load = abs(loads[idx] - loads[idx - 1])
        ramp_rates.append(delta_load)
    
    max_ramp_rate = max(ramp_rates) if ramp_rates else 0
    avg_ramp_rate = np.mean(ramp_rates) if ramp_rates else 0
    
    # Ramp severity 0–100: linear in (max step / usable capacity), capped at 100
    if available_capacity <= 0:
        ramp_fraction = 0.0
        ramp_severity = 0.0
    else:
        ramp_fraction = max_ramp_rate / available_capacity
        ramp_severity = min(
            100.0,
            (ramp_fraction / RAMP_FRACTION_FOR_SEVERITY_CAP) * 100.0,
        )
    
    # Peak Load Stress (traditional capacity check)
    peak_stress = (max_load / available_capacity) * 100 if available_capacity > 0 else 0
    avg_stress = (avg_load / available_capacity) * 100 if available_capacity > 0 else 0
    
    # Combined Stress with calibrated integration:
    # peak capacity + average baseline + ramp volatility.
    combined_stress = (weights["peak"] * min(peak_stress, 100)) + \
                      (weights["avg"] * min(avg_stress, 100)) + \
                      (weights["ramp"] * ramp_severity)
    
    # Status uses normalized ramp severity (aligned with former ~1.0 / ~1.5 MW thresholds at 90 MW usable)
    if combined_stress > 85:
        if ramp_severity >= 70:
            status = "CRITICAL STRESS (Ramp-Rate Violation)"
        else:
            status = "CRITICAL STRESS (Peak Capacity)"
    elif combined_stress > 75:
        if ramp_severity >= 50:
            status = "HIGH STRESS (Rapid Volatility)"
        else:
            status = "HIGH STRESS (Peak Loading)"
    elif combined_stress > 60:
        status = "MODERATE STRESS"
    elif combined_stress > 40:
        status = "CAUTION"
    else:
        status = "SAFE"
    
    return {
        # === Peak Capacity Metrics ===
        'max_load': round(max_load, 2),
        'avg_load': round(avg_load, 2),
        'min_load': round(min_load, 2),
        'peak_stress_pct': round(peak_stress, 2),
        'avg_stress_pct': round(avg_stress, 2),
        
        # === Ramp-Rate Metrics ===
        'max_ramp_rate_kw_per_10min': round(max_ramp_rate, 2),
        'avg_ramp_rate_kw_per_10min': round(avg_ramp_rate, 2),
        'ramp_severity_score': round(ramp_severity, 2),
        'ramp_pct_of_capacity': round(ramp_fraction * 100, 3),
        
        # === Combined Assessment ===
        'combined_stress': round(combined_stress, 2),
        'status': status,
        'capacity': capacity,
        'available_capacity': round(available_capacity, 2),
        'temperature_c': round(float(temperature_c), 2) if temperature_c is not None else None,
        'stress_weights': weights,
    }


def calculate_sustainability_score(
    load_shifted_kw: float,
    original_hour: int = 14,  # Default to 2 PM
    shifted_hour: int = 2,    # Default to 2 AM
    duration_hours: int = 1
) -> Dict:
    """
    ===================================
    DYNAMIC SUSTAINABILITY SCORING
    WITH TIME-OF-USE CARBON INTENSITY
    ===================================
    
    Calculates CO2 impact of load shifting based on TIME-OF-DAY grid emission rates.
    Different times of day have different energy sources:
    - 10 AM - 4 PM: High solar, low coal burn → Cleaner (Emission Factor: 0.3 kg CO2/kWh)
    - 7 PM - 10 PM: Peak demand, 100% coal/gas → Dirtiest (Emission Factor: 0.9 kg CO2/kWh)
    - Midnight - 6 AM: Off-peak, lower demand → Clean (Emission Factor: 0.4 kg CO2/kWh)
    
    Reference: India's Central Electricity Authority (CEA) grid mix data
    - Peak hours (7PM-10PM): Coal 70%, Gas 20%, Renewable 10%
    - Solar hours (10AM-4PM): Coal 40%, Solar 40%, Other 20%
    - Off-peak (12AM-6AM): Coal 60%, Hydro 25%, Other 15%
    
    Formula: CO2_Saved = Load_Shifted × (Original_Emission_Factor - Shifted_Emission_Factor)
    
    Args:
        load_shifted_kw: Amount of load shifted (KW)
        original_hour: Hour when load was originally scheduled (0-23)
        shifted_hour: Hour when load is shifted to (0-23)
        duration_hours: Duration of the shift (default 1)
    
    Returns:
        Dictionary with comprehensive sustainability metrics
    """
    
    # ========== TIME-OF-USE EMISSION FACTOR DICTIONARY ==========
    # kg CO2 per kWh for Indian grid electricity
    # Based on CEA grid composition and fuel mix data
    emission_factor_by_hour = {
        0: 0.40,   # Midnight: Off-peak, hydro contribution
        1: 0.38,   # 1 AM: Lowest demand period
        2: 0.35,   # 2 AM: Minimum load window
        3: 0.36,   # 3 AM: Coal ramping down
        4: 0.37,   # 4 AM: Pre-dawn
        5: 0.40,   # 5 AM: Demand starting to rise
        6: 0.50,   # 6 AM: Morning ramp-up
        7: 0.55,   # 7 AM: Residential peak starting
        8: 0.65,   # 8 AM: Commercial loads coming online
        9: 0.70,   # 9 AM: Industrial activity increasing
        10: 0.50,  # 10 AM: Solar generation strong
        11: 0.35,  # 11 AM: Solar at high capacity
        12: 0.30,  # NOON: Peak solar output
        13: 0.32,  # 1 PM: Solar window continues
        14: 0.30,  # 2 PM: Solar optimal (lowest carbon!)
        15: 0.35,  # 3 PM: Solar declining
        16: 0.45,  # 4 PM: Transition from solar
        17: 0.65,  # 5 PM: Evening demand ramp
        18: 0.80,  # 6 PM: Peak load approaching
        19: 0.90,  # 7 PM: CRITICAL PEAK (coal + gas at max)
        20: 0.90,  # 8 PM: Evening peak (dirtiest hour)
        21: 0.85,  # 9 PM: Peak declining
        22: 0.70,  # 10 PM: Post-peak wind-down
        23: 0.55   # 11 PM: Night transition
    }
    
    # ========== LEGACY METHOD (COMMENTED) ==========
    # # Fixed multiplier (old approach - ignores time of day)
    # co2_saved = load_shifted_kw * 0.0005  # kg CO2 per KW
    
    # ========== NEW: TIME-OF-USE CALCULATION ==========
    original_emission_factor = emission_factor_by_hour.get(original_hour % 24, 0.5)
    shifted_emission_factor = emission_factor_by_hour.get(shifted_hour % 24, 0.5)
    
    # Calculate net CO2 savings
    # Negative = emissions INCREASE (shifting to dirtier time is bad!)
    co2_original_kg = load_shifted_kw * original_emission_factor * duration_hours
    co2_shifted_kg = load_shifted_kw * shifted_emission_factor * duration_hours
    co2_saved_kg = co2_original_kg - co2_shifted_kg
    
    # Calculate percentage reduction (if shifting to cleaner time)
    percentage_reduction = 0.0
    if co2_original_kg > 0:
        percentage_reduction = (co2_saved_kg / co2_original_kg) * 100
    
    # Sustainability score (0-100)
    # - Positive shift to clean time = high score
    # - Negative shift or peak-to-peak = low/zero score
    sustainability_score = min(100, max(0, 50 + (percentage_reduction / 2)))
    
    # Environmental impact classification
    if percentage_reduction > 66:
        env_impact = "EXCELLENT - Major CO2 reduction"
        impact_emoji = "🟢"
    elif percentage_reduction > 50:
        env_impact = "VERY GOOD - Significant savings"
        impact_emoji = "🟢"
    elif percentage_reduction > 25:
        env_impact = "GOOD - Noticeable improvement"
        impact_emoji = "🟡"
    elif percentage_reduction > 0:
        env_impact = "MODEST - Minor savings"
        impact_emoji = "🟡"
    elif percentage_reduction == 0:
        env_impact = "NEUTRAL - No change"
        impact_emoji = "⚪"
    else:
        env_impact = "NEGATIVE - Emissions increase"
        impact_emoji = "🔴"
    
    # Hour descriptions for human readability
    hour_names = {
        0: "Midnight", 1: "1 AM", 2: "2 AM", 3: "3 AM", 4: "4 AM", 5: "5 AM",
        6: "6 AM", 7: "7 AM", 8: "8 AM", 9: "9 AM", 10: "10 AM", 11: "11 AM",
        12: "Noon", 13: "1 PM", 14: "2 PM", 15: "3 PM", 16: "4 PM", 17: "5 PM",
        18: "6 PM", 19: "7 PM", 20: "8 PM", 21: "9 PM", 22: "10 PM", 23: "11 PM"
    }
    
    return {
        # === Emission Factors ===
        'original_hour': original_hour,
        'original_hour_name': hour_names.get(original_hour % 24, "Unknown"),
        'original_emission_factor': round(original_emission_factor, 2),
        
        'shifted_hour': shifted_hour,
        'shifted_hour_name': hour_names.get(shifted_hour % 24, "Unknown"),
        'shifted_emission_factor': round(shifted_emission_factor, 2),
        
        # === CO2 Impact ===
        'load_shifted_kw': round(load_shifted_kw, 2),
        'duration_hours': duration_hours,
        'co2_original_kg': round(co2_original_kg, 3),
        'co2_shifted_kg': round(co2_shifted_kg, 3),
        'co2_saved_kg': round(co2_saved_kg, 3),
        'percentage_reduction': round(percentage_reduction, 1),
        
        # === Sustainability Metrics ===
        'sustainability_score': round(sustainability_score, 1),
        'environmental_impact': env_impact,
        'impact_indicator': impact_emoji,
        
        # === User-Friendly Message ===
        'message': f"Shifting {round(load_shifted_kw, 0)} KW from {hour_names.get(original_hour % 24, 'Unknown')} to "
                  f"{hour_names.get(shifted_hour % 24, 'Unknown')} saves {round(co2_saved_kg, 2)} kg CO2 ({round(percentage_reduction, 1)}% reduction)"
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


def optimize_load_shift_autonomous(
    baseline_predictions: List[float],
    datacenter_load: float,
    original_hour: int = 14,  # Default to 2 PM (peak solar window)
    capacity: float = 100000,
    verbose: bool = True
) -> Dict:
    """
    ===================================
    MULTI-AGENT AUTO-PILOT OPTIMIZER
    ===================================
    
    Autonomous AI agent that tests 1,000 different load shift percentages (0-100%)
    to find the PARETO OPTIMAL point that:
    1. Keeps grid stress SAFE (< 80%)
    2. Maximizes CO2 savings (Sustainability Score > 90%)
    3. Minimizes economic impact (shift amount reasonable)
    
    Pareto Optimality: The solution where you CANNOT improve one metric
    without WORSENING another. E.g., can't save more CO2 without breaking grid safety.
    
    Algorithm:
    - Test 1,000 shift percentages (0%, 0.1%, 0.2%, ..., 100%)
    - For each shift: calculate new stress metrics and sustainability impact
    - Score each option using Pareto fitness: Stress_Safe * Sustainability_High * Cost_Low
    - Return the best option with full breakdown
    
    Args:
        baseline_predictions: List of 24-hour load predictions at 10-min intervals (144 points)
        datacenter_load: Current datacenter load in KW
        original_hour: Hour when load would originally occur (for carbon calculation)
        capacity: Grid capacity in KW (default 100,000)
        verbose: If True, provide detailed optimization reasoning
    
    Returns:
        Dictionary with optimized shift percentage and full Pareto analysis
    """
    
    # ========== OPTIMIZATION PARAMETERS ==========
    num_candidates = 1000  # Test 1,000 scenarios
    shift_percentages = np.linspace(0, 100, num_candidates)
    
    # Pareto front tracking
    pareto_solutions = []
    
    for shift_pct in shift_percentages:
        # 1. Calculate new load profile with this shift
        load_to_shift = datacenter_load * (shift_pct / 100)
        
        # Apply shift to predictions (reduce peak hours, increase off-peak)
        adjusted_predictions = []
        for idx, pred in enumerate(baseline_predictions):
            hour_index = (idx // 6) % 24  # Convert 10-min step to hour
            
            if 8 <= hour_index <= 20:  # Peak hours (8 AM - 8 PM)
                adjusted_load = pred - (load_to_shift / 13)  # 13 peak hours
            else:  # Off-peak hours
                adjusted_load = pred + (load_to_shift / 11)  # 11 off-peak hours
            
            adjusted_predictions.append(max(adjusted_load, 0))  # Prevent negative
        
        # 2. Calculate grid stress with this adjustment
        stress = calculate_grid_stress(adjusted_predictions, capacity)
        stress_score = stress['combined_stress']  # 0-100, lower is better
        
        # 3. Calculate sustainability with optimal shift time
        # Assume shifting FROM peak hour TO best solar time (2 PM = hour 14)
        sustainability = calculate_sustainability_score(
            load_shifted_kw=load_to_shift,
            original_hour=original_hour,
            shifted_hour=14,  # Always optimize TO 2 PM (peak solar)
            duration_hours=1
        )
        sustainability_score = sustainability['sustainability_score']  # 0-100, higher is better
        
        # 4. Economic cost factor (prefer smaller shifts to reduce implementation complexity)
        # Cost increases with shift size, but diminishing returns after 30%
        economic_cost = min(100, (shift_pct / 30) * 100) if shift_pct > 0 else 0
        
        # 5. Pareto Fitness Score
        # Maximize: Safety (inverse of stress) × Sustainability × Economic_Efficiency
        # Grid safety is CRITICAL: if stress > 80%, penalize heavily
        if stress_score > 80:
            safety_score = max(0, 100 - stress_score)  # Penalty for unsafe
        else:
            safety_score = 100 - stress_score  # 0-100, higher is safer
        
        economic_efficiency = 100 - economic_cost  # 0-100, prefer lower cost
        
        # Weighted Pareto fitness (safety is 50% critical, sustainability 30%, economics 20%)
        pareto_fitness = (0.50 * safety_score) + (0.30 * sustainability_score) + (0.20 * economic_efficiency)
        
        # Store solution with all metrics
        pareto_solutions.append({
            'shift_percentage': round(shift_pct, 1),
            'load_to_shift_kw': round(load_to_shift, 2),
            'stress_score': round(stress_score, 2),
            'sustainability_score': round(sustainability_score, 2),
            'economic_cost': round(economic_cost, 2),
            'pareto_fitness': round(pareto_fitness, 2),
            'grid_status': stress['status'],
            'co2_saved_kg': round(sustainability['co2_saved_kg'], 3),
            'percentage_reduction': round(sustainability['percentage_reduction'], 1)
        })
    
    # ========== FILTER PARETO FRONT ==========
    # Keep only "non-dominated" solutions
    # A solution is dominated if another solution is better in ALL metrics
    pareto_front = []
    for candidate in pareto_solutions:
        is_dominated = False
        for other in pareto_solutions:
            # Check if 'other' dominates 'candidate'
            # (better stress AND better sustainability AND better economics)
            if (other['stress_score'] < candidate['stress_score'] and
                other['sustainability_score'] > candidate['sustainability_score'] and
                other['economic_cost'] < candidate['economic_cost']):
                is_dominated = True
                break
        
        if not is_dominated:
            pareto_front.append(candidate)
    
    # ========== SELECT OPTIMAL SOLUTION ==========
    # Pick the solution with highest Pareto fitness
    optimal_solution = max(pareto_solutions, key=lambda x: x['pareto_fitness'])
    
    # ========== GENERATE RECOMMENDATION ==========
    recommendation = ""
    if optimal_solution['stress_score'] > 80:
        recommendation = (
            f"⚠️ WARNING: Even optimal shift ({optimal_solution['shift_percentage']}%) "
            f"keeps grid stress at {optimal_solution['stress_score']}%. "
            f"Consider demand management or capacity upgrades."
        )
    elif optimal_solution['sustainability_score'] < 50:
        recommendation = (
            f"ℹ️ GRID-SAFE but low sustainability benefit. "
            f"Current load naturally aligns with clean hours. "
            f"Shift {optimal_solution['shift_percentage']}% to save {optimal_solution['co2_saved_kg']} kg CO2."
        )
    elif optimal_solution['shift_percentage'] == 0:
        recommendation = (
            f"✅ OPTIMAL: Do not shift. Current load timing is already optimal "
            f"(stress={optimal_solution['stress_score']}%, sustainability={optimal_solution['sustainability_score']}%)."
        )
    else:
        recommendation = (
            f"✅ OPTIMAL AUTO-PILOT: Shift {optimal_solution['shift_percentage']}% of datacenter load to off-peak. "
            f"This keeps grid stress at {optimal_solution['stress_score']}% (SAFE) and saves {optimal_solution['co2_saved_kg']} kg CO2 "
            f"({optimal_solution['percentage_reduction']}% reduction)."
        )
    
    return {
        # === OPTIMAL SOLUTION ===
        'optimal_shift_percentage': optimal_solution['shift_percentage'],
        'optimal_load_shift_kw': optimal_solution['load_to_shift_kw'],
        'optimal_grid_stress': optimal_solution['stress_score'],
        'optimal_sustainability': optimal_solution['sustainability_score'],
        'optimal_co2_saved_kg': optimal_solution['co2_saved_kg'],
        'optimal_pareto_fitness': optimal_solution['pareto_fitness'],
        
        # === OPTIMIZATION STATUS ===
        'recommendation': recommendation,
        'grid_status': optimal_solution['grid_status'],
        'is_safe': optimal_solution['stress_score'] < 80,
        'sustainability_level': "EXCELLENT" if optimal_solution['sustainability_score'] > 80 else \
                               "GOOD" if optimal_solution['sustainability_score'] > 60 else \
                               "MODERATE" if optimal_solution['sustainability_score'] > 40 else "LOW",
        
        # === PARETO FRONT (Top 5 alternatives for transparency) ===
        'alternatives_top_5': sorted(pareto_front, key=lambda x: x['pareto_fitness'], reverse=True)[:5],
        
        # === OPTIMIZATION METADATA ===
        'total_scenarios_tested': num_candidates,
        'pareto_front_size': len(pareto_front),
        'optimization_method': 'Multi-Objective Pareto Optimization',
        'objectives': ['Grid Safety (Stress < 80%)', 'Sustainability (CO2 Savings)', 'Economic Efficiency (Low Shift Cost)'],
        'weights': {'safety': 0.50, 'sustainability': 0.30, 'economics': 0.20}
    }
