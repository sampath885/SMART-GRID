import pandas as pd
import numpy as np
import os

def load_and_clean_data(file_name):
    # Path to where we moved our data
    file_path = os.path.join("data", file_name)
    
    # 1. Load Dataset
    df = pd.read_csv(file_path)

    df['Datetime'] = pd.to_datetime(df['Datetime'])
    
    # Fill missing values using linear interpolation 
    df = df.interpolate(method='linear')

    # 3. Rename for Indian Context (Mapping Zones)
    # Zone 1 = Residential, Zone 2 = Data Centers, Zone 3 = Industrial
    df = df.rename(columns={
        'PowerConsumption_Zone1': 'residential_load',
        'PowerConsumption_Zone2': 'datacenter_load',
        'PowerConsumption_Zone3': 'industrial_load'
    })

    # 4. Normalization 
    # Scale load between 0 and 1 so we can compare zones of different sizes
    for col in ['residential_load', 'datacenter_load', 'industrial_load']:
        df[f'{col}_norm'] = (df[col] - df[col].min()) / (df[col].max() - df[col].min())

    # 5. Peak Identification
    # Define 'Peak' as the top 10% of consumption
    threshold = df['residential_load'].quantile(0.90)
    df['is_peak'] = df['residential_load'] > threshold

    return df, threshold