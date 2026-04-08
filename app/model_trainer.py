import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.preprocessing import StandardScaler
import joblib
import numpy as np
import os

def train_electricity_model(csv_path):
    df = pd.read_csv(csv_path)
    df['Datetime'] = pd.to_datetime(df['Datetime'])

    # TEMPORAL FEATURES
    df['hour'] = df['Datetime'].dt.hour
    df['day_of_week'] = df['Datetime'].dt.dayofweek
    df['month'] = df['Datetime'].dt.month
    df['day_of_month'] = df['Datetime'].dt.day
    
    # CYCLICAL ENCODING for hour (treats 23:00 close to 00:00)
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    
    # MORE LAG FEATURES (look back further)
    df['residential_lag_1h'] = df['residential_load'].shift(6)   # 1 hour back
    df['residential_lag_2h'] = df['residential_load'].shift(12)  # 2 hours back
    df['datacenter_lag_1h'] = df['datacenter_load'].shift(6)
    df['datacenter_lag_2h'] = df['datacenter_load'].shift(12)
    df['industrial_lag_1h'] = df['industrial_load'].shift(6)
    
    # ROLLING AVERAGES (capture trends)
    df['temp_rolling_3h'] = df['Temperature'].rolling(18).mean()
    df['humidity_rolling_3h'] = df['Humidity'].rolling(18).mean()
    
    df = df.dropna()

    # FEATURES for the model
    X = df[[
        'Temperature', 'Humidity', 'hour', 'day_of_week', 'month', 'day_of_month',
        'hour_sin', 'hour_cos',
        'residential_lag_1h', 'residential_lag_2h',
        'datacenter_lag_1h', 'datacenter_lag_2h', 'industrial_lag_1h',
        'temp_rolling_3h', 'humidity_rolling_3h'
    ]]
    
    # Predict TOTAL grid load (residential + datacenter + industrial)
    y = df['residential_load'] + df['datacenter_load'] + df['industrial_load']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # OPTIMIZED HYPERPARAMETERS
    print("Training the AI Brain (Optimized Random Forest)...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=20,           # Prevent overfitting
        min_samples_split=10,   # Require more samples to split
        min_samples_leaf=5,     # Require more samples in leaves
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # EVALUATION
    predictions = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    mae = mean_absolute_error(y_test, predictions)
    mape = np.mean(np.abs((y_test - predictions) / y_test)) * 100
    
    print(f"Model Training Complete!")
    print(f"  RMSE (Root Mean Squared Error): {round(rmse, 2)} KW")
    print(f"  MAE (Mean Absolute Error): {round(mae, 2)} KW")
    print(f"  MAPE (Mean Absolute Percentage Error): {round(mape, 2)}%")
    print(f"  Avg Load: {round(y_test.mean(), 2)} KW")
    print(f"  Error as % of Avg: {round((rmse / y_test.mean()) * 100, 2)}%")

    if not os.path.exists('models'): os.mkdir('models')
    joblib.dump(model, 'models/electricity_model.pkl')
    joblib.dump(X.columns.tolist(), 'models/feature_names.pkl')
    
    return rmse, mae, mape

if __name__ == "__main__":
    train_electricity_model("data/processed_electricity_data.csv")