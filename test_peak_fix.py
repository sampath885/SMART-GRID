"""
Test: Verify peak load matches the hourly breakdown
"""

import requests
import json
import time

# Wait for backend to be ready
time.sleep(2)

# First, we need to upload some data to initialize the system
print("Testing after backend restart...\n")

try:
    # Try to get forecast
    response = requests.get("http://127.0.0.1:8000/forecast-24h", timeout=10)
    if response.status_code == 200:
        data = response.json()
        print("✓ Forecast endpoint working\n")
        
        if "all_predictions_10m" in data and "stress_metrics" in data:
            predictions = data["all_predictions_10m"]
            hourly_summary = data["hourly_summary"]
            stress = data["stress_metrics"]
            
            peak_from_metrics = stress['max_load']
            max_from_predictions = max(predictions)
            max_hourly = max(hourly_summary)
            
            print(f"Peak Load (from stress_metrics): {peak_from_metrics} KW")
            print(f"Max in 144 predictions:         {max_from_predictions} KW")
            print(f"Max hourly average:              {max_hourly} KW")
            print(f"\n✓ Peak matches max predictions? {peak_from_metrics == max_from_predictions}")
            
            # Find which hour has the peak
            for i, val in enumerate(predictions):
                if val == max_from_predictions:
                    hour_num = i // 6
                    minute_marker = (i % 6) * 10
                    print(f"Peak found at: Hour {hour_num}, interval {minute_marker} min (index {i})")
                    print(f"Hour {hour_num} average shown: {hourly_summary[hour_num]} KW")
                    break
                    
        else:
            print("Error: Response keys missing")
            print(json.dumps(data, indent=2))
    else:
        print(f"API returned {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"Error: {e}")
    print("Backend may not be ready yet or data not loaded.")
