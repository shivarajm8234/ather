import json
import os

FEEDBACK_FILE = "/home/satoru/Desktop/ather/feedback.json"

def clean_feedback():
    if not os.path.exists(FEEDBACK_FILE):
        return
        
    with open(FEEDBACK_FILE, "r") as f:
        data = json.load(f)
        
    cleaned = []
    for f in data:
        # Add default values for missing fields
        if "rating" not in f:
            f["rating"] = 5 if f.get("sentiment") == "Positive" else (1 if f.get("sentiment") == "Negative" else 3)
        if "summary" not in f:
            f["summary"] = f.get("comment", f.get("feedback", "No summary available"))
        if "comment" not in f and "feedback" in f:
            f["comment"] = f["feedback"]
        if "churn_risk" not in f:
            f["churn_risk"] = "Low"
        if "status" not in f:
            f["status"] = "Verified"
        if "source" not in f:
            f["source"] = "Voice AI"
        cleaned.append(f)
        
    with open(FEEDBACK_FILE, "w") as f:
        json.dump(cleaned, f, indent=4)
        
    print(f"Cleaned {len(cleaned)} feedback entries.")

if __name__ == "__main__":
    clean_feedback()
