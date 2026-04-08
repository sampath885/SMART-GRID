"""
DEBUG: Check if the peak value in the forecast matches the data
"""

import requests
import json

# Call the API endpoint
response = requests.get("http://127.0.0.1:8000/forecast-24h")
data = response.json()

predictions_10m = data["all_predictions_10m"]
hourly_summary = data["hourly_summary"]
stress_metrics = data["stress_metrics"]

print("="*70)
print("FORECAST DATA INTEGRITY CHECK")
print("="*70)

# Find actual max in predictions
actual_max = max(predictions_10m)
actual_max_idx = predictions_10m.index(actual_max)
actual_hour = actual_max_idx // 6
actual_10min = actual_max_idx % 6

print(f"\nPeak Load (from stress_metrics): {stress_metrics['max_load']} KW")
print(f"Actual max in 144 predictions:  {actual_max} KW")
print(f"Location: Hour {actual_hour}, 10-min interval {actual_10min} (index {actual_max_idx})")
print(f"Match? {stress_metrics['max_load'] == actual_max}")

print(f"\n--- Hour {actual_hour} breakdown (6 x 10-min values) ---")
start_idx = actual_hour * 6
end_idx = start_idx + 6
hour_values = predictions_10m[start_idx:end_idx]
print(f"10-min predictions: {hour_values}")
print(f"Average: {sum(hour_values)/len(hour_values):.2f}")
print(f"Hourly summary shows: {hourly_summary[actual_hour]}")
print(f"Max in this hour: {max(hour_values)}")

print(f"\n--- All 24-hour predictions (max per hour) ---")
for h in range(24):
    start = h * 6
    end = start + 6
    hour_vals = predictions_10m[start:end]
    hour_max = max(hour_vals)
    hour_avg = sum(hour_vals) / len(hour_vals)
    print(f"Hour {h:2d}: Max={hour_max:8.2f}, Avg={hour_avg:8.2f}, Summary shows={hourly_summary[h]:8.2f}")

print(f"\n--- Stress Metrics ---")
print(f"Max Load: {stress_metrics['max_load']}")
print(f"Avg Load: {stress_metrics['avg_load']}")
print(f"Peak Stress: {stress_metrics['peak_stress']}%")
print(f"Avg Stress: {stress_metrics['avg_stress']}%")
print(f"Combined Stress: {stress_metrics['combined_stress']}%")

print("\n" + "="*70)
