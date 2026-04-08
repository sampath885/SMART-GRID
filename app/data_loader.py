import pandas as pd
import numpy as np
import os

def load_and_clean_data(file_name):
    file_path = os.path.join("data", file_name)
    
    df = pd.read_csv(file_path)

    df['Datetime'] = pd.to_datetime(df['Datetime'])
    
    df = df.interpolate(method='linear')

    df = df.rename(columns={
        'PowerConsumption_Zone1': 'residential_load',
        'PowerConsumption_Zone2': 'datacenter_load',
        'PowerConsumption_Zone3': 'industrial_load'
    })

    for col in ['residential_load', 'datacenter_load', 'industrial_load']:
        df[f'{col}_norm'] = (df[col] - df[col].min()) / (df[col].max() - df[col].min())

    threshold = df['residential_load'].quantile(0.90)
    df['is_peak'] = df['residential_load'] > threshold

    return df, threshold