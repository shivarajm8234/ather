#!/usr/bin/env python3
import json
from datetime import datetime

FEEDBACK_FILE = "/home/satoru/Desktop/ds/feedback.json"

def log_feedback(customer_name, vehicle_no, rating, comments):
    feedback = []
    if os.path.exists(FEEDBACK_FILE):
        with open(FEEDBACK_FILE, 'r') as f:
            feedback = json.load(f)
    
    entry = {
        "timestamp": datetime.now().isoformat(),
        "customer_name": customer_name,
        "vehicle_no": vehicle_no,
        "rating": rating,
        "comments": comments
    }
    feedback.append(entry)
    
    with open(FEEDBACK_FILE, 'w') as f:
        json.dump(feedback, f, indent=4)
    print(f"Feedback logged for {customer_name}")

if __name__ == "__main__":
    import os
    print("Post-service feedback collection module ready.")
