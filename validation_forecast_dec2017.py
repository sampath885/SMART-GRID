"""
SEPARATE VALIDATION SCRIPT - NOT CONNECTED TO MAIN SETUP
==========================================================
This script trains a model on 11 months (Jan-Nov 2017) of data
and predicts the entire December 2017, showing:
- Predicted residential load
- Predicted datacenter load  
- Predicted industrial load
- Actual values for comparison

Results saved to: validation_predictions_dec2017.csv
This file can be deleted after review.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import warnings
warnings.filterwarnings('ignore')

# Load the data
print("Loading CSV data...")
df = pd.read_csv('data/processed_electricity_data.csv')
df['Datetime'] = pd.to_datetime(df['Datetime'])

# Split into 11 months training (Jan-Nov) and 1 month testing (Dec)
print("\nSplitting data...")
train_df = df[df['Datetime'].dt.month < 12].copy()
test_df = df[df['Datetime'].dt.month == 12].copy()

print(f"Training data: {len(train_df)} rows (Jan-Nov 2017)")
print(f"Testing data: {len(test_df)} rows (Dec 2017)")

# Feature engineering (SAME AS CURRENT MODEL)
def engineer_features(data):
    """Apply the same feature engineering as main model"""
    data['hour'] = data['Datetime'].dt.hour
    data['day_of_week'] = data['Datetime'].dt.dayofweek
    data['month'] = data['Datetime'].dt.month
    data['day_of_month'] = data['Datetime'].dt.day
    
    # Cyclical encoding
    data['hour_sin'] = np.sin(2 * np.pi * data['hour'] / 24)
    data['hour_cos'] = np.cos(2 * np.pi * data['hour'] / 24)
    
    # Lag features (1-hour and 2-hour lags)
    data['residential_lag_1h'] = data['residential_load'].shift(6)  # 6 * 10min = 1 hour
    data['residential_lag_2h'] = data['residential_load'].shift(12)  # 12 * 10min = 2 hours
    data['datacenter_lag_1h'] = data['datacenter_load'].shift(6)
    data['datacenter_lag_2h'] = data['datacenter_load'].shift(12)
    data['industrial_lag_1h'] = data['industrial_load'].shift(6)
    
    # Rolling averages (3-hour windows)
    data['temp_rolling_3h'] = data['Temperature'].rolling(window=18, min_periods=1).mean()
    data['humidity_rolling_3h'] = data['Humidity'].rolling(window=18, min_periods=1).mean()
    
    return data

# Apply feature engineering to training data
train_df = engineer_features(train_df)
train_df = train_df.dropna()

print(f"\nAfter feature engineering: {len(train_df)} rows (removed NaN)")

# Prepare training features
feature_names = [
    'Temperature', 'Humidity', 'hour', 'day_of_week', 'month', 'day_of_month',
    'hour_sin', 'hour_cos',
    'residential_lag_1h', 'residential_lag_2h',
    'datacenter_lag_1h', 'datacenter_lag_2h',
    'industrial_lag_1h',
    'temp_rolling_3h', 'humidity_rolling_3h'
]

X_train = train_df[feature_names]
y_train = train_df['residential_load'] + train_df['datacenter_load'] + train_df['industrial_load']

print(f"\nTraining RandomForest model with {len(feature_names)} features...")
print(f"Training samples: {len(X_train)}")
print(f"Target: Total load (residential + datacenter + industrial)")

# Train model (SAME HYPERPARAMETERS as current model)
model = RandomForestRegressor(
    n_estimators=100,
    max_depth=20,
    min_samples_split=10,
    min_samples_leaf=5,
    n_jobs=-1,
    random_state=42
)

model.fit(X_train, y_train)
print("✓ Model trained successfully!")

# Now predict on December 2017
print(f"\nPredicting December 2017 ({len(test_df)} 10-minute intervals)...")

# Apply feature engineering to test data
test_df = engineer_features(test_df)

# Make predictions
X_test = test_df[feature_names]
test_df['predicted_total_load'] = model.predict(X_test)

# Decompose total prediction back into individual components
# Calculate proportions from training data
train_residential_pct = train_df['residential_load'].sum() / (
    train_df['residential_load'].sum() + 
    train_df['datacenter_load'].sum() + 
    train_df['industrial_load'].sum()
)
train_datacenter_pct = train_df['datacenter_load'].sum() / (
    train_df['residential_load'].sum() + 
    train_df['datacenter_load'].sum() + 
    train_df['industrial_load'].sum()
)
train_industrial_pct = train_df['industrial_load'].sum() / (
    train_df['residential_load'].sum() + 
    train_df['datacenter_load'].sum() + 
    train_df['industrial_load'].sum()
)

print(f"\nLoad proportions (from training data):")
print(f"  Residential: {train_residential_pct:.2%}")
print(f"  Datacenter:  {train_datacenter_pct:.2%}")
print(f"  Industrial:  {train_industrial_pct:.2%}")

# Decompose predictions
test_df['predicted_residential'] = test_df['predicted_total_load'] * train_residential_pct
test_df['predicted_datacenter'] = test_df['predicted_total_load'] * train_datacenter_pct
test_df['predicted_industrial'] = test_df['predicted_total_load'] * train_industrial_pct

# Calculate errors
test_df['error_residential'] = test_df['predicted_residential'] - test_df['residential_load']
test_df['error_datacenter'] = test_df['predicted_datacenter'] - test_df['datacenter_load']
test_df['error_industrial'] = test_df['predicted_industrial'] - test_df['industrial_load']

# Create output CSV
output_df = test_df[[
    'Datetime',
    'predicted_residential', 'residential_load', 'error_residential',
    'predicted_datacenter', 'datacenter_load', 'error_datacenter',
    'predicted_industrial', 'industrial_load', 'error_industrial',
    'predicted_total_load'
]].copy()

output_df.columns = [
    'Datetime',
    'Pred_Residential_KW', 'Actual_Residential_KW', 'Error_Residential_KW',
    'Pred_Datacenter_KW', 'Actual_Datacenter_KW', 'Error_Datacenter_KW',
    'Pred_Industrial_KW', 'Actual_Industrial_KW', 'Error_Industrial_KW',
    'Pred_Total_KW'
]

# Save to CSV
output_csv = 'validation_predictions_dec2017.csv'
output_df.to_csv(output_csv, index=False)
print(f"\n✓ Predictions saved to: {output_csv}")
print(f"  Total rows: {len(output_df)}")

# Calculate metrics
mae_total = np.mean(np.abs(test_df['error_residential'] + test_df['error_datacenter'] + test_df['error_industrial']))
mape_total = np.mean(np.abs((test_df['error_residential'] + test_df['error_datacenter'] + test_df['error_industrial']) / (test_df['residential_load'] + test_df['datacenter_load'] + test_df['industrial_load']))) * 100
rmse_total = np.sqrt(np.mean((test_df['error_residential'] + test_df['error_datacenter'] + test_df['error_industrial'])**2))

print("\n" + "="*60)
print("VALIDATION METRICS (December 2017)")
print("="*60)
print(f"MAE (Mean Absolute Error):  {mae_total:.2f} KW")
print(f"MAPE (Mean Absolute % Error): {mape_total:.2f}%")
print(f"RMSE (Root Mean Squared Error): {rmse_total:.2f} KW")
print("="*60)

print("\nSample predictions (first 6 rows of December 2017):")
print(output_df.head(6).to_string())

print("\n✓ Done! Open validation_predictions_dec2017.csv to see all predictions.")
print("  You can compare predicted vs actual values for every 10-minute interval.")
