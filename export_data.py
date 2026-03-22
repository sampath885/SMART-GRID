import pandas as pd
from app.data_loader import load_and_clean_data

# 1. Run the logic we wrote in Week 2
print("Processing data...")
df, threshold = load_and_clean_data("powerconsumption.csv")

# 2. Save this "Processed" version to a NEW file
# This will include 'is_peak' and all 'norm' columns
df.to_csv("data/processed_electricity_data.csv", index=False)

print("--- SUCCESS ---")
print("New file created: data/processed_electricity_data.csv")
print("This file contains the normalized columns and peak flags.")