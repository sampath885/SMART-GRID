import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import joblib # Used to save the "Brain" to a file
import numpy as np
import os

def train_electricity_model(csv_path):
    # 1. Load the cleaned data
    df = pd.read_csv(csv_path)
    df['Datetime'] = pd.to_datetime(df['Datetime'])

    # 2. FEATURE ENGINEERING (Teaching the AI what to look at)
    # We extract the Hour and Day because patterns change based on time
    df['hour'] = df['Datetime'].dt.hour
    df['day_of_week'] = df['Datetime'].dt.dayofweek
    
    # LAG FEATURES: We tell the AI: "Look at the load from 1 hour ago"
    # This is how the AI gets 'memory'.
    df['residential_lag'] = df['residential_load'].shift(6) # 6 steps = 60 mins
    df['datacenter_lag'] = df['datacenter_load'].shift(6)
    
    # Drop the first few rows because they won't have 'lag' data
    df = df.dropna()

    # 3. SELECTING INPUTS AND OUTPUTS
    # X = Features (The hints), y = Target (What we want to predict)
    X = df[['Temperature', 'Humidity', 'hour', 'day_of_week', 'residential_lag', 'datacenter_lag']]
    y = df['residential_load'] # We are predicting the Residential Load first

    # 4. TRAIN/TEST SPLIT
    # 80% for study, 20% for the 'final exam'
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 5. THE ALGORITHM: RANDOM FOREST
    # n_estimators=100 means 100 decision trees are voting.
    print("Training the AI Brain (Random Forest)...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # 6. EVALUATION (The Grade)
    predictions = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    print(f"Model Training Complete. RMSE (Error): {round(rmse, 2)} KW")

    # 7. SAVE THE BRAIN
    # We save the model as a .pkl file so we don't have to train it every time.
    if not os.path.exists('models'): os.mkdir('models')
    joblib.dump(model, 'models/electricity_model.pkl')
    joblib.dump(X.columns.tolist(), 'models/feature_names.pkl') # Save column names
    
    return rmse

if __name__ == "__main__":
    # You run this manually once to create the brain
    train_electricity_model("data/processed_electricity_data.csv")